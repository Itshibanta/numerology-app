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

if (NODE_ENV === "production") {
  assertPlansConfigured();
}

const app = express();
app.set("trust proxy", 1);

console.log("BOOT index.js");
console.log("ENV:", NODE_ENV);
console.log("PORT:", PORT);

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
    email: user.email || null,
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

/* ===== Stripe Checkout (ROBUSTE) ===== */
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

      // 🔒 GARANTIE ABSOLUE que le profil existe
      await ensureProfileExists({
        id: userId,
        email: req.user.email,
      });

      // 🔒 SELECT SÉCURISÉ
      const { data: profile, error: pErr } = await supabaseAdmin
        .from("profiles")
        .select("stripe_customer_id")
        .eq("id", userId)
        .single();

      if (pErr || !profile) {
        console.error("PROFILE_NOT_FOUND at checkout", {
          userId,
          pErr,
        });
        return res.status(500).json({ error: "PROFILE_NOT_FOUND" });
      }

      let customerId = profile.stripe_customer_id;

      // 🧠 Création customer Stripe si absent
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: req.user.email || undefined,
          metadata: { supabase_user_id: userId },
        });

        customerId = customer.id;

        const { error: upErr } = await supabaseAdmin
          .from("profiles")
          .update({ stripe_customer_id: customerId })
          .eq("id", userId);

        if (upErr) {
          console.error("Failed to save stripe_customer_id", upErr);
          return res.status(500).json({ error: "PROFILE_UPDATE_FAILED" });
        }
      }

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
        success_url: `${process.env.FRONTEND_URL}/profile?checkout=success`,
        cancel_url: `${process.env.FRONTEND_URL}/pricing?checkout=cancel`,
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

/* ===========================================
   START SERVER
=========================================== */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
