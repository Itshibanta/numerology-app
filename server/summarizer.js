// server/summarizer.js
const OpenAI = require("openai");
require("dotenv").config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Résume le thème complet + extrait les titres (sections).
 * Ne JETTE JAMAIS d'erreur : toujours un objet { resume, titres }.
 */
async function summarizeTheme(themeComplet) {
  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "Tu es un assistant numérologue expert. Tu DOIS répondre en JSON valide, sans texte autour.",
        },
        {
          role: "user",
          content: `
Je vais te donner un thème numérologique complet.

Tâche :

1) Produis un résumé clair et structuré (6 à 12 paragraphes maximum).
2) Extrais tous les titres de sections visibles dans le texte (sans en inventer).
3) Réponds STRICTEMENT sous ce format JSON :

{
  "resume": "...",
  "titres": ["...", "...", "..."]
}

Voici le thème :
${themeComplet}
`.trim(),
        },
      ],
    });

    const raw = (completion.choices[0].message.content || "").trim();

    // Tentative 1 : parse direct
    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch (_) {
      // ignore
    }

    // Tentative 2 : extraire le premier bloc { ... }
    if (!parsed) {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch (_) {
          // ignore
        }
      }
    }

    if (!parsed || typeof parsed !== "object") {
      console.error(
        "❌ Résultat du résumé non parseable en JSON, réponse brute :",
        raw
      );
      return {
        resume: themeComplet,
        titres: [],
      };
    }

    const resume =
      typeof parsed.resume === "string" && parsed.resume.trim().length > 0
        ? parsed.resume
        : themeComplet;

    const titres = Array.isArray(parsed.titres)
      ? parsed.titres.map((t) => String(t))
      : [];

    return { resume, titres };
  } catch (err) {
    console.error("❌ Erreur dans summarizeTheme:", err);
    // Fallback ultime : pas de blocage, on renvoie le thème complet
    return {
      resume: themeComplet,
      titres: [],
    };
  }
}

module.exports = { summarizeTheme };
