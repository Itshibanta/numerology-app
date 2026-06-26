// server/email.js
// Envoi d'emails transactionnels via l'API Resend (pas de SDK, simple fetch).
// Variables d'env attendues sur Render :
//   RESEND_API_KEY  : clé API Resend
//   RESEND_FROM     : expéditeur, ex. "Clés Des Nombres <noreply@clesdesnombres.com>"

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM =
  process.env.RESEND_FROM || "Clés Des Nombres <noreply@clesdesnombres.com>";

async function sendEmail({ to, subject, html }) {
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY manquante : email non envoyé.");
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: RESEND_FROM, to, subject, html }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error("RESEND_SEND_FAILED", res.status, t);
      return false;
    }
    return true;
  } catch (e) {
    console.error("RESEND_SEND_ERROR", e?.message || e);
    return false;
  }
}

// Petit gabarit HTML cohérent avec le site.
function emailLayout(title, bodyHtml) {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#3d332d;">
    <div style="font-size:24px;font-weight:bold;letter-spacing:-0.01em;margin:0 0 18px;">
      <span style="color:#3b2e27;">Clés</span> <span style="color:#8fa990;">Des Nombres</span>
    </div>
    <h2 style="font-size:17px;color:#3d332d;margin:0 0 12px;">${title}</h2>
    ${bodyHtml}
    <p style="font-size:12px;color:#8a7d73;margin-top:28px;">Clés Des Nombres — analyse numérologique personnalisée.</p>
  </div>`;
}

module.exports = { sendEmail, emailLayout };
