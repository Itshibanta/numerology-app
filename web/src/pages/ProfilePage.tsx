// web/src/pages/ProfilePage.tsx
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getMe, getGeneration, type MeResponse } from "../api";
import { jsPDF } from "jspdf";

type TabKey = "profile" | "plan" | "history";

type ViewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: MeResponse };

function formatPlan(plan: string) {
  const p = (plan || "").toLowerCase();

  if (p === "free")
    return { name: "Découverte (gratuit)", limit: 1, price: "0 € / mois" };
  if (p === "essentiel")
    return { name: "Essentiel", limit: 1, price: "19,99 € / mois" };
  if (p === "praticien")
    return { name: "Praticien", limit: 5, price: "49,99 € / mois" };
  if (p === "pro_illimite" || p === "pro")
    return {
      name: "Pro Illimité",
      limit: "Illimité" as const,
      price: "149,99 € / mois",
    };

  return { name: plan || "Inconnu", limit: "?" as const, price: "—" };
}

function logoutAndRedirect() {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("user");
  window.location.href = "/signin";
}

function downloadPDF(title: string, content: string) {
  const doc = new jsPDF("p", "mm", "a4");

  const marginX = 16;
  const marginY = 18;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - marginX * 2;

  let y = marginY;

  const newPageIfNeeded = (extra = 0) => {
    if (y + extra > pageHeight - marginY) {
      doc.addPage();
      y = marginY;
    }
  };

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, marginX, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  const lines = (content || "").split("\n");

  for (const raw of lines) {
    const line = raw.trim();

    if (!line) {
      y += 4;
      continue;
    }

    // === TITRE ===
    if (/^=+.*=+$/.test(line)) {
      const clean = line.replace(/^=+/, "").replace(/=+$/, "").trim();
      newPageIfNeeded(10);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(clean, marginX, y);
      y += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      continue;
    }

    // --- Sous-titre ---
    if (/^-+.*-+$/.test(line)) {
      const clean = line.replace(/^-+/, "").replace(/-+$/, "").trim();
      newPageIfNeeded(8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(clean, marginX, y);
      y += 7;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      continue;
    }

    // Texte normal (wrap + pages)
    const wrapped = doc.splitTextToSize(line, maxWidth);
    for (const w of wrapped) {
      newPageIfNeeded(6);
      doc.text(w, marginX, y);
      y += 6;
    }
  }

  doc
    .save(`${(title || "theme").replace(/\s+/g, "_").toLowerCase()}.pdf`);
}

export default function ProfilePage() {
  const [tab, setTab] = useState<TabKey>("profile");
  const [state, setState] = useState<ViewState>({ status: "loading" });
  const [params] = useSearchParams();

  // modal states
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<string>("");
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  async function openGeneration(id: string) {
    setModalLoading(true);
    setModalError(null);
    try {
      const gen = await getGeneration(id);
      setSelectedTitle(gen.label || "Génération");
      setSelectedText(gen.result_text || "");
    } catch (e: any) {
      setModalError(e?.message || "Impossible de charger la génération.");
      setSelectedText("");
    } finally {
      setModalLoading(false);
    }
  }

  // ✅ Gérer / annuler l'abonnement via Stripe Billing Portal
  async function handleManageSubscription() {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        alert("Tu dois être connecté pour gérer ton abonnement.");
        return;
      }

      const baseUrl = import.meta.env.VITE_API_URL || "";
      const url = baseUrl
        ? `${baseUrl}/stripe/create-portal-session`
        : "/stripe/create-portal-session";

      console.log("[PORTAL] Calling:", url);

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const text = await res.text();
      console.log("[PORTAL] Raw response:", res.status, text);

      let data: any = null;
      try {
        data = text ? JSON.parse(text) : {};
      } catch (parseErr) {
        console.error("[PORTAL] JSON parse error:", parseErr);
        throw new Error(
          "Réponse invalide du serveur (pas du JSON). " +
            text.slice(0, 200)
        );
      }

      if (!res.ok || !data?.url) {
        console.error("[PORTAL] Error payload:", data);
        alert(
          data?.error === "NO_STRIPE_CUSTOMER"
            ? "Aucun abonnement Stripe n’est rattaché à ce compte."
            : "Impossible d’ouvrir la page de gestion d’abonnement pour le moment."
        );
        return;
      }

      // Redirection vers Stripe (gestion / annulation)
      window.location.href = data.url;
    } catch (e: any) {
      console.error("PORTAL_SESSION_FAILED (front):", e);
      alert("Erreur lors de l’ouverture de la page d’abonnement.");
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setState({ status: "error", message: "Tu n’es pas connecté." });
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const data = await getMe();
        if (cancelled) return;
        setState({ status: "ready", data });
        localStorage.setItem("user", JSON.stringify(data.user));
      } catch (e: unknown) {
        if (cancelled) return;
        const message =
          e instanceof Error ? e.message : "Erreur inconnue.";
        setState({ status: "error", message });
      }
    };

    load();

    if (params.get("checkout") === "success") {
      const t1 = setTimeout(load, 1500);
      const t2 = setTimeout(load, 3500);
      const t3 = setTimeout(load, 6000);

      return () => {
        cancelled = true;
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }

    return () => {
      cancelled = true;
    };
  }, [params]);

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
              {typeof planInfo.limit === "string"
                ? planInfo.limit
                : planInfo.limit}
            </span>
          </div>

          <div className="profile-row">
            <span className="profile-label">Prix</span>
            <span className="profile-value">{planInfo.price}</span>
          </div>

          {/* Bouton gestion / annulation abonnement : uniquement si plan ≠ free */}
          {user.plan !== "free" && (
            <div className="profile-subscription-actions">
              <button
                type="button"
                className="profile-portal-button"
                onClick={handleManageSubscription}
              >
                Gérer mon abonnement
              </button>
            </div>
          )}
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
              <div
                className="history-item"
                key={h.id || `${h.date}-${idx}`}
              >
                <div className="history-main">
                  <div className="history-title">{h.label}</div>
                  <div className="history-date">
                    {new Date(h.date).toLocaleString()}
                  </div>
                </div>

                <div
                  className="history-tag"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: 8,
                  }}
                >
                  <div>
                    {h.type === "summary" ? "Gratuit" : "Complet"}
                  </div>

                  {h.type === "theme" && (
                    <button
                      type="button"
                      className="auth-btn"
                      style={{
                        padding: "8px 12px",
                        width: "fit-content",
                      }}
                      onClick={async () => {
                        const gen = await getGeneration(h.id);
                        downloadPDF(
                          gen.label || "Thème numérologique",
                          gen.result_text || ""
                        );
                      }}
                    >
                      Télécharger (PDF)
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }, [state, tab, handleManageSubscription]);

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
            className={`profile-tab ${
              tab === "profile" ? "active" : ""
            }`}
            onClick={() => setTab("profile")}
          >
            Profil Utilisateur
          </button>
          <button
            type="button"
            className={`profile-tab ${
              tab === "plan" ? "active" : ""
            }`}
            onClick={() => setTab("plan")}
          >
            Plan en cours
          </button>
          <button
            type="button"
            className={`profile-tab ${
              tab === "history" ? "active" : ""
            }`}
            onClick={() => setTab("history")}
          >
            Historique de génération
          </button>
        </div>

        {content}
      </section>

      {/* Modal */}
      {selectedText !== null && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 9999,
          }}
          onClick={() => setSelectedText(null)}
        >
          <div
            style={{
              background: "white",
              borderRadius: 12,
              maxWidth: 800,
              width: "100%",
              maxHeight: "80vh",
              overflow: "auto",
              padding: 16,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <h3 style={{ margin: 0 }}>{selectedTitle}</h3>
              <button
                type="button"
                onClick={() => setSelectedText(null)}
              >
                Fermer
              </button>
            </div>

            {modalLoading ? (
              <p>Chargement…</p>
            ) : modalError ? (
              <p className="auth-error">{modalError}</p>
            ) : (
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  marginTop: 12,
                }}
              >
                {selectedText}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
