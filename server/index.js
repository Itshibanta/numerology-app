// server/index.js
require("dotenv").config();

/* ===========================================
   CORE IMPORTS
=========================================== */
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const Stripe = require("stripe");

const { supabase, supabaseAdmin } = require("./supabase");
const {
  generateNumerologyTheme,
  generateNumerologySummary,
} = require("./numerologyLogic");

const {
  getPlanByKey,
  getPlanKeyByStripePriceId,
  getPlansPublic,
  assertPlansConfigured,
} = require("./plansCatalog");

/* ===========================================
   ENV / APP INIT
=========================================== */
const NODE_ENV = process.env.NODE_ENV || "development";
const PORT = process.env.PORT || 3001;

const FRONTEND_URL = process.env.FRONTEND_URL || "";
if (NODE_ENV === "production" && !FRONTEND_URL.startsWith("https://")) {
  throw new Error(
    `FRONTEND_URL invalid (must start with https://): ${FRONTEND_URL}`
  );
}

if (NODE_ENV === "production") {
  assertPlansConfigured();
}

const app = express();
app.set("trust proxy", 1);

console.log("BOOT index.js");
console.log("ENV:", NODE_ENV);
console.log("PORT:", PORT);
console.log("BOOT FILE:", __filename);
console.log("BOOT CWD:", process.cwd());
console.log("ROUTE REGISTERED: POST /auth/register");

/* ===========================================
   STRIPE INIT
=========================================== */
const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const stripe = stripeKey
  ? new Stripe(stripeKey, { apiVersion: "2024-06-20" })
  : null;

/* ===========================================
   HELPERS
=========================================== */
function getBearerToken(req) {
  const h = req.headers.authorization || "";
  if (!h.startsWith("Bearer ")) return null;
  return h.slice(7).trim();
}

async function requireAuth(req, res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: "AUTH_REQUIRED" });
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ error: "INVALID_TOKEN" });
    }

    req.user = {
      id: data.user.id,
      email: data.user.email,
    };

    next();
  } catch (e) {
    console.error("requireAuth error:", e);
    return res.status(401).json({ error: "INVALID_TOKEN" });
  }
}

async function ensureProfileExists(user) {
  const userId = user.id;

  const { data: existing, error } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  if (existing) return;

  const { error: insErr } = await supabaseAdmin.from("profiles").insert({
    id: userId,
    plan: "free",
    first_name: "",
    last_name: "",
  });

  if (insErr) throw insErr;
}


function getSubPriceId(subscription) {
  return subscription?.items?.data?.[0]?.price?.id || null;
}

/* ===========================================
   STRIPE WEBHOOK (RAW BODY FIRST)
=========================================== */
app.post(
  "/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    if (!stripe || !stripeWebhookSecret) {
      return res.status(500).send("Stripe not configured");
    }

    let event;
    try {
      const sig = req.headers["stripe-signature"];
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        stripeWebhookSecret
      );
    } catch (err) {
      console.error("Webhook signature error:", err.message);
      return res.status(400).send("Invalid signature");
    }

    try {
      /* checkout completed */
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;

        const userId =
          session.metadata?.supabase_user_id ||
          session.client_reference_id ||
          null;

        if (!userId) return res.json({ received: true });

        const subscriptionId = session.subscription;
        const customerId = session.customer;

        let planKey = null;
        let priceId = null;
        let periodEnd = null;

        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          priceId = getSubPriceId(sub);
          planKey = priceId
            ? getPlanKeyByStripePriceId(priceId)
            : null;
          periodEnd = sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null;
        }

        await supabaseAdmin
          .from("profiles")
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            ...(planKey ? { plan: planKey } : {}),
            ...(priceId ? { stripe_price_id: priceId } : {}),
            ...(periodEnd ? { current_period_end: periodEnd } : {}),
          })
          .eq("id", userId);
      }

      /* subscription updated */
      if (event.type === "customer.subscription.updated") {
        const sub = event.data.object;
        const priceId = getSubPriceId(sub);
        const planKey = priceId
          ? getPlanKeyByStripePriceId(priceId)
          : null;

        await supabaseAdmin
          .from("profiles")
          .update({
            ...(planKey ? { plan: planKey } : {}),
            ...(priceId ? { stripe_price_id: priceId } : {}),
            stripe_subscription_id: sub.id,
            subscription_status: sub.status,
            current_period_end: sub.current_period_end
              ? new Date(sub.current_period_end * 1000).toISOString()
              : null,
          })
          .eq("stripe_customer_id", sub.customer);
      }

      /* subscription deleted */
      if (event.type === "customer.subscription.deleted") {
        await supabaseAdmin
          .from("profiles")
          .update({
            plan: "free",
            stripe_subscription_id: null,
            stripe_price_id: null,
            subscription_status: "canceled",
            current_period_end: null,
          })
          .eq("stripe_customer_id", event.data.object.customer);
      }

      res.json({ received: true });
    } catch (e) {
      console.error("Webhook handler error:", e);
      res.status(500).json({ error: "WEBHOOK_FAILED" });
    }
  }
);

/* ===========================================
   STANDARD MIDDLEWARES
=========================================== */
app.use(helmet());
app.use(express.json({ limit: "100kb" }));

const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

allowedOrigins.push("http://localhost:5173");

app.use(
  cors({
    origin(origin, cb) {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("CORS_BLOCKED"));
    },
    credentials: true,
  })
);

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
  })
);

/* ===========================================
   ROUTES
=========================================== */
app.get("/__ping", (_, res) => res.json({ ok: true }));

app.get("/plans", (_, res) =>
  res.json({ success: true, plans: getPlansPublic() })
);

/* ===== Stripe Checkout (ROBUSTE + PROD SAFE) ===== */
app.post(
  "/stripe/create-checkout-session",
  requireAuth,
  async (req, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ error: "STRIPE_DISABLED" });
      }

      const { plan_key } = req.body || {};
      const plan = getPlanByKey(plan_key);

      if (!plan || plan.plan_key === "free") {
        return res.status(400).json({ error: "INVALID_PLAN" });
      }

      if (!plan.stripe_price_id) {
        return res.status(500).json({ error: "PLAN_NOT_CONFIGURED" });
      }

      const userId = req.user.id;

      // ✅ GARANTIT que le profil existe
      await ensureProfileExists({ id: userId });

      const { data: profile, error: pErr } = await supabaseAdmin
        .from("profiles")
        .select("stripe_customer_id")
        .eq("id", userId)
        .single();

      if (pErr || !profile) {
        console.error("PROFILE_NOT_FOUND at checkout", { userId, pErr });
        return res.status(500).json({ error: "PROFILE_NOT_FOUND" });
      }

      let customerId = profile.stripe_customer_id;

      // ✅ Création customer Stripe si absent
      if (!customerId) {
        const customer = await stripe.customers.create({
          metadata: { supabase_user_id: userId },
        });

        customerId = customer.id;

        const { error: upErr } = await supabaseAdmin
          .from("profiles")
          .update({ stripe_customer_id: customerId })
          .eq("id", userId);

        if (upErr) {
          console.error("PROFILE_UPDATE_FAILED", upErr);
          return res.status(500).json({ error: "PROFILE_UPDATE_FAILED" });
        }
      }

      // ✅ URL FRONT BLINDÉE (Stripe exige https)
      const frontendUrlRaw =
        process.env.FRONTEND_URL || "http://localhost:5173";

      const frontendUrl = frontendUrlRaw.startsWith("http")
        ? frontendUrlRaw
        : `https://${frontendUrlRaw}`;

      const successUrl = `${frontendUrl}/profile?checkout=success`;
      const cancelUrl = `${frontendUrl}/pricing?checkout=cancel`;

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          supabase_user_id: userId,
          plan_key: plan.plan_key,
        },
        client_reference_id: userId,
      });

      return res.json({ url: session.url });
    } catch (e) {
      console.error("CHECKOUT_FAILED", e);
      return res.status(500).json({ error: "CHECKOUT_FAILED" });
    }
  }
);

/* =========================
   AUTH - REGISTER
========================= */
app.post("/auth/register", async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body || {};

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: "MISSING_FIELDS" });
    }

    // Crée l'user (Admin API)
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { firstName, lastName },
    });

    if (error || !data?.user) {
      return res.status(400).json({ error: "REGISTER_FAILED", detail: error?.message });
    }

    // Garantit le profil + met à jour les noms
    await ensureProfileExists({ id: data.user.id, email });

    const { error: upErr } = await supabaseAdmin
      .from("profiles")
      .update({ first_name: firstName, last_name: lastName })
      .eq("id", data.user.id);

    if (upErr) {
      // pas bloquant pour le signup, mais loggable
      console.error("PROFILE_UPDATE_FAILED:", upErr);
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error("REGISTER error:", e);
    return res.status(500).json({ error: "INTERNAL" });
  }
});

/* =========================
   AUTH - LOGIN
========================= */
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "MISSING_FIELDS" });
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data?.user || !data?.session?.access_token) {
      return res.status(401).json({ error: "INVALID_CREDENTIALS" });
    }

    // profil requis
    await ensureProfileExists({ id: data.user.id, email: data.user.email });

    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("first_name, last_name, plan")
      .eq("id", data.user.id)
      .maybeSingle();

    if (pErr) console.error("PROFILE_READ_FAILED:", pErr);

    return res.json({
      ok: true,
      token: data.session.access_token,
      user: {
        firstName: profile?.first_name || "",
        lastName: profile?.last_name || "",
        email: data.user.email,
        plan: (profile?.plan || "free"),
      },
    });
  } catch (e) {
    console.error("LOGIN error:", e);
    return res.status(500).json({ error: "INTERNAL" });
  }
});

app.get("/__routes", (req, res) => { /*A SUPPRIMER APRES TEST : curl -s https://numerology-app-n8o2.onrender.com/__routes | head */
  const routes = (app._router?.stack || [])
    .filter((l) => l.route && l.route.path)
    .map((l) => ({
      path: l.route.path,
      methods: Object.keys(l.route.methods || {}).filter(Boolean),
    }));
  res.json({ count: routes.length, routes });
});

app.use((req, res) => {
  res.status(404).json({ error: "NOT_FOUND", path: req.path });
});


/* ===========================================
   START SERVER
=========================================== */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
