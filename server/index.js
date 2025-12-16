// server/index.js
require("dotenv").config();

const {
  getPlanByKey,
  getPlansPublic,
  assertPlansConfigured,
} = require("./plansCatalog");

const NODE_ENV = process.env.NODE_ENV || "development";

if (NODE_ENV === "production") {
  assertPlansConfigured();
}

/* ===========================================
   CORE IMPORTS
=========================================== */
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const Stripe = require("stripe");
const { stripeWebhookHandler } = require("./stripeWebhook");


const { supabase, supabaseAdmin } = require("./supabase");
const {
  generateNumerologyTheme,
  generateNumerologySummary,
} = require("./numerologyLogic");

/* ===========================================
   ENV / APP INIT
=========================================== */
const PORT = process.env.PORT || 3001;

const FRONTEND_URL =
  (process.env.FRONTEND_URL || "").trim() ||
  (NODE_ENV === "production" ? "" : "http://localhost:5173");

if (NODE_ENV === "production") {
  if (!FRONTEND_URL.startsWith("https://")) {
    throw new Error(`FRONTEND_URL invalid (must start with https://): ${FRONTEND_URL}`);
  }
}

const app = express();
app.use((req, res, next) => {
  if (req.originalUrl === "/stripe/webhook") {
    return next(); // on laisse express.raw gérer
  }
  return express.json()(req, res, next);
});

app.set("trust proxy", 1);

const generateLimiter = rateLimit({ windowMs: 60 * 1000, max: 12, });

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
app.post("/stripe/webhook", express.raw({ type: "application/json" }), stripeWebhookHandler);

/* ===========================================
   STANDARD MIDDLEWARES
=========================================== */
app.use(helmet());

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

      const successUrl = `${FRONTEND_URL}/profile?checkout=success`;
      const cancelUrl = `${FRONTEND_URL}/pricing?checkout=cancel`;

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

app.get("/__routes", (req, res) => {
  const router = app._router || app.router;
  const stack = router?.stack || [];

  const out = [];

  const pushRoute = (r) => {
    out.push({
      path: r.path,
      methods: Object.keys(r.methods || {}).filter(Boolean),
    });
  };

  for (const layer of stack) {
    if (!layer) continue;

    // Express 4 style
    if (layer.route) {
      pushRoute(layer.route);
      continue;
    }

    // Express 5 / nested router
    const nested = layer.handle?.stack || layer.handle?.router?.stack;
    if (nested) {
      for (const l of nested) {
        if (l?.route) pushRoute(l.route);
      }
    }
  }

  res.json({ count: out.length, routes: out });
});

/* =========================
   NUMEROLOGY - GENERATE THEME (AUTH + QUOTA)
========================= */
app.post("/generate-theme", generateLimiter, async (req, res) => {
  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ error: "AUTH_REQUIRED" });

    const { data: userData, error: uErr } = await supabaseAdmin.auth.getUser(token);
    if (uErr || !userData?.user) return res.status(401).json({ error: "INVALID_TOKEN" });

    const userId = userData.user.id;

    // profil garanti
    await ensureProfileExists({ id: userId, email: userData.user.email });

    // récup plan
    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("first_name, last_name, plan")
      .eq("id", userId)
      .single();

    if (pErr || !profile) return res.status(500).json({ error: "PROFILE_NOT_FOUND" });

    const planKey = profile.plan || "free";
    const planObj = getPlanByKey(planKey) || getPlanByKey("free");
    if (!planObj) return res.status(500).json({ error: "PLAN_CONFIG_ERROR" });

    // quota (si ton RPC existe)
    const { data: quotaRows, error: qErr } = await supabaseAdmin.rpc("consume_generation", {
      p_user: userId,
      p_limit: planObj.monthly_limit,
    });

    if (qErr) {
      console.error("QUOTA_CHECK_FAILED RAW:", qErr);
      return res.status(500).json({ error: "QUOTA_CHECK_FAILED", detail: qErr.message });
    }


    const quota = Array.isArray(quotaRows) ? quotaRows[0] : quotaRows;
    if (!quota?.allowed) {
      return res.status(429).json({
        error: quota?.reason || "QUOTA_EXCEEDED",
        meta: { count: quota?.new_count ?? null, limit: quota?.quota_limit ?? null, month: quota?.month_key_out ?? null },
      });
    }

    // input minimal (adapte si besoin)
    const {
      prenom,
      secondPrenom,
      nomFamille,
      nomMarital,
      dateNaissance,
      lieuNaissance,
      heureNaissance,
    } = req.body || {};

    if (!prenom || !nomFamille || !dateNaissance) {
      return res.status(400).json({ error: "MISSING_FIELDS" });
    }

    const fullName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();

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
    console.error("GENERATE_THEME error:", e);
    return res.status(500).json({ error: "INTERNAL" });
  }
});

/* =========================
   PROFILE - ME (AUTH)
========================= */
app.get("/me", async (req, res) => {
  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ error: "AUTH_REQUIRED" });

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) return res.status(401).json({ error: "INVALID_TOKEN" });

    const userId = data.user.id;

    await ensureProfileExists({ id: userId, email: data.user.email });

    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("first_name, last_name, plan")
      .eq("id", userId)
      .maybeSingle();

    if (pErr) return res.status(500).json({ error: "PROFILE_READ_FAILED", detail: pErr.message });

    const { data: history, error: hErr } = await supabaseAdmin
      .from("generations")
      .select("created_at, type, label")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (hErr) return res.status(500).json({ error: "HISTORY_READ_FAILED", detail: hErr.message });

    return res.json({
      success: true,
      user: {
        firstName: profile?.first_name || "",
        lastName: profile?.last_name || "",
        email: data.user.email,
        plan: profile?.plan || "free",
      },
      history: (history || []).map((x) => ({
        date: x.created_at,
        type: x.type,
        label: x.label,
      })),
    });
  } catch (e) {
    console.error("ME error:", e);
    return res.status(500).json({ error: "INTERNAL" });
  }
});


/* ===========================================
   START SERVER
=========================================== */
app.use((req, res) => {
  res.status(404).json({ error: "NOT_FOUND", path: req.path });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
