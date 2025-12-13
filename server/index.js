// server/index.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { supabase, supabaseAdmin } = require("./supabase");

const {
  generateNumerologyTheme,
  generateNumerologySummary,
} = require("./numerologyLogic");

const app = express();

app.set("trust proxy", 1);

const port = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || "development";

// --- Middlewares
app.use(helmet());
app.use(express.json({ limit: "100kb" }));

/* ===========================================
   CORS — ROBUSTE (Netlify + localhost)
=========================================== */
const allowedOrigins = [
  process.env.CORS_ORIGIN,       // ex: https://classy-sfogliatella-0aecf9.netlify.app
  "http://localhost:5173",
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // origin peut être undefined (curl, server-to-server)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.error("CORS blocked for origin:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.error("CORS blocked for origin:", origin);
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
    const ms = Date.now() - start;
    console.log(`[REQ] ${req.method} ${req.url} -> ${res.statusCode} (${ms}ms)`);
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
   HEALTH
=========================================== */
app.get("/__ping", (req, res) => res.json({ ok: true }));

if (NODE_ENV !== "production") {
  app.get("/__whoami", (req, res) =>
    res.json({
      file: __filename,
      cwd: process.cwd(),
      port,
      env: NODE_ENV,
    })
  );
}

app.get("/__supabase", (req, res) => {
  const url = process.env.SUPABASE_URL || "";
  // ex: https://abcdxyz.supabase.co -> "abcdxyz"
  const projectRef = url.replace("https://", "").replace(".supabase.co", "");
  res.json({
    ok: true,
    supabaseUrl: url,
    projectRef,
  });
});


/* ===========================================
   FAKE DB
=========================================== */
const users = [];

/* ===========================================
   TEST API
=========================================== */
app.get("/", (req, res) => {
  res.send("Serveur numerology-app OK");
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

    // Optionnel: remplir le profil (trigger a déjà créé un profil vide)
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

    if (!email || !password) return res.status(400).json({ msg: "champs manquants" });

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return res.status(401).json({ msg: "invalid credentials" });

    const access_token = data.session?.access_token;
    if (!access_token) return res.status(500).json({ msg: "no session token" });

    // Récupérer profil
    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("first_name, last_name, plan")
      .eq("id", data.user.id)
      .single();

    if (pErr) return res.status(500).json({ msg: "profile fetch failed" });

    return res.json({
      msg: "ok",
      token: access_token,
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
function getBearerToken(req) {
  const h = req.headers.authorization || "";
  const [type, token] = h.split(" ");
  if (type !== "Bearer" || !token) return null;
  return token;
}

app.get("/me", async (req, res) => {
  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ success: false, error: "missing token" });

    const { data: userData, error: uErr } = await supabaseAdmin.auth.getUser(token);
    if (uErr || !userData?.user) {
      return res.status(401).json({ success: false, error: "invalid token" });
    }

    const userId = userData.user.id;

    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("first_name, last_name, plan")
      .eq("id", userId)
      .single();

    if (pErr) return res.status(500).json({ success: false, error: "profile fetch failed" });

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
   NUMEROLOGY GENERATOR
=========================================== */
app.post("/generate-theme", generateLimiter, async (req, res) => {
  try {
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
        error: "prenom, nomFamille et dateNaissance sont obligatoires.",
      });
    }

    // Auth optionnelle (token)
    const token = getBearerToken(req);
    let userId = null;
    let plan = "free";
    let fullName = "";

    if (token) {
      const { data: userData } = await supabaseAdmin.auth.getUser(token);
      if (userData?.user) {
        userId = userData.user.id;

        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("first_name, last_name, plan")
          .eq("id", userId)
          .single();

        if (profile) {
          plan = profile.plan || "free";
          fullName = `${profile.first_name} ${profile.last_name}`.trim();
        }
      }
    }

    // Plan free => résumé
    if (userId && plan === "free") {
      const summaryText = await generateNumerologySummary({
        prenom,
        secondPrenom,
        nomFamille,
        nomMarital,
        dateNaissance,
        lieuNaissance,
        heureNaissance,
      });

      // insert historique
      await supabaseAdmin.from("generations").insert({
        user_id: userId,
        type: "summary",
        label: fullName ? `Résumé thème ${fullName}` : "Résumé thème",
        payload: req.body,
      });

      return res.json({ success: true, summary: summaryText });
    }

    // Sinon thème complet
    const themeTexte = await generateNumerologyTheme({
      prenom,
      secondPrenom,
      nomFamille,
      nomMarital,
      dateNaissance,
      lieuNaissance,
      heureNaissance,
    });

    if (userId) {
      await supabaseAdmin.from("generations").insert({
        user_id: userId,
        type: "theme",
        label: fullName ? `Thème numérologique ${fullName}` : "Thème numérologique",
        payload: req.body,
      });
    }

    return res.json({ success: true, theme: themeTexte });
  } catch (error) {
    console.error("Erreur dans /generate-theme :", error);
    res.status(500).json({
      success: false,
      error: error.message || "Erreur interne serveur",
    });
  }
});
