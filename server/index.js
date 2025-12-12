// server/index.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

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

const allowedOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";
app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  })
);

// Log simple
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    console.log(`[REQ] ${req.method} ${req.url} -> ${res.statusCode} (${ms}ms)`);
  });
  next();
});

// Rate limit soft global (évite les abus bêtes)
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Rate limit strict sur génération (le plus important)
const generateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
});

// --- Health
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

/* ===========================================
   FAKE DB (mémoire)
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
app.post("/auth/register", (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ msg: "champs manquants" });
  }

  if (users.find((u) => u.email === email)) {
    return res.status(400).json({ msg: "email déjà utilisé" });
  }

  users.push({
    firstName,
    lastName,
    email,
    password,
    plan: "free",
    themes: [],
  });

  res.json({ msg: "ok" });
});

/* ===========================================
   AUTH - LOGIN
=========================================== */
app.post("/auth/login", (req, res) => {
  const { email, password } = req.body;

  const u = users.find((u) => u.email === email && u.password === password);
  if (!u) return res.status(401).json({ msg: "invalid credentials" });

  res.json({
    msg: "ok",
    user: {
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      plan: u.plan,
    },
  });
});

/* ===========================================
   PROFILE - ME
   GET /me?email=...
   (OK pour dev local. En prod, on passera à token/Supabase)
=========================================== */
app.get("/me", (req, res) => {
  const email = String(req.query.email || "").trim();
  if (!email) {
    return res.status(400).json({ success: false, error: "email manquant" });
  }

  const u = users.find((x) => x.email === email);
  if (!u) {
    return res.status(404).json({ success: false, error: "user introuvable" });
  }

  const history = (u.themes || []).map((t) => {
    const isSummary = !!t.summary;
    const date = t.date || new Date().toISOString();
    const fullName = `${u.firstName} ${u.lastName}`.trim();

    return {
      date,
      type: isSummary ? "summary" : "theme",
      label: isSummary
        ? `Résumé thème ${fullName}`
        : `Thème numérologique ${fullName}`,
    };
  });

  res.json({
    success: true,
    user: {
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      plan: u.plan,
    },
    history,
  });
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
      email,
    } = req.body;

    if (!prenom || !nomFamille || !dateNaissance) {
      return res.status(400).json({
        success: false,
        error: "prenom, nomFamille et dateNaissance sont obligatoires.",
      });
    }

    const user = email ? users.find((u) => u.email === email) : null;

    // Plan free => résumé
    if (user && user.plan === "free") {
      const summaryText = await generateNumerologySummary({
        prenom,
        secondPrenom,
        nomFamille,
        nomMarital,
        dateNaissance,
        lieuNaissance,
        heureNaissance,
      });

      user.themes.push({
        date: new Date().toISOString(),
        summary: true,
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

    if (user) {
      user.themes.push({
        date: new Date().toISOString(),
        summary: false,
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

console.log("BOOT FILE:", __filename);
console.log("PORT:", port);
console.log("ENV:", NODE_ENV);
console.log("CORS_ORIGIN:", allowedOrigin);

app.listen(port, () => {
  console.log(`🚀 Serveur numerology-app lancé sur http://localhost:${port}`);
});
