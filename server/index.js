// server/index.js
require("dotenv").config();

const {
  getPlanByKey,
  getOneShotPlan,
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
const { buildThemePdfBuffer } = require("./themePdf");
const { sendEmail, emailLayout } = require("./email");

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

  const meta = user.user_metadata || {};
  const metaFirst = (meta.firstName || meta.first_name || "").trim();
  const metaLast = (meta.lastName || meta.last_name || "").trim();

  const { data: existing, error } = await supabaseAdmin
    .from("profiles")
    .select("id, first_name, last_name")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;

  // 1) si pas de profil -> insert
  if (!existing) {
    const { error: insErr } = await supabaseAdmin.from("profiles").insert({
      id: userId,
      plan: "free",
      first_name: metaFirst || null,
      last_name: metaLast || null,
    });
    if (insErr) throw insErr;
    return;
  }

  // 2) si profil existe mais noms vides -> hydrate depuis metadata
  const needFirst = !existing.first_name && metaFirst;
  const needLast = !existing.last_name && metaLast;

  if (needFirst || needLast) {
    const patch = {};
    if (needFirst) patch.first_name = metaFirst;
    if (needLast) patch.last_name = metaLast;

    const { error: upErr } = await supabaseAdmin
      .from("profiles")
      .update(patch)
      .eq("id", userId);

    if (upErr) throw upErr;
  }
}

/* ===========================================
   STRIPE WEBHOOK (RAW BODY FIRST)
=========================================== */
// 1) Webhook RAW en premier
app.post("/stripe/webhook", express.raw({ type: "application/json" }), stripeWebhookHandler);

// 2) JSON parser pour tout le reste (en skip webhook)
app.use((req, res, next) => {
  if (req.originalUrl === "/stripe/webhook") return next();
  return express.json({ limit: "100kb" })(req, res, next);
});



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

console.log("CHECKOUT FRONTEND_URL:", process.env.FRONTEND_URL);
console.log("CHECKOUT FRONTEND_URL const:", FRONTEND_URL);

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
      const { data } = await supabaseAdmin.auth.getUser(getBearerToken(req));
      await ensureProfileExists(data.user);


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

/* ===== Stripe Checkout ONE-SHOT (anonyme, mode: payment) =====
   1 paiement = 1 thème. Pas d'authentification requise : le compte est
   créé après paiement par le webhook. L'état civil voyage dans la metadata
   de la session Stripe. */
app.post("/stripe/create-oneshot-session", async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ error: "STRIPE_DISABLED" });
    }

    const plan = getOneShotPlan();
    if (!plan || !plan.stripe_price_id) {
      return res.status(500).json({ error: "PLAN_NOT_CONFIGURED" });
    }

    const {
      prenom,
      secondPrenom,
      nomFamille,
      nomMarital,
      dateNaissance,
      lieuNaissance,
      email,
    } = req.body || {};

    if (!prenom || !nomFamille || !dateNaissance || !email) {
      return res.status(400).json({ error: "MISSING_FIELDS" });
    }

    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded", // paiement intégré dans la page (pas de redirection)
      mode: "payment",
      customer_email: email,
      allow_promotion_codes: true, // champ "code promo" dans le checkout
      line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
      return_url: `${FRONTEND_URL}/theme-numerologique?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        kind: "oneshot_theme",
        email: String(email).slice(0, 200),
        prenom: String(prenom || "").slice(0, 200),
        secondPrenom: String(secondPrenom || "").slice(0, 200),
        nomFamille: String(nomFamille || "").slice(0, 200),
        nomMarital: String(nomMarital || "").slice(0, 200),
        dateNaissance: String(dateNaissance || "").slice(0, 50),
        lieuNaissance: String(lieuNaissance || "").slice(0, 200),
      },
    });

    // Stocke le prospect dès la saisie (même s'il ne paie pas).
    // client = "No" tant que le paiement n'est pas confirmé ; passe à "Yes"
    // dans le webhook. Non bloquant pour le paiement.
    try {
      await supabaseAdmin.from("leads").insert({
        email,
        prenom: prenom || null,
        second_prenom: secondPrenom || null,
        nom_famille: nomFamille || null,
        nom_marital: nomMarital || null,
        date_naissance: dateNaissance || null,
        lieu_naissance: lieuNaissance || null,
        client: "No",
        stripe_session_id: session.id,
      });
    } catch (leadErr) {
      console.error("LEAD_INSERT_FAILED", leadErr);
    }

    return res.json({ clientSecret: session.client_secret });
  } catch (e) {
    console.error("ONESHOT_CHECKOUT_FAILED", e);
    return res.status(500).json({ error: "CHECKOUT_FAILED" });
  }
});

/* ===== Création du mot de passe après paiement (depuis la page confirmation) =====
   Le client n'est pas encore authentifié : on identifie son compte via la
   session Stripe (vérifiée payée), puis on définit son mot de passe. */
app.post("/account/set-password", async (req, res) => {
  try {
    if (!stripe) return res.status(500).json({ error: "STRIPE_DISABLED" });

    const { session_id, password } = req.body || {};
    if (!session_id || !password || String(password).length < 8) {
      return res.status(400).json({ error: "INVALID_INPUT" });
    }

    // 1) Vérifie que la session existe et est payée
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (!session || session.payment_status !== "paid") {
      return res.status(402).json({ error: "PAYMENT_NOT_CONFIRMED" });
    }

    const sessionEmail =
      session.customer_details?.email ||
      session.customer_email ||
      session.metadata?.email ||
      null;
    if (!sessionEmail) return res.status(400).json({ error: "NO_EMAIL" });

    // 2) Crée le compte avec ce mot de passe, ou le met à jour s'il existe déjà
    const { data: created, error: createErr } =
      await supabaseAdmin.auth.admin.createUser({
        email: sessionEmail,
        password,
        email_confirm: true,
        user_metadata: {
          firstName: session.metadata?.prenom || "",
          lastName: session.metadata?.nomFamille || "",
        },
      });

    if (!createErr && created?.user) {
      return res.json({ ok: true });
    }

    // L'utilisateur existe déjà -> on le retrouve et on met à jour le mot de passe
    const emailLc = sessionEmail.toLowerCase();
    let userId = null;
    for (let page = 1; page <= 10 && !userId; page++) {
      const { data: list, error: listErr } =
        await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (listErr) break;
      const found = (list?.users || []).find(
        (u) => (u.email || "").toLowerCase() === emailLc
      );
      if (found) userId = found.id;
      if (!list?.users || list.users.length < 200) break;
    }

    if (!userId) return res.status(404).json({ error: "ACCOUNT_NOT_FOUND" });

    const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password }
    );
    if (updErr) {
      console.error("SET_PASSWORD_UPDATE_FAILED", updErr);
      return res.status(500).json({ error: "SET_PASSWORD_FAILED" });
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error("SET_PASSWORD_FAILED", e);
    return res.status(500).json({ error: "SET_PASSWORD_FAILED" });
  }
});

/* =========================================================================
   THÈME GRATUIT (anonyme) — résumé via l'assistant "free" (summary).
   NB: la génération elle-même (generateNumerologySummary) n'est PAS modifiée.
   Flux: saisie email -> compte créé si besoin -> résumé généré -> stocké
   sur le compte (récupérable en PDF via /generations/:id/pdf).
========================================================================= */
const crypto = require("crypto");
const FREE_CLAIM_SECRET =
  process.env.FREE_CLAIM_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "dev-secret-change-me";

function makeFreeClaim(emailLc) {
  const exp = Date.now() + 60 * 60 * 1000; // 1h
  const payload = `${emailLc}|${exp}`;
  const sig = crypto.createHmac("sha256", FREE_CLAIM_SECRET).update(payload).digest("hex");
  return Buffer.from(`${payload}|${sig}`).toString("base64");
}
function verifyFreeClaim(token, emailLc) {
  try {
    const decoded = Buffer.from(String(token), "base64").toString("utf8");
    const [em, exp, sig] = decoded.split("|");
    if (em !== emailLc) return false;
    if (Date.now() > Number(exp)) return false;
    const expected = crypto
      .createHmac("sha256", FREE_CLAIM_SECRET)
      .update(`${em}|${exp}`)
      .digest("hex");
    const a = Buffer.from(sig || "", "hex");
    const b = Buffer.from(expected, "hex");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
async function findUserIdByEmail(emailLc) {
  for (let page = 1; page <= 10; page++) {
    const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) break;
    const found = (list?.users || []).find(
      (u) => (u.email || "").toLowerCase() === emailLc
    );
    if (found) return found.id;
    if (!list?.users || list.users.length < 200) break;
  }
  return null;
}

// Indique si un email possède déjà un compte (sert au flux payant pour ne pas
// reproposer la création de mot de passe à un compte existant).
app.get("/account/exists", async (req, res) => {
  try {
    const emailLc = String(req.query.email || "").toLowerCase().trim();
    if (!emailLc) return res.status(400).json({ error: "MISSING_EMAIL" });
    const userId = await findUserIdByEmail(emailLc);
    return res.json({ exists: !!userId });
  } catch (e) {
    console.error("ACCOUNT_EXISTS_FAILED", e);
    return res.status(500).json({ error: "CHECK_FAILED" });
  }
});

app.post("/free-theme", generateLimiter, async (req, res) => {
  try {
    const {
      prenom,
      secondPrenom,
      nomFamille,
      nomMarital,
      dateNaissance,
      lieuNaissance,
      email,
    } = req.body || {};

    if (!prenom || !nomFamille || !dateNaissance || !email) {
      return res.status(400).json({ error: "MISSING_FIELDS" });
    }
    const emailLc = String(email).toLowerCase().trim();

    // 1) Le compte existe-t-il déjà ?
    let userId = await findUserIdByEmail(emailLc);
    let accountExists = !!userId;

    // 2) Sinon, on le crée (email confirmé, sans mot de passe pour l'instant)
    if (!userId) {
      const { data: created, error: createErr } =
        await supabaseAdmin.auth.admin.createUser({
          email: emailLc,
          email_confirm: true,
          user_metadata: { firstName: prenom || "", lastName: nomFamille || "" },
        });
      if (createErr || !created?.user) {
        // course possible : peut déjà exister
        userId = await findUserIdByEmail(emailLc);
        accountExists = true;
        if (!userId) return res.status(500).json({ error: "ACCOUNT_CREATE_FAILED" });
      } else {
        userId = created.user.id;
        await ensureProfileExists(created.user);
      }
    }

    // 3) Génération du résumé (assistant gratuit) — fonction existante inchangée
    const summaryText = await generateNumerologySummary({
      prenom,
      secondPrenom,
      nomFamille,
      nomMarital,
      dateNaissance,
      lieuNaissance,
    });

    // 4) Stockage de la génération sur le compte (PDF servi à la demande)
    const targetName = `${prenom || ""} ${nomFamille || ""}`.trim();
    await supabaseAdmin.from("generations").insert({
      user_id: userId,
      type: "summary",
      label: targetName ? `Résumé thème ${targetName}` : "Résumé thème gratuit",
      payload: req.body || {},
      result_text: summaryText,
    });

    // 5) Lead (non bloquant)
    try {
      await supabaseAdmin.from("leads").insert({
        email: emailLc,
        prenom: prenom || null,
        second_prenom: secondPrenom || null,
        nom_famille: nomFamille || null,
        nom_marital: nomMarital || null,
        date_naissance: dateNaissance || null,
        lieu_naissance: lieuNaissance || null,
        client: "Free",
      });
    } catch (leadErr) {
      console.error("LEAD_INSERT_FAILED(free)", leadErr);
    }

    // 6) Jeton de revendication : permet de définir le mot de passe d'un
    //    compte NEUF uniquement (pas reproposé si le compte existait déjà).
    const claimToken = accountExists ? null : makeFreeClaim(emailLc);
    return res.json({ ok: true, accountExists, claimToken });
  } catch (e) {
    console.error("FREE_THEME_FAILED", e);
    return res.status(500).json({ error: "FREE_THEME_FAILED" });
  }
});

// Définit le mot de passe d'un compte gratuit nouvellement créé (jeton requis).
app.post("/account/set-password-free", async (req, res) => {
  try {
    const { email, password, claimToken } = req.body || {};
    if (!email || !password || String(password).length < 8 || !claimToken) {
      return res.status(400).json({ error: "INVALID_INPUT" });
    }
    const emailLc = String(email).toLowerCase().trim();
    if (!verifyFreeClaim(claimToken, emailLc)) {
      return res.status(403).json({ error: "INVALID_CLAIM" });
    }
    const userId = await findUserIdByEmail(emailLc);
    if (!userId) return res.status(404).json({ error: "ACCOUNT_NOT_FOUND" });

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password,
    });
    if (error) {
      console.error("SET_PASSWORD_FREE_UPDATE_FAILED", error);
      return res.status(500).json({ error: "SET_PASSWORD_FAILED" });
    }
    return res.json({ ok: true });
  } catch (e) {
    console.error("SET_PASSWORD_FREE_FAILED", e);
    return res.status(500).json({ error: "SET_PASSWORD_FAILED" });
  }
});

/* ===== Stripe Billing Portal (annulation / gestion abonnement) ===== */
app.post(
  "/stripe/create-portal-session",
  requireAuth,
  async (req, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ error: "STRIPE_DISABLED" });
      }

      const userId = req.user.id;

      // On récupère le stripe_customer_id dans le profil
      const { data: profile, error: pErr } = await supabaseAdmin
        .from("profiles")
        .select("stripe_customer_id")
        .eq("id", userId)
        .single();

      if (pErr || !profile) {
        console.error("PROFILE_NOT_FOUND for portal", { userId, pErr });
        return res.status(500).json({ error: "PROFILE_NOT_FOUND" });
      }

      if (!profile.stripe_customer_id) {
        return res.status(400).json({ error: "NO_STRIPE_CUSTOMER" });
      }

      // URL de retour après gestion de l'abonnement
      const returnUrl = `${FRONTEND_URL}/profile?portal=done`;

      const session = await stripe.billingPortal.sessions.create({
        customer: profile.stripe_customer_id,
        return_url: returnUrl,
      });

      return res.json({ url: session.url });
    } catch (e) {
      console.error("PORTAL_SESSION_FAILED", e);
      return res.status(500).json({ error: "PORTAL_SESSION_FAILED" });
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

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { firstName, lastName },
        emailRedirectTo: `${FRONTEND_URL}/auth/callback`,
      },
    });

    if (error || !data?.user) {
      return res
        .status(400)
        .json({ error: "REGISTER_FAILED", detail: error?.message });
    }

    // IMPORTANT: ne touche pas profiles ici (V1)
    return res.json({ ok: true, needsEmailConfirmation: true });
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
    await ensureProfileExists(data.user);

    const meta = data.user.user_metadata || {};
    const firstName = meta.firstName || "";
    const lastName = meta.lastName || "";

    if (firstName || lastName) {
      const { error: upErr } = await supabaseAdmin
        .from("profiles")
        .update({ first_name: firstName, last_name: lastName })
        .eq("id", data.user.id);

      if (upErr) console.error("PROFILE_NAME_UPDATE_FAILED:", upErr);
    }

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
    await ensureProfileExists(userData.user);

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
    } = req.body || {};

    const targetName = `${prenom || ""} ${nomFamille || ""}`.trim();

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
      });

      await supabaseAdmin.from("generations").insert({
        user_id: userId,
        type: "summary",
        label: targetName ? `Résumé thème ${targetName}` : "Résumé thème",
        payload: req.body || {},
        result_text: summaryText,
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
    });

    await supabaseAdmin.from("generations").insert({
      user_id: userId,
      type: "theme",
      label: targetName ? `Thème numérologique ${targetName}` : "Thème numérologique",
      payload: req.body || {},
      result_text: themeTexte,
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

    await ensureProfileExists(data.user);

    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("first_name, last_name, plan")
      .eq("id", userId)
      .maybeSingle();

    if (pErr) return res.status(500).json({ error: "PROFILE_READ_FAILED", detail: pErr.message });

    const { data: history, error: hErr } = await supabaseAdmin
      .from("generations")
      .select("id, created_at, type, label, delivered, deliver_at")
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
        id: x.id,
        date: x.created_at,
        type: x.type,
        label: x.label,
        delivered: x.delivered !== false, // true si livré (ou ancien thème sans colonne)
        deliverAt: x.deliver_at || null,
      })),
    });
  } catch (e) {
    console.error("ME error:", e);
    return res.status(500).json({ error: "INTERNAL" });
  }
});

app.get("/generations/:id", async (req, res) => {
  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ error: "AUTH_REQUIRED" });

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) return res.status(401).json({ error: "INVALID_TOKEN" });

    const userId = data.user.id;
    const genId = req.params.id;

    const { data: gen, error: gErr } = await supabaseAdmin
      .from("generations")
      .select("id, created_at, type, label, result_text")
      .eq("id", genId)
      .eq("user_id", userId)
      .maybeSingle();

    if (gErr) return res.status(500).json({ error: "GEN_READ_FAILED", detail: gErr.message });
    if (!gen) return res.status(404).json({ error: "NOT_FOUND" });

    return res.json({ success: true, generation: gen });
  } catch (e) {
    console.error("GENERATION_GET error:", e);
    return res.status(500).json({ error: "INTERNAL" });
  }
});

/* =========================
   GENERATION PDF (signed URL Storage)
========================= */
app.get("/generations/:id/pdf", async (req, res) => {
  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ error: "AUTH_REQUIRED" });

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) return res.status(401).json({ error: "INVALID_TOKEN" });

    const userId = data.user.id;
    const genId = req.params.id;

    const { data: gen, error: gErr } = await supabaseAdmin
      .from("generations")
      .select("id, pdf_path")
      .eq("id", genId)
      .eq("user_id", userId)
      .maybeSingle();

    if (gErr) return res.status(500).json({ error: "GEN_READ_FAILED", detail: gErr.message });
    if (!gen) return res.status(404).json({ error: "NOT_FOUND" });
    if (!gen.pdf_path) return res.status(404).json({ error: "PDF_NOT_READY" });

    const { data: signed, error: sErr } = await supabaseAdmin.storage
      .from("themes")
      .createSignedUrl(gen.pdf_path, 600);

    if (sErr || !signed?.signedUrl) {
      return res.status(500).json({ error: "SIGNED_URL_FAILED", detail: sErr?.message });
    }

    return res.json({ success: true, url: signed.signedUrl });
  } catch (e) {
    console.error("GENERATION_PDF error:", e);
    return res.status(500).json({ error: "INTERNAL" });
  }
});


/* ===========================================
   CRON DE LIVRAISON (déclenché par cron-job.org)
   Génère le thème, fabrique + publie le PDF, marque livré, envoie l'email.
=========================================== */
async function deliverOneGeneration(gen) {
  const payload = gen.payload || {};
  const targetName = `${payload.prenom || ""} ${payload.nomFamille || ""}`.trim();

  // 1) Génère le texte si absent (logique de génération inchangée, réutilisée)
  let text = gen.result_text;
  if (!text) {
    text = await generateNumerologyTheme({
      prenom: payload.prenom,
      secondPrenom: payload.secondPrenom,
      nomFamille: payload.nomFamille,
      nomMarital: payload.nomMarital,
      dateNaissance: payload.dateNaissance,
      lieuNaissance: payload.lieuNaissance,
    });
    await supabaseAdmin.from("generations").update({ result_text: text }).eq("id", gen.id);
  }

  // 2) PDF -> Storage
  const pdfBuffer = await buildThemePdfBuffer(
    targetName ? `Thème numérologique — ${targetName}` : "Thème numérologique",
    text
  );
  const pdfPath = `${gen.user_id}/${gen.id}.pdf`;
  const { error: upErr } = await supabaseAdmin.storage
    .from("themes")
    .upload(pdfPath, pdfBuffer, { contentType: "application/pdf", upsert: true });
  if (upErr) throw new Error("PDF_UPLOAD_FAILED: " + upErr.message);

  // 3) Marque comme livré
  await supabaseAdmin
    .from("generations")
    .update({ pdf_path: pdfPath, delivered: true })
    .eq("id", gen.id);

  // 4) Email "thème prêt"
  try {
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(gen.user_id);
    const email = u?.user?.email;
    if (email) {
      const html = emailLayout(
        "Votre thème numérologique est prêt",
        `<p style="line-height:1.6;">Votre analyse personnalisée est disponible dans votre espace personnel.</p>
         <p style="line-height:1.6;"><a href="${FRONTEND_URL}/signin" style="color:#6f8f72;">Accéder à mon thème</a></p>`
      );
      await sendEmail({
        to: email,
        subject: "Votre thème numérologique est prêt — Clés Des Nombres",
        html,
      });
    }
  } catch (mailErr) {
    console.error("DELIVERY_EMAIL_FAILED", gen.id, mailErr?.message);
  }
}

app.all("/cron/deliver", async (req, res) => {
  const secret = req.query.secret || req.headers["x-cron-secret"];
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "UNAUTHORIZED" });
  }
  try {
    const nowIso = new Date().toISOString();
    const { data: due, error } = await supabaseAdmin
      .from("generations")
      .select("id, user_id, payload, result_text")
      .eq("delivered", false)
      .not("deliver_at", "is", null)
      .lte("deliver_at", nowIso)
      .order("deliver_at", { ascending: true })
      .limit(5);

    if (error) return res.status(500).json({ error: "QUERY_FAILED", detail: error.message });

    let delivered = 0;
    for (const gen of due || []) {
      try {
        await deliverOneGeneration(gen);
        delivered++;
      } catch (e) {
        console.error("DELIVER_ITEM_FAILED", gen.id, e?.message);
      }
    }
    return res.json({ ok: true, due: (due || []).length, delivered });
  } catch (e) {
    console.error("CRON_DELIVER_FAILED", e);
    return res.status(500).json({ error: "INTERNAL" });
  }
});

/* ===========================================
   START SERVER
=========================================== */
app.use((err, req, res, next) => {
  console.error("UNHANDLED_ERROR:", err);

  if (err?.message === "CORS_BLOCKED") {
    return res.status(403).json({ error: "CORS_BLOCKED" });
  }

  return res.status(500).json({ error: "INTERNAL" });
});

app.use((req, res) => {
  res.status(404).json({ error: "NOT_FOUND", path: req.path });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
