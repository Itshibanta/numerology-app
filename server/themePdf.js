// server/themePdf.js
// Génère un PDF à partir du texte brut d'un thème (format === H1 === / --- H2 ---).
// N'altère JAMAIS le contenu : se contente de le mettre en forme.
const PDFDocument = require("pdfkit");

function buildThemePdfBuffer(title, rawTheme) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const chunks = [];

      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Titre principal
      doc.font("Helvetica-Bold").fontSize(18).text(title || "Thème numérologique");
      doc.moveDown(1);

      const lines = (rawTheme || "").split("\n");

      for (const raw of lines) {
        const line = raw.trim();

        if (!line) {
          doc.moveDown(0.5);
          continue;
        }

        // === Titre ===
        if (line.startsWith("===") && line.endsWith("===")) {
          const t = line.replace(/===/g, "").trim();
          doc.moveDown(0.5).font("Helvetica-Bold").fontSize(15).text(t);
          doc.moveDown(0.3);
          continue;
        }

        // --- Sous-titre ---
        if (line.startsWith("---") && line.endsWith("---")) {
          const t = line.replace(/---/g, "").trim();
          doc.moveDown(0.3).font("Helvetica-Bold").fontSize(13).text(t);
          doc.moveDown(0.2);
          continue;
        }

        // Texte normal
        doc.font("Helvetica").fontSize(11).text(line, { align: "left" });
      }

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = { buildThemePdfBuffer };
