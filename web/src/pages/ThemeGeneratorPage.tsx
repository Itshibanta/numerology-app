// web/src/pages/ThemeGeneratorPage.tsx
import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { ApiError, generateTheme } from "../api";
import { jsPDF } from "jspdf";

type FormData = {
  prenom: string;
  secondPrenom: string;
  nomFamille: string;
  nomMarital: string;
  dateNaissance: string;
  villeNaissance: string;
  paysNaissance: string;
  lieuNaissance: string;
  heureNaissance: string;
};

type Block =
  | { type: "h1"; title: string }
  | { type: "h2"; title: string }
  | { type: "text"; content: string };

function parseThemeBlocks(raw: string): Block[] {
  const lines = raw.split("\n");
  const blocks: Block[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("===") && trimmed.endsWith("===")) {
      blocks.push({ type: "h1", title: trimmed.replace(/===/g, "").trim() });
      continue;
    }

    if (trimmed.startsWith("---") && trimmed.endsWith("---")) {
      blocks.push({ type: "h2", title: trimmed.replace(/---/g, "").trim() });
      continue;
    }

    blocks.push({ type: "text", content: line });
  }

  if (blocks.length === 0 && raw.trim()) {
    blocks.push({ type: "text", content: raw.trim() });
  }

  return blocks;
}

function downloadPdf(title: string, content: string) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;
  const maxWidth = pageWidth - margin * 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, margin, 72);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  const lines = doc.splitTextToSize(content || "", maxWidth);
  doc.text(lines, margin, 96, { maxWidth });

  doc.save(`${title.replace(/\s+/g, "_").toLowerCase()}.pdf`);
}

export default function ThemeGeneratorPage() {
  const [form, setForm] = useState<FormData>({
    prenom: "",
    secondPrenom: "",
    nomFamille: "",
    nomMarital: "",
    dateNaissance: "",
    villeNaissance: "",
    paysNaissance: "",
    lieuNaissance: "",
    heureNaissance: "",
  });

  const [theme, setTheme] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAuthModal, setShowAuthModal] = useState(false);

  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [quotaInfo, setQuotaInfo] = useState<{
    count?: number;
    limit?: number;
    month?: string;
  } | null>(null);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setTheme("");

    // ✅ Blocage front : pas de token => popup + stop
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setShowAuthModal(true);
      return;
    }

    setLoading(true);

    try {
      if (!form.prenom || !form.nomFamille || !form.dateNaissance) {
        throw new Error(
          "Le prénom, le nom de famille et la date de naissance sont obligatoires."
        );
      }

      const lieuNaissanceCombine = [form.villeNaissance, form.paysNaissance]
        .filter(Boolean)
        .join(", ");

      const payload = {
        prenom: form.prenom,
        secondPrenom: form.secondPrenom,
        nomFamille: form.nomFamille,
        nomMarital: form.nomMarital,
        dateNaissance: form.dateNaissance,
        lieuNaissance: lieuNaissanceCombine,
        heureNaissance: form.heureNaissance,
      };

      const result = await generateTheme(payload);

      setTheme(typeof result === "string" ? result : JSON.stringify(result, null, 2));
    } catch (err: any) {
      if (err instanceof ApiError && err.code === "QUOTA_EXCEEDED") {
        setQuotaInfo(err.meta || null);
        setShowQuotaModal(true);
        setError(null);
        return;
      }

      if (err instanceof ApiError && err.code === "AUTH_REQUIRED") {
        setShowAuthModal(true);
        return;
      }

      setError(err?.message || "Erreur inconnue.");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!theme) return;
    navigator.clipboard.writeText(theme).catch(() => {
      setError("Impossible de copier dans le presse-papiers.");
    });
  }

  return (
    <div className="app-container">
      {/* MODAL AUTH REQUIRED */}
      {showAuthModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setShowAuthModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Compte requis</h3>
            <p>Pour générer votre thème numérologique, vous devez créer un compte.</p>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-plan"
                onClick={() => (window.location.href = "/signup")}
              >
                Créer un compte
              </button>

              <button
                type="button"
                className="btn-plan btn-plan-secondary"
                onClick={() => (window.location.href = "/signin")}
              >
                Se connecter
              </button>

              <button
                type="button"
                className="btn-plan btn-plan-secondary"
                onClick={() => setShowAuthModal(false)}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL QUOTA */}
      {showQuotaModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setShowQuotaModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Quota mensuel atteint</h3>
            <p>
              Tu as utilisé {quotaInfo?.count ?? 1} / {quotaInfo?.limit ?? 1} génération(s) sur cette période d'abonnement.
            </p>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-plan"
                onClick={() => (window.location.href = "/pricing")}
              >
                Voir les tarifs
              </button>

              <button
                type="button"
                className="btn-plan btn-plan-secondary"
                onClick={() => setShowQuotaModal(false)}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="app-header">
        <h1>Générateur de Thème Numérologique</h1>
        <p>
          Renseigne ton état civil, puis clique sur <strong>Générer mon thème</strong>.
        </p>
      </header>

      <section className="card">
        <h2>Informations d&apos;état civil</h2>

        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="prenom">Prénom *</label>
            <input
              id="prenom"
              name="prenom"
              type="text"
              value={form.prenom}
              onChange={handleChange}
              required
              placeholder="Prénom"
            />
          </div>

          <div className="form-group">
            <label htmlFor="secondPrenom">Second prénom(s)</label>
            <input
              id="secondPrenom"
              name="secondPrenom"
              type="text"
              value={form.secondPrenom}
              onChange={handleChange}
              placeholder="Optionnel"
            />
          </div>

          <div className="form-group">
            <label htmlFor="nomFamille">Nom de famille *</label>
            <input
              id="nomFamille"
              name="nomFamille"
              type="text"
              value={form.nomFamille}
              onChange={handleChange}
              required
              placeholder="Nom de famille"
            />
          </div>

          <div className="form-group">
            <label htmlFor="nomMarital">Nom Marital</label>
            <input
              id="nomMarital"
              name="nomMarital"
              type="text"
              value={form.nomMarital}
              onChange={handleChange}
              placeholder="Optionnel"
            />
          </div>

          <div className="form-group">
            <label htmlFor="dateNaissance">Date de naissance *</label>
            <input
              id="dateNaissance"
              name="dateNaissance"
              type="text"
              value={form.dateNaissance}
              onChange={handleChange}
              placeholder="JJ/MM/AAAA"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="villeNaissance">Ville de naissance</label>
            <input
              id="villeNaissance"
              name="villeNaissance"
              type="text"
              value={form.villeNaissance}
              onChange={handleChange}
              placeholder="Paris"
            />
          </div>

          <div className="form-group">
            <label htmlFor="paysNaissance">Pays de naissance</label>
            <input
              id="paysNaissance"
              name="paysNaissance"
              type="text"
              value={form.paysNaissance}
              onChange={handleChange}
              placeholder="France"
            />
          </div>

          <div className="form-group">
            <label htmlFor="heureNaissance">Heure de naissance</label>
            <input
              id="heureNaissance"
              name="heureNaissance"
              type="text"
              value={form.heureNaissance}
              onChange={handleChange}
              placeholder="HH:MM (si connue)"
            />
          </div>

          <div className="form-actions">
            <button type="submit" disabled={loading}>
              {loading ? "Génération en cours..." : "Générer mon thème"}
            </button>
          </div>
        </form>

        {error && <p className="error-message">Erreur : {error}</p>}
      </section>

      <section className="card">
        <div className="theme-header">
          <h2>Thème numérologique</h2>
          <button type="button" onClick={handleCopy} disabled={!theme || loading}>
            Copier le thème
          </button>
          <button
            className="auth-btn"
            onClick={() => downloadPdf("Theme numerologique", theme)}
          >
            Télécharger (PDF)
          </button>

        </div>

        {loading && !theme && (
          <p className="theme-placeholder">
            Génération du thème en cours, quelques secondes...
          </p>
        )}

        {!loading && !theme && !error && (
          <p className="theme-placeholder">
            Le thème s&apos;affichera ici après la génération.
          </p>
        )}

        {theme && (
          <div className="theme-render">
            {parseThemeBlocks(theme).map((b, i) => {
              if (b.type === "h1") return <div key={i} className="theme-h1">{b.title}</div>;
              if (b.type === "h2") return <div key={i} className="theme-h2">{b.title}</div>;
              return <p key={i} className="theme-text">{b.content}</p>;
            })}
          </div>
        )}
      </section>
    </div>
  );
}
