// server/index.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const { supabaseAdmin } = require("./supabase");
const {
  generateNumerologyTheme,
  generateNumerologySummary,
} = require("./numerologyLogic");

const app = express();
app.set("trust proxy", 1);

const port = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || "development";

/* ===========================================
   MIDDLEWARES
=========================================== */
app.use(helmet());
app.use(express.json({ limit: "100kb" }));

/* ===========================================
   CORS (Netlify + localhost)
=========================================== */
const allowedOrigins = [
  process.env.CORS_ORIGIN,
  "http://localhost:5173",
].filter(Boolean);

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

/* ===========================================
   AUTH HELPERS
=========================================== */
function getBearerToken(req) {
  const h = req.headers.authorization || "";
  const [type, token] = h.split(" ");
  if (type !== "Bearer" || !token) return null;
  return token;
}

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

    // 1) On tente un update (cas normal: trigger a créé la row profiles)
    const { data: updated, error: upErr } = await supabaseAdmin
      .from("profiles")
      .update({ first_name: firstName, last_name: lastName })
      .eq("id", data.user.id)
      .select("id")
      .single();

    // 2) Fallback: si pas de row (trigger absent/raté), on insert
    if (upErr || !updated) {
      const { error: insErr } = await supabaseAdmin.from("profiles").insert({
        id: data.user.id,
        first_name: firstName,
        last_name: lastName,
        plan: "free",
      });

      if (insErr) {
        console.error("REGISTER profile insert failed:", insErr);
        return res.status(500).json({ msg: "profile insert failed" });
      }
    }

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

    // On utilise l'endpoint Supabase REST (auth) via fetch côté serveur
    // => ici on passe par GoTrue via supabase-js côté serveur: OK
    // (Si ton ./supabase exporte aussi un client non-admin, garde-le; sinon on peut réécrire)
    const { supabase } = require("./supabase");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) return res.status(401).json({ msg: "invalid credentials" });

    const token = data.session?.access_token;
    if (!token) return res.status(500).json({ msg: "no session token" });

    // Lire le profil
    let { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("first_name, last_name, plan")
      .eq("id", data.user.id)
      .single();

    // Si pas de profil (trigger absent/raté), on le crée
    if (pErr || !profile) {
      const meta = data.user.user_metadata || {};
      const firstName = meta.firstName || "";
      const lastName = meta.lastName || "";

      const { data: inserted, error: iErr } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: data.user.id,
          first_name: firstName,
          last_name: lastName,
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
    if (!token) return res.status(401).json({ success: false, error: "missing token" });

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

    if (hErr) return res.status(500).json({ success: false, error: "history fetch failed" });

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
   NUMEROLOGY GENERATOR (AUTH REQUIRED)
=========================================== */
app.post("/generate-theme", generateLimiter, async (req, res) => {
  try {
    // ✅ Compte requis
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
      return res.status(400).json({
        success: false,
        error: "missing fields",
      });
    }

    // ✅ Token -> user
    const { data: userData, error: uErr } = await supabaseAdmin.auth.getUser(token);
    if (uErr || !userData?.user) {
      return res.status(401).json({
        success: false,
        error: "INVALID_TOKEN",
        message: "Session invalide. Reconnectez-vous.",
      });
    }

    const userId = userData.user.id;

    // ✅ Profil (plan)
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

    const plan = (profile.plan || "free").toLowerCase();
    const fullName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();

    // ✅ Quota mensuel (atomique)
    const { data: quotaRows, error: qErr } = await supabaseAdmin.rpc("consume_generation", {
      p_user: userId,
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

    // ✅ Plan free => résumé
    if (plan === "free") {
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

    // ✅ Sinon thème complet
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
    return res.status(500).json({
      success: false,
      error: "Erreur interne serveur",
    });
  }
});

/* ===========================================
   START SERVER
=========================================== */
console.log("BOOT FILE:", __filename);
console.log("PORT:", port);
console.log("ENV:", NODE_ENV);
console.log("CORS_ORIGIN:", process.env.CORS_ORIGIN);
console.log("SUPABASE_URL:", process.env.SUPABASE_URL);

app.listen(port, () => {
  console.log(`🚀 Server listening on port ${port}`);
});
