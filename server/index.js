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
    });

    if (error) return res.status(400).json({ msg: error.message });

    await supabaseAdmin
      .from("profiles")
      .update({ first_name: firstName, last_name: lastName })
      .eq("id", data.user.id);

    res.json({ msg: "ok" });
  } catch (e) {
    console.error("REGISTER error:", e);
    res.status(500).json({ msg: "Erreur interne serveur" });
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

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("first_name, last_name, plan")
      .eq("id", data.user.id)
      .single();

    res.json({
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
    res.status(500).json({ msg: "Erreur interne serveur" });
  }
});

/* ===========================================
   PROFILE - ME
=========================================== */
app.get("/me", async (req, res) => {
  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ success: false });

    const { data: userData, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !userData?.user) {
      return res.status(401).json({ success: false });
    }

    const userId = userData.user.id;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("first_name, last_name, plan")
      .eq("id", userId)
      .single();

    const { data: history } = await supabaseAdmin
      .from("generations")
      .select("created_at, type, label")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    res.json({
      success: true,
      user: {
        firstName: profile.first_name,
        lastName: profile.last_name,
        email: userData.user.email,
        plan: profile.plan,
      },
      history: (history || []).map((h) => ({
        date: h.created_at,
        type: h.type,
        label: h.label,
      })),
    });
  } catch (e) {
    console.error("ME error:", e);
    res.status(500).json({ success: false });
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
      return res.status(400).json({ success: false });
    }

    let userId = null;
    let plan = "free";
    let fullName = "";

    const token = getBearerToken(req);
    if (token) {
      const { data } = await supabaseAdmin.auth.getUser(token);
      if (data?.user) {
        userId = data.user.id;
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("first_name, last_name, plan")
          .eq("id", userId)
          .single();

        if (profile) {
          plan = profile.plan;
          fullName = `${profile.first_name} ${profile.last_name}`.trim();
        }
      }
    }

    if (userId && plan === "free") {
      const summary = await generateNumerologySummary(req.body);
      await supabaseAdmin.from("generations").insert({
        user_id: userId,
        type: "summary",
        label: `Résumé thème ${fullName || ""}`,
        payload: req.body,
      });
      return res.json({ success: true, summary });
    }

    const theme = await generateNumerologyTheme(req.body);

    if (userId) {
      await supabaseAdmin.from("generations").insert({
        user_id: userId,
        type: "theme",
        label: `Thème numérologique ${fullName || ""}`,
        payload: req.body,
      });
    }

    res.json({ success: true, theme });
  } catch (e) {
    console.error("GEN error:", e);
    res.status(500).json({ success: false });
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
