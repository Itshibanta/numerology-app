// server/numerologyLogic.js
const OpenAI = require("openai");
require("dotenv").config();

// IDs d'assistants (doivent être dans server/.env)
const NUMEROLOGY_ASSISTANT_ID = process.env.NUMEROLOGY_ASSISTANT_ID;
const NUMEROLOGY_SUMMARY_ASSISTANT_ID = process.env.NUMEROLOGY_SUMMARY_ASSISTANT_ID;
const { computeNumerology } = require("./numerologyCalc");

if (!NUMEROLOGY_ASSISTANT_ID || !NUMEROLOGY_SUMMARY_ASSISTANT_ID) {
  throw new Error(
    "IDs assistants manquants. Vérifie server/.env : NUMEROLOGY_ASSISTANT_ID et NUMEROLOGY_SUMMARY_ASSISTANT_ID"
  );
}

// ⚡ client OpenAI créé à la première utilisation seulement
let client = null;
function getOpenAIClient() {
  if (!client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY manquante dans server/.env");
    }
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

// Utilitaire : extrait le texte d'un message assistant
function extractTextFromMessages(messages) {
  const assistantMessage = messages.data.find((msg) => msg.role === "assistant");
  if (!assistantMessage) {
    throw new Error("Aucun message assistant trouvé.");
  }

  const textPart = assistantMessage.content.find((part) => part.type === "text");
  if (!textPart || !textPart.text || !textPart.text.value) {
    throw new Error("Contenu texte vide dans la réponse assistant.");
  }

  return textPart.text.value;
}

// Format commun (H1 + H2) : robuste et simple à parser côté front
const OUTPUT_FORMAT_RULES = `
FORMAT STRICT À RESPECTER (IMPORTANT) :

1) SECTIONS PRINCIPALES (H1)
Chaque section principale doit commencer par une ligne EXACTE :
=== NOM DE LA SECTION ===

2) SOUS-SECTIONS (H2)
Chaque sous-section (à l'intérieur d'une section principale) doit commencer par une ligne EXACTE :
--- Nom de la sous-section ---

3) RÈGLES
- Aucun Markdown (#, ##, listes Markdown).
- Aucune autre forme de titres.
- Le contenu vient juste après le titre, en texte normal.
- Si une section n’a pas de sous-sections, tu écris directement le contenu après le titre H1.
`.trim();

// ========================== THÈME COMPLET ==========================
async function generateNumerologyTheme(input) {
  const {
    prenom,
    secondPrenom,
    nomFamille,
    nomMarital,
    dateNaissance,
    lieuNaissance,
  } = input;

  const openai = getOpenAIClient();
  const thread = await openai.beta.threads.create();

  const calc = computeNumerology({
  prenom,
  secondPrenom,
  nomFamille,
  nomMarital,
  dateNaissance,
});


  const userMessage = `
L'utilisateur souhaite générer un thème numérologique complet.

INFORMATIONS D'ÉTAT CIVIL :
- Prénom : ${prenom || "Non renseigné"}
- Second prénom(s) : ${secondPrenom || "Non renseigné"}
- Nom de famille : ${nomFamille || "Non renseigné"}
- Nom de famille après mariage : ${nomMarital || "Non renseigné"}
- Date de naissance : ${dateNaissance || "Non renseigné"}
- Lieu de naissance : ${lieuNaissance || "Non renseigné"}

${OUTPUT_FORMAT_RULES}

CONTRAINTE IMPORTANTE :
- Tu dois respecter l’ordre officiel des sections.
- À l’intérieur d’une section principale, si tu détailles des éléments (ex: Chemin de Vie, Nombre d’Expression, etc.),
  tu DOIS les écrire en sous-sections avec le format --- ... ---.
`.trim();

  await openai.beta.threads.messages.create(thread.id, {
    role: "user",
    content: userMessage,
  });

  const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
    assistant_id: NUMEROLOGY_ASSISTANT_ID,
  });

  if (run.status !== "completed") {
    throw new Error(`Run (thème complet) terminé avec le statut: ${run.status}`);
  }

  const messages = await openai.beta.threads.messages.list(run.thread_id);
  return extractTextFromMessages(messages);
}

// ========================== RÉSUMÉ (FREE PLAN) ==========================
async function generateNumerologySummary(input) {
  const {
    prenom,
    secondPrenom,
    nomFamille,
    nomMarital,
    dateNaissance,
    lieuNaissance,
  } = input;

  const openai = getOpenAIClient();
  const thread = await openai.beta.threads.create();

  const calc = computeNumerology({
  prenom,
  secondPrenom,
  nomFamille,
  nomMarital,
  dateNaissance,
});


  const userMessage = `
L'utilisateur souhaite obtenir une VERSION RÉSUMÉE de son thème numérologique.

OBJECTIF :
- Fournir une vision globale, concise et inspirante du profil numérologique.
- Longueur attendue : entre 400 et 700 mots (max 900).
- Ne pas donner le thème complet ni la structure détaillée du rapport.

STRUCTURE DU RÉSUMÉ (simple) :
=== INTRODUCTION ===
(2–4 phrases)

=== SYNTHÈSE DU PROFIL ===
--- Identité / énergie dominante ---
texte

--- Forces principales ---
texte

=== AXE ÉMOTIONNEL & RELATIONNEL ===
texte

=== ENJEUX / DÉFIS PRINCIPAUX ===
(2 à 5 points en phrases courtes, pas de liste Markdown)

=== CONCLUSION ===
1 paragraphe

PHRASE FINALE OBLIGATOIRE (exacte, seule à la fin) :
"Pour une analyse complète incluant : Arbre de Vie numérologique, Décors de Vie, Théâtre de Vie (4 actes), Leçon d'Âme, Année personnelle, Année clé, Analyse karmique et Conclusion approfondie, consulte la version complète."

INFORMATIONS D'ÉTAT CIVIL :
- Prénom : ${prenom || "Non renseigné"}
- Second prénom(s) : ${secondPrenom || "Non renseigné"}
- Nom de famille : ${nomFamille || "Non renseigné"}
- Nom de famille après mariage : ${nomMarital || "Non renseigné"}
- Date de naissance : ${dateNaissance || "Non renseigné"}
- Lieu de naissance : ${lieuNaissance || "Non renseigné"}

${OUTPUT_FORMAT_RULES}
`.trim();

  await openai.beta.threads.messages.create(thread.id, {
    role: "user",
    content: userMessage,
  });

  const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
    assistant_id: NUMEROLOGY_SUMMARY_ASSISTANT_ID,
  });

  if (run.status !== "completed") {
    throw new Error(`Run (résumé) terminé avec le statut: ${run.status}`);
  }

  const messages = await openai.beta.threads.messages.list(run.thread_id);
  return extractTextFromMessages(messages);
}

module.exports = {
  generateNumerologyTheme,
  generateNumerologySummary,
};
