// web/src/pages/ProfilePage.tsx
import { useEffect, useMemo, useState } from "react";
import { getMe, type MeResponse } from "../api";

type TabKey = "profile" | "plan" | "history";

type ViewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: MeResponse };

function formatPlan(plan: string) {
  const p = (plan || "").toLowerCase();

  if (p === "free") {
    return { name: "Découverte (gratuit)", limit: 1, price: "0 € / mois" };
  }
  if (p === "essentiel") {
    return { name: "Essentiel", limit: 1, price: "19,99 € / mois" };
  }
  if (p === "praticien") {
    return { name: "Praticien", limit: 5, price: "49,99 € / mois" };
  }
  if (p === "pro") {
    return { name: "Pro Illimité", limit: "Illimité" as const, price: "149,99 € / mois" };
  }

  return { name: plan || "Inconnu", limit: "?" as const, price: "—" };
}

function logoutAndRedirect() {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("user");
  window.location.href = "/signin";
}

export default function ProfilePage() {
  const [tab, setTab] = useState<TabKey>("profile");
  const [state, setState] = useState<ViewState>({ status: "loading" });

  useEffect(() => {
    // Si pas de token, inutile d'appeler /me
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setState({ status: "error", message: "Tu n’es pas connecté." });
      return;
    }

    getMe()
      .then((data) => setState({ status: "ready", data }))
      .catch((e: unknown) => {
        const message = e instanceof Error ? e.message : "Erreur inconnue.";
        setState({ status: "error", message });
      });
  }, []);

  const content = useMemo(() => {
    if (state.status !== "ready") return null;
    const { user, history } = state.data;
    const planInfo = formatPlan(user.plan);

    if (tab === "profile") {
      return (
        <div className="profile-panel">
          <div className="profile-row">
            <span className="profile-label">Prénom</span>
            <span className="profile-value">{user.firstName}</span>
          </div>
          <div className="profile-row">
            <span className="profile-label">Nom</span>
            <span className="profile-value">{user.lastName}</span>
          </div>
          <div className="profile-row">
            <span className="profile-label">Email</span>
            <span className="profile-value">{user.email}</span>
          </div>
        </div>
      );
    }

    if (tab === "plan") {
      return (
        <div className="profile-panel">
          <div className="profile-row">
            <span className="profile-label">Plan actif</span>
            <span className="profile-value">{planInfo.name}</span>
          </div>

          <div className="profile-row">
            <span className="profile-label">Générations / mois</span>
            <span className="profile-value">
              {typeof planInfo.limit === "string" ? planInfo.limit : planInfo.limit}
            </span>
          </div>

          <div className="profile-row">
            <span className="profile-label">Prix</span>
            <span className="profile-value">{planInfo.price}</span>
          </div>
        </div>
      );
    }

    // history
    return (
      <div className="profile-panel">
        {history.length === 0 ? (
          <p>Aucune génération pour le moment.</p>
        ) : (
          <div className="history-list">
            {history.map((h, idx) => (
              <div className="history-item" key={`${h.date}-${idx}`}>
                <div className="history-main">
                  <div className="history-title">{h.label}</div>
                  <div className="history-date">
                    {new Date(h.date).toLocaleString()}
                  </div>
                </div>
                <div className="history-tag">
                  {h.type === "summary" ? "Gratuit" : "Complet"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }, [state, tab]);

  if (state.status === "loading") {
    return (
      <div className="app-container">
        <section className="card">
          <div className="theme-header">
            <h2>Mon profil</h2>
            <button type="button" onClick={logoutAndRedirect}>
              Se déconnecter
            </button>
          </div>
          <p>Chargement...</p>
        </section>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="app-container">
        <section className="card">
          <div className="theme-header">
            <h2>Mon profil</h2>
            <button type="button" onClick={logoutAndRedirect}>
              Se déconnecter
            </button>
          </div>
          <p className="error-message">Erreur : {state.message}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="app-container">
      <section className="card">
        <div className="theme-header">
          <h2>Mon profil</h2>
          <button type="button" onClick={logoutAndRedirect}>
            Se déconnecter
          </button>
        </div>

        <div className="profile-tabs">
          <button
            type="button"
            className={`profile-tab ${tab === "profile" ? "active" : ""}`}
            onClick={() => setTab("profile")}
          >
            Profil Utilisateur
          </button>
          <button
            type="button"
            className={`profile-tab ${tab === "plan" ? "active" : ""}`}
            onClick={() => setTab("plan")}
          >
            Plan en cours
          </button>
          <button
            type="button"
            className={`profile-tab ${tab === "history" ? "active" : ""}`}
            onClick={() => setTab("history")}
          >
            Historique de génération
          </button>
        </div>

        {content}
      </section>
    </div>
  );
}
