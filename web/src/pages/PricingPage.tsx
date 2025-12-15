// web/src/pages/PricingPage.tsx

const API_BASE = import.meta.env.VITE_API_URL; // doit pointer vers Render en prod

async function startCheckout(planKey: string) {
  const token = localStorage.getItem("auth_token");

  if (!token) {
    // Minimal V1 : si pas connecté, on renvoie vers login
    window.location.href = "/signin";
    return;
  }

  const res = await fetch(`${API_BASE}/stripe/create-checkout-session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ plan_key: planKey }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Minimal : tu peux brancher ta modal ici plus tard
    alert(data?.error || "Erreur paiement. Réessayez.");
    return;
  }

  if (!data?.url) {
    alert("Checkout indisponible. Réessayez.");
    return;
  }

  window.location.href = data.url;
}

function getCurrentPlan(): string | null {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const u = JSON.parse(raw);
    if (typeof u?.plan === "string") return u.plan.toLowerCase();
    return null;
  } catch {
    return null;
  }
}

const PricingPage = () => {
  const currentPlan = getCurrentPlan();

  const btnText = (planKey: string) =>
    currentPlan === planKey ? "Plan actuel" : "Choisir ce plan";

  const btnDisabled = (planKey: string) => currentPlan === planKey;

  const btnClass = (planKey: string) =>
    `btn-plan ${currentPlan === planKey ? "btn-plan-current" : ""}`;

  return (
    <main className="app-container">
      <section className="pricing-root">
        <header className="pricing-header">
          <h1 className="pricing-title">
            Choisissez le plan adapté à votre pratique
          </h1>
          <p className="pricing-subtitle">
            Tous les plans sont pensés pour s&apos;adapter à votre niveau de
            pratique, de la découverte aux accompagnements professionnels
            réguliers.
          </p>
        </header>

        <div className="pricing-grid">
          {/* Plan 1 – Découverte */}
          <article className="pricing-card">
            <div className="pricing-card-header">
              <h2 className="pricing-name">Découverte</h2>
              <p className="pricing-price">0&nbsp;€/mois</p>
            </div>

            <ul className="pricing-features">
              <li className="pricing-feature-highlight">Résumé numérologique</li>
              <li>Profil synthétique</li>
              <li>Sans PDF</li>
              <li>Usage personnel</li>
            </ul>

            <button className={btnClass("free")} disabled={btnDisabled("free")}>
              {btnText("free")}
            </button>
          </article>

          {/* Plan 2 – Essentiel (mise en avant) */}
          <article className="pricing-card pricing-card-featured">
            <div className="pricing-card-header">
              <p className="pricing-tagline">Idéal pour démarrer</p>
              <h2 className="pricing-name">Essentiel</h2>
              <p className="pricing-price">19,99&nbsp;€/mois</p>
            </div>

            <ul className="pricing-features">
              <li className="pricing-feature-highlight">1 thème complet / mois</li>
              <li>Accès au texte complet</li>
              <li>Téléchargement PDF</li>
              <li>Historique des thèmes</li>
            </ul>

            <button
              className={btnClass("essentiel")}
              disabled={btnDisabled("essentiel")}
              onClick={() => startCheckout("essentiel")}
            >
              {btnText("essentiel")}
            </button>
          </article>

          {/* Plan 3 – Praticien */}
          <article className="pricing-card">
            <div className="pricing-card-header">
              <h2 className="pricing-name">Praticien</h2>
              <p className="pricing-price">49,99&nbsp;€/mois</p>
            </div>

            <ul className="pricing-features">
              <li className="pricing-feature-highlight">5 thèmes complets / mois</li>
              <li>PDF inclus</li>
              <li>Usage professionnel autorisé</li>
              <li>Historique illimité</li>
            </ul>

            <button
              className={btnClass("praticien")}
              disabled={btnDisabled("praticien")}
              onClick={() => startCheckout("praticien")}
            >
              {btnText("praticien")}
            </button>
          </article>

          {/* Plan 4 – Pro Illimité */}
          <article className="pricing-card">
            <div className="pricing-card-header">
              <h2 className="pricing-name">Pro Illimité</h2>
              <p className="pricing-price">149,99&nbsp;€/mois</p>
            </div>

            <ul className="pricing-features">
              <li className="pricing-feature-highlight">Thèmes complets illimités</li>
              <li>PDF inclus</li>
              <li>Usage professionnel autorisé</li>
              <li>Historique illimité &amp; support prioritaire</li>
            </ul>

            <button
              className={btnClass("pro_illimite")}
              disabled={btnDisabled("pro_illimite")}
              onClick={() => startCheckout("pro_illimite")}
            >
              {btnText("pro_illimite")}
            </button>
          </article>
        </div>

        <p className="pricing-note">
          Gardez le contrôle sur votre abonnement, ajustez ou arrêtez le à
          n&apos;importe quel moment.
        </p>
      </section>
    </main>
  );
};

export default PricingPage;
