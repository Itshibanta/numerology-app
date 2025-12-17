import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

type CurrentPlanState = { status: "loading" | "ready"; plan: string | null };

function normalizeToken(raw: string | null) {
  if (!raw) return null;

  let t = raw.trim();
  t = t.replace(/^Bearer\s+/i, "").trim();

  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    t = t.slice(1, -1).trim();
  }

  if (!t.includes(".") || t.length < 30) return null;
  return t;
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

async function fetchCurrentPlan(): Promise<string | null> {
  const token = normalizeToken(localStorage.getItem("auth_token"));
  if (!token) return null;

  const res = await fetch(`${API_BASE}/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return null;

  const data = await res.json().catch(() => null);
  const plan = data?.user?.plan;

  // ✅ Sync localStorage.user pour tes pages qui lisent encore ça
  if (data?.user) {
    localStorage.setItem("user", JSON.stringify(data.user));
  }

  return typeof plan === "string" ? plan.toLowerCase() : null;
}

async function startCheckout(planKey: string) {
  const token = normalizeToken(localStorage.getItem("auth_token"));

  if (!token) {
    localStorage.removeItem("auth_token");
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
    if (data?.error === "INVALID_TOKEN" || res.status === 401) {
      localStorage.removeItem("auth_token");
      window.location.href = "/signin";
      return;
    }

    alert(data?.error || "Erreur paiement. Réessayez.");
    return;
  }

  if (!data?.url) {
    alert("Checkout indisponible. Réessayez.");
    return;
  }

  window.location.href = data.url;
}

const PricingPage = () => {
  const [currentPlan, setCurrentPlan] = useState<CurrentPlanState>({
    status: "loading",
    plan: getCurrentPlan(),
  });

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      const plan = await fetchCurrentPlan();
      if (!cancelled) setCurrentPlan({ status: "ready", plan });
    };

    refresh();

    // ✅ si l’utilisateur revient sur l’onglet, on re-sync (webhook async)
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const plan = currentPlan.plan;
  const isAuthed = Boolean(normalizeToken(localStorage.getItem("auth_token")));
  const isCurrent = (planKey: string) => isAuthed && plan === planKey;

  const btnText = (planKey: string) =>
    isCurrent(planKey) ? "Plan actuel" : "Choisir ce plan";

const btnDisabled = (planKey: string) => isCurrent(planKey);

const btnClass = (planKey: string) =>
  isCurrent(planKey) ? "btn-plan-current" : "btn-plan";


  return (
    <main className="app-container">
      <section className="pricing-root">
        <header className="pricing-header">
          <h1 className="pricing-title">Choisissez le plan adapté à votre pratique</h1>
          <p className="pricing-subtitle">
            Tous les plans sont pensés pour s&apos;adapter à votre niveau de pratique,
            de la découverte aux accompagnements professionnels réguliers.
          </p>
        </header>

        <div className="pricing-grid">
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
          Gardez le contrôle sur votre abonnement, ajustez ou arrêtez le à n&apos;importe quel moment.
        </p>
      </section>
    </main>
  );
};

export default PricingPage;
