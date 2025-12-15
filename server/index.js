// server/index.js
require("dotenv").config();

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

// Source de vérité serveur (mapping Stripe price -> plan_key)
const {
  getPlanByKey,
  getPlanKeyByStripePriceId,
  getPlansPublic,
  assertPlansConfigured,
} = require("./plansCatalog");

if (process.env.NODE_ENV === "production") {
  assertPlansConfigured();
}

const port = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || "development";

const app = express();
app.set("trust proxy", 1);
console.log("BOOT: app initialized");

async function ensureProfileExists(user) {
  const userId = user.id;

  const { data: existing, error: selErr } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (selErr) throw selErr;
  if (existing?.id) return;

  const patch = {
    id: userId,
    plan: "free",
    first_name: "",
    last_name: "",
  };

  const { error: insErr } = await supabaseAdmin.from("profiles").insert(patch);
  if (insErr) throw insErr;
}

/* ===========================================
   STRIPE (webhook MUST use raw body)
   IMPORTANT: this route must be declared BEFORE express.json()
=========================================== */
const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const stripe = stripeKey
  ? new Stripe(stripeKey, { apiVersion: "2024-06-20" })
  : null;

function getSubPriceId(subscription) {
  const item = subscription?.items?.data?.[0];
  return item?.price?.id || null;
}

console.log("BOOT: registering webhook route");
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
      event = stripe.webhooks.constructEvent(req.body, sig, stripeWebhookSecret);
    } catch (err) {
      console.error("Stripe webhook signature failed:", err?.message || err);
      return res
        .status(400)
        .send(`Webhook Error: ${err?.message || "invalid signature"}`);
    }

    try {
      // 1) checkout success -> attach customer/subscription and set plan
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;

        // On utilise metadata.supabase_user_id (robuste), sinon fallback
        const userId =
          session.metadata?.supabase_user_id ||
          session.client_reference_id ||
          session.metadata?.user_id ||
          null;

        const customerId = session.customer || null;
        const subscriptionId = session.subscription || null;

        let subscription = null;
        let priceId = null;
        let planKey = null;
        let currentPeriodEndISO = null;

        if (subscriptionId) {
          try {
            subscription = await stripe.subscriptions.retrieve(subscriptionId);
            priceId = getSubPriceId(subscription);
            planKey = priceId ? getPlanKeyByStripePriceId(priceId) : null;
            currentPeriodEndISO = subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000).toISOString()
              : null;
          } catch (e) {
            console.error("Stripe subscription retrieve failed:", e);
          }
        }

        if (userId && customerId) {
          const updatePayload = {
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId || null,
            // Garde ton champ actuel "plan" pour ne rien casser côté app
            ...(planKey ? { plan: planKey } : {}),
            // Recommandé (si colonnes existent, sinon Supabase ignore pas -> ça erreur)
            ...(priceId ? { stripe_price_id: priceId } : {}),
            ...(subscription?.status ? { subscription_status: subscription.status } : {}),
            ...(currentPeriodEndISO ? { current_period_end: currentPeriodEndISO } : {}),
          };

          const { error: upErr } = await supabaseAdmin
            .from("profiles")
            .update(updatePayload)
            .eq("id", userId);

          if (upErr) console.error("Webhook profile update failed:", upErr);
        }
      }

      // 2) subscription updated -> keep plan consistent (upgrade/downgrade/renew)
      if (event.type === "customer.subscription.updated") {
        const sub = event.data.object;
        const customerId = sub.customer;

        const priceId = getSubPriceId(sub);
        const planKey = priceId ? getPlanKeyByStripePriceId(priceId) : null;
        const currentPeriodEndISO = sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null;

        const updatePayload = {
          stripe_subscription_id: sub.id,
          ...(planKey ? { plan: planKey } : {}),
          ...(priceId ? { stripe_price_id: priceId } : {}),
          ...(sub.status ? { subscription_status: sub.status } : {}),
          ...(currentPeriodEndISO ? { current_period_end: currentPeriodEndISO } : {}),
        };

        const { error: upErr } = await supabaseAdmin
          .from("profiles")
          .update(updatePayload)
          .eq("stripe_customer_id", customerId);

        if (upErr) console.error("Webhook subscription.updated failed:", upErr);
      }

      // 3) subscription deleted -> back to free
      if (event.type === "customer.subscription.deleted") {
        const sub = event.data.object;
        const customerId = sub.customer;

        const updatePayload = {
          plan: "free",
          stripe_subscription_id: null,
          stripe_price_id: null,
          subscription_status: "canceled",
          current_period_end: null,
        };

        const { error: upErr } = await supabaseAdmin
          .from("profiles")
          .update(updatePayload)
          .eq("stripe_customer_id", customerId);

        if (upErr) console.error("Webhook downgrade failed:", upErr);
      }

      return res.json({ received: true });
    } catch (e) {
      console.error("Stripe webhook handler error:", e);
      return res.status(500).json({ error: "webhook handler failed" });
    }
  }
);

/* ===========================================
   MIDDLEWARES
=========================================== */
app.use(helmet());
app.use(express.json({ limit: "100kb" }));

/* ===========================================
   CORS (Netlify + localhost)
   Supports comma-separated env: CORS_ORIGIN="a,b,c"
=========================================== */
const envOrigins = String(process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const allowedOrigins = [...envOrigins, "http://localhost:5173"];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);

      console.error("CORS blocked:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

/* ===========================================
   LOGS
=========================================== */
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    console.log(
      `[REQ] ${req.method} ${req.url} -> ${res.statusCode} (${Date.now() - start}ms)`
    );
  });
  next();
});

/* ===========================================
   RATE LIMIT
=========================================== */
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

const generateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
});

/* ===========================================
   HEALTH / DEBUG
=========================================== */
app.get("/__ping", (req, res) => res.json({ ok: true }));

app.get("/__supabase", (req, res) => {
  const url = process.env.SUPABASE_URL || "";
  const projectRef = url.replace("https://", "").replace(".supabase.co", "");
  res.json({ ok: true, supabaseUrl: url, projectRef });
});

if (process.env.NODE_ENV !== "production") {
  app.get("/__whoami", (req, res) =>
    res.json({
      file: __filename,
      cwd: process.cwd(),
      port,
      env: NODE_ENV,
    })
  );
}

/* ===========================================
   AUTH HELPERS
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
      return res.status(401).json({ success: false, error: "missing token" });
    }

    const { data: userData, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !userData?.user) {
      return res.status(401).json({ success: false, error: "invalid token" });
    }

    req.user = { id: userData.user.id, email: userData.user.email };
    return next();
  } catch (e) {
    console.error("requireAuth error:", e);
    return res.status(401).json({ success: false, error: "invalid token" });
  }
}

/* ===========================================
   PLANS (catalog for front) - currently from DB (no breaking change)
=========================================== */
app.get("/plans", (req, res) => {
  try {
    return res.json({ success: true, plans: getPlansPublic() });
  } catch (e) {
    console.error("PLANS error:", e);
    return res.status(500).json({ success: false, error: "PLANS_FAILED" });
  }
});

/* ===========================================
   STRIPE - CREATE CHECKOUT SESSION (AUTH REQUIRED)
   Front calls this, then redirects to returned URL.
   Webhook updates plan. Front stays passive.
=========================================== */
/* ===========================================
   STRIPE - CREATE CHECKOUT SESSION (AUTH REQUIRED)
=========================================== */
app.post("/stripe/create-checkout-session", requireAuth, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ success: false, error: "STRIPE_DISABLED" });
    }

    const { plan_key } = req.body || {};
    const plan = getPlanByKey(plan_key);

    if (!plan || plan.plan_key === "free") {
      return res.status(400).json({ success: false, error: "INVALID_PLAN" });
    }

    if (!plan.stripe_price_id) {
      return res.status(500).json({ success: false, error: "PLAN_NOT_CONFIGURED" });
    }

    const userId = req.user.id;

    // 🔒 sécurité absolue
    await ensureProfileExists({ id: userId, email: req.user.email });

    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("id, email, stripe_customer_id")
      .eq("id", userId)
      .single();

    if (pErr || !profile) {
      return res.status(500).json({ success: false, error: "PROFILE_NOT_FOUND" });
    }

    let customerId = profile.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email || req.user.email || undefined,
        metadata: { supabase_user_id: userId },
      });

      customerId = customer.id;

      await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", userId);
    }

    const successUrl = `${process.env.FRONTEND_URL}/profile?checkout=success`;
    const cancelUrl = `${process.env.FRONTEND_URL}/pricing?checkout=cancel`;

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

    return res.json({ success: true, url: session.url });
  } catch (e) {
    console.error("create-checkout-session error:", e);
    return res.status(500).json({ success: false, error: "internal" });
  }
});

/* ===========================================
   AUTH - REGISTER
=========================================== */
app.post("/auth/register", async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ msg: "champs manquants" });
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { firstName, lastName },
    });

    if (error) return res.status(400).json({ msg: error.message });

    await supabaseAdmin
      .from("profiles")
      .update({ first_name: firstName, last_name: lastName })
      .eq("id", data.user.id);

    return res.json({ msg: "ok" });
  } catch (e) {
    console.error("REGISTER error:", e);
    return res.status(500).json({ msg: "Erreur interne serveur" });
  }
});

/* ===========================================
   AUTH - LOGIN
=========================================== */
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ msg: "champs manquants" });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return res.status(401).json({ msg: "invalid credentials" });

    const token = data.session?.access_token;
    if (!token) return res.status(500).json({ msg: "no session token" });

    let { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("first_name, last_name, plan")
      .eq("id", data.user.id)
      .single();

    if (pErr || !profile) {
      const meta = data.user.user_metadata || {};
      const fn = meta.firstName || "";
      const ln = meta.lastName || "";

      const { data: inserted, error: iErr } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: data.user.id,
          first_name: fn,
          last_name: ln,
          plan: "free",
        })
        .select("first_name, last_name, plan")
        .single();

      if (iErr || !inserted) {
        console.error("PROFILE create failed:", iErr);
        return res.status(500).json({
          msg: "profile create failed",
          detail: iErr?.message || String(iErr),
          code: iErr?.code,
          hint: iErr?.hint,
        });
      }

      profile = inserted;
    }

    return res.json({
      msg: "ok",
      token,
      user: {
        firstName: profile.first_name,
        lastName: profile.last_name,
        email: data.user.email,
        plan: profile.plan,
      },
    });
  } catch (e) {
    console.error("LOGIN error:", e);
    return res.status(500).json({ msg: "Erreur interne serveur" });
  }
});

/* ===========================================
   PROFILE - ME
=========================================== */
app.get("/me", async (req, res) => {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ success: false, error: "missing token" });
    }

    const { data: userData, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !userData?.user) {
      return res.status(401).json({ success: false, error: "invalid token" });
    }

    const userId = userData.user.id;

    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("first_name, last_name, plan")
      .eq("id", userId)
      .single();

    if (pErr || !profile) {
      return res.status(500).json({ success: false, error: "profile missing" });
    }

    const { data: history, error: hErr } = await supabaseAdmin
      .from("generations")
      .select("created_at, type, label")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (hErr) {
      return res.status(500).json({ success: false, error: "history fetch failed" });
    }

    return res.json({
      success: true,
      user: {
        firstName: profile.first_name,
        lastName: profile.last_name,
        email: userData.user.email,
        plan: profile.plan,
      },
      history: (history || []).map((x) => ({
        date: x.created_at,
        type: x.type,
        label: x.label,
      })),
    });
  } catch (e) {
    console.error("ME error:", e);
    return res.status(500).json({ success: false, error: "Erreur interne serveur" });
  }
});

/* ===========================================
   NUMEROLOGY GENERATOR (AUTH REQUIRED + QUOTA)
=========================================== */
app.post("/generate-theme", generateLimiter, async (req, res) => {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: "AUTH_REQUIRED",
        message: "Vous devez créer un compte pour générer votre thème.",
      });
    }

    const {
      prenom,
      secondPrenom,
      nomFamille,
      nomMarital,
      dateNaissance,
      lieuNaissance,
      heureNaissance,
    } = req.body;

    if (!prenom || !nomFamille || !dateNaissance) {
      return res.status(400).json({ success: false, error: "missing fields" });
    }

    const { data: userData, error: uErr } = await supabaseAdmin.auth.getUser(token);
    if (uErr || !userData?.user) {
      return res.status(401).json({
        success: false,
        error: "INVALID_TOKEN",
        message: "Session invalide. Reconnectez-vous.",
      });
    }

    const userId = userData.user.id;
    await ensureProfileExists(userData.user);

    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("first_name, last_name, plan")
      .eq("id", userId)
      .single();

    if (pErr || !profile) {
      return res.status(500).json({
        success: false,
        error: "PROFILE_NOT_FOUND",
        message: "Profil introuvable.",
      });
    }

    
    const fullName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();

    const planKey = profile.plan || "free";
    const planObj = getPlanByKey(planKey) || getPlanByKey("free");

    // sécurité (au cas où)
    if (!planObj) {
      return res.status(500).json({
        success: false,
        error: "PLAN_CONFIG_ERROR",
        message: "Plan inconnu. Contactez le support.",
      });
    }

    const { data: quotaRows, error: qErr } = await supabaseAdmin.rpc("consume_generation", {
      p_user: userId,
      p_limit: planObj.monthly_limit,
    });


    if (qErr) {
      console.error("QUOTA rpc error:", qErr);
      return res.status(500).json({
        success: false,
        error: "QUOTA_CHECK_FAILED",
        message: "Erreur quota. Réessayez.",
      });
    }

    const quota = Array.isArray(quotaRows) ? quotaRows[0] : quotaRows;

    if (!quota?.allowed) {
      return res.status(429).json({
        success: false,
        error: quota?.reason || "QUOTA_EXCEEDED",
        message: "Quota mensuel atteint. Passez sur un plan supérieur pour continuer.",
        meta: {
          count: quota?.new_count ?? null,
          limit: quota?.quota_limit ?? null,
          month: quota?.month_key ?? null,
        },
      });
    }

    if (planKey === "free") {
      const summaryText = await generateNumerologySummary({
        prenom,
        secondPrenom,
        nomFamille,
        nomMarital,
        dateNaissance,
        lieuNaissance,
        heureNaissance,
      });

      await supabaseAdmin.from("generations").insert({
        user_id: userId,
        type: "summary",
        label: fullName ? `Résumé thème ${fullName}` : "Résumé thème",
        payload: req.body,
      });

      return res.json({ success: true, summary: summaryText });
    }

    const themeTexte = await generateNumerologyTheme({
      prenom,
      secondPrenom,
      nomFamille,
      nomMarital,
      dateNaissance,
      lieuNaissance,
      heureNaissance,
    });

    await supabaseAdmin.from("generations").insert({
      user_id: userId,
      type: "theme",
      label: fullName ? `Thème numérologique ${fullName}` : "Thème numérologique",
      payload: req.body,
    });

    return res.json({ success: true, theme: themeTexte });
  } catch (e) {
    console.error("GEN error:", e);
    return res.status(500).json({ success: false, error: "Erreur interne serveur" });
  }
});

/* ===========================================
   START SERVER
=========================================== */

app.listen(port, () => {
  console.log(`🚀 Server listening on port ${port}`);
});
