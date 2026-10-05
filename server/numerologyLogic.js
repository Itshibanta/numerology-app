// server/numerologyLogic.js
const OpenAI = require("openai");
require("dotenv").config();
const { computeNumerology } = require("./numerologyCalc");
const { getDefinitionByKey } = require("./definitionsCatalog");

// L'API Assistants d'OpenAI a été fermée le 26/08/2026 : les thèmes passent
// par l'API Responses. Les consignes de rédaction (ex-« instructions » des
// assistants, stockées chez OpenAI) vivent désormais dans server/prompts/.
const fs = require("fs");
const path = require("path");

// Modèle utilisé pour la rédaction (surcharge possible sur Render).
const NUMEROLOGY_MODEL = process.env.NUMEROLOGY_MODEL || "gpt-5.5";

// Base documentaire de l'ancien assistant (corpus La Numérologie Autrement,
// cycles, consignes), toujours hébergée chez OpenAI et lue par file_search.
const NUMEROLOGY_VECTOR_STORE_ID =
  process.env.NUMEROLOGY_VECTOR_STORE_ID || "vs_6919c9dc97b08191a902e8c4d8b54ce5";

// Lit les consignes au moment de la rédaction. Fichier absent ou vide =
// erreur : la génération reste "non livrée" et sera retentée, plutôt que de
// livrer un thème rédigé sans consignes.
function readInstructions(fileName) {
  const filePath = path.join(__dirname, "prompts", fileName);
  const text = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8").trim() : "";
  if (!text) throw new Error(`INSTRUCTIONS_MANQUANTES: server/prompts/${fileName}`);
  return text;
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

// Appel unique à l'API Responses : consignes + message utilisateur -> texte.
async function runResponse(instructionsFile, userMessage) {
  const openai = getOpenAIClient();
  const request = {
    model: NUMEROLOGY_MODEL,
    instructions: readInstructions(instructionsFile),
    input: userMessage,
    store: false,
  };
  if (NUMEROLOGY_VECTOR_STORE_ID) {
    request.tools = [{ type: "file_search", vector_store_ids: [NUMEROLOGY_VECTOR_STORE_ID] }];
  }

  const response = await openai.responses.create(request);
  if (response.status !== "completed") {
    throw new Error(`Réponse OpenAI terminée avec le statut: ${response.status}`);
  }
  const text = (response.output_text || "").trim();
  if (!text) throw new Error("Contenu texte vide dans la réponse OpenAI.");
  return text;
}

function injectDefinitionsInText(text) {
  const TITLE_TO_KEY = {
    "Chemin de Vie": "chemin_de_vie",
    "Nombre d’Expression": "nombre_expression",
    "Nombre Ressource": "nombre_ressource",
    "Nombre Actif": "nombre_actif",
    "Nombre Héréditaire": "nombre_hereditaire",
    "Nombre Moi Intime": "nombre_moi_intime",
    "Défi du Moi Intime": "defi_moi_intime",
    "Nombre de Réalisation": "nombre_realisation",
    "Nombre d’Élan Spirituel": "nombre_elan_spirituel",
    "Nombre Défi de l’Élan Spirituel": "defi_elan_spirituel",
    "Défi du Nombre d’Expression": "defi_nombre_expression",
    "Nombre d’Équilibre": "nombre_equilibre",
  };

  return text.replace(
    /^---\s*(.+?)\s*---$/gm,
    (match, rawTitle) => {
      const title = rawTitle.trim();
      const key = TITLE_TO_KEY[title];
      const def = key ? getDefinitionByKey(key) : null;

      if (!def) return match;

      return `--- ${title} ---
${def.definition}`;
    }
  );
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
- Aucune mention de tes sources, ni même Tableau Récap.
`.trim();

// Règles de garde : le modèle NE DOIT PAS recalculer
const CALC_GUARD_RULES = `
CALCULS OFFICIELS (SOURCE DE VÉRITÉ — INTERDICTION ABSOLUE DE RECALCULER) :
- Tu n'as PAS le droit de recalculer les nombres.
- Tu dois utiliser exclusivement les valeurs fournies dans le bloc "computed".
- Tu dois afficher les lignes de calcul EXACTEMENT telles que fournies dans "calc_lines" lorsque tu expliques un nombre (sans en inventer d'autres).
- Tu n'inventes aucun nombre, aucune ligne de calcul, aucune valeur.
`.trim();

const SPECIAL_NUMBER_RULES = `
RÈGLE MAÎTRES-NOMBRES & NOMBRES KARMIQUES (OBLIGATOIRE) :
- Si, pour un nombre, le champ computed.<clé>.karmic est présent (ex: "11/2", "13/4", "22/4"...),
  tu DOIS faire DEUX lectures distinctes :
  1) Lecture du nombre spécial (11, 22, 33, 44 OU 13, 14, 16, 19) : potentiel / vibration / leçon.
  2) Lecture du nombre réduit : ancrage concret / expression quotidienne.
- Les maîtres-nombres et nombres karmiques ne sont jamais ignorés.
- Tu dois mentionner la forme complète puis la réduction (ex: 11/2, 13/4) dans le texte.
`.trim();


// Petit utilitaire pour factoriser l'état civil
function buildCivilBlock({
  prenom,
  secondPrenom,
  nomFamille,
  nomMarital,
  dateNaissance,
  lieuNaissance,
}) {
  return `
INFORMATIONS D'ÉTAT CIVIL :
- Prénom : ${prenom || "Non renseigné"}
- Second prénom(s) : ${secondPrenom || "Non renseigné"}
- Nom de famille : ${nomFamille || "Non renseigné"}
- Nom de famille après mariage : ${nomMarital || "Non renseigné"}
- Date de naissance : ${dateNaissance || "Non renseigné"}
- Lieu de naissance : ${lieuNaissance || "Non renseigné"}
`.trim();
}

// On réduit computeNumerology à ce qu'on envoie à GPT
function buildCalcPayload(input) {
  const calc = computeNumerology({
    prenom: input.prenom,
    secondPrenom: input.secondPrenom,
    nomFamille: input.nomFamille,
    nomMarital: input.nomMarital,
    dateNaissance: input.dateNaissance,
  });

  return {
    computed: calc.computed,
    calc_lines: calc.calc_lines,
  };
}

// ========================== THÈME COMPLET ==========================
async function generateNumerologyTheme(input) {

  const calcPayload = buildCalcPayload(input);

  const userMessage = `
L'utilisateur souhaite générer un thème numérologique complet.

${buildCivilBlock(input)}

${CALC_GUARD_RULES}

${SPECIAL_NUMBER_RULES}

BLOC DE CALCULS À UTILISER TEL QUEL (SOURCE DE VÉRITÉ) :
${JSON.stringify(calcPayload, null, 2)}

${OUTPUT_FORMAT_RULES}

CONTRAINTE IMPORTANTE :
- Tu dois respecter l’ordre officiel des sections.
- À l’intérieur d’une section principale, si tu détailles des éléments (ex: Chemin de Vie, Nombre d’Expression, etc.),
  tu DOIS les écrire en sous-sections avec le format --- ... ---.
`.trim();

  if (process.env.NUMEROLOGY_DEBUG === "1") {
    console.log("[NUM_THEME] calcPayload:", JSON.stringify(calcPayload, null, 2));
    console.log("[NUM_THEME] userMessage:", userMessage);
  }

  let text = await runResponse("theme-instructions.md", userMessage);
  text = injectDefinitionsInText(text);
  return text;
}

// ========================== RÉSUMÉ (FREE PLAN) ==========================
async function generateNumerologySummary(input) {

  const calcPayload = buildCalcPayload(input);

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

${buildCivilBlock(input)}

${CALC_GUARD_RULES}

${SPECIAL_NUMBER_RULES}

BLOC DE CALCULS À UTILISER TEL QUEL (SOURCE DE VÉRITÉ) :
${JSON.stringify(calcPayload, null, 2)}

${OUTPUT_FORMAT_RULES}
`.trim();

  if (process.env.NUMEROLOGY_DEBUG === "1") {
    console.log("[NUM_SUMMARY] calcPayload:", JSON.stringify(calcPayload, null, 2));
    console.log("[NUM_SUMMARY] userMessage:", userMessage);
  }

  return runResponse("summary-instructions.md", userMessage);
}

module.exports = {
  generateNumerologyTheme,
  generateNumerologySummary,
};
