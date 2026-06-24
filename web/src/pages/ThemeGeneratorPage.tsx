// web/src/pages/ThemeGeneratorPage.tsx
import { useState, useEffect } from "react";
import type { ChangeEvent } from "react";
import { createOneShotSession } from "../api";
import "../theme-page.css";

type FormData = {
  prenom: string;
  secondPrenom: string;
  nomFamille: string;
  nomMarital: string;
  dateNaissance: string;
  villeNaissance: string;
  paysNaissance: string;
};

export default function ThemeGeneratorPage() {
  const [form, setForm] = useState<FormData>({
    prenom: "",
    secondPrenom: "",
    nomFamille: "",
    nomMarital: "",
    dateNaissance: "",
    villeNaissance: "",
    paysNaissance: "",
  });

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchased, setPurchased] = useState(false);

  // Retour depuis Stripe Checkout
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("purchase") === "success") {
      setPurchased(true);
      window.scrollTo({ top: 0 });
    } else if (p.get("purchase") === "cancel") {
      setError("Paiement annulé. Vous pouvez réessayer quand vous voulez.");
    }
  }, []);

  function formatDateNaissance(raw: string): string {
    let v = raw.replace(/\D/g, "").slice(0, 8);
    if (v.length >= 5) {
      v = v.replace(/(\d{2})(\d{2})(\d{1,4})/, "$1/$2/$3");
    } else if (v.length >= 3) {
      v = v.replace(/(\d{2})(\d{1,2})/, "$1/$2");
    }
    return v;
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    const nextValue = name === "dateNaissance" ? formatDateNaissance(value) : value;
    setForm((prev) => ({ ...prev, [name]: nextValue }));
  }

  async function handlePay() {
    setError(null);

    if (!form.prenom || !form.nomFamille || !form.dateNaissance || !email) {
      setError(
        "Le prénom, le nom de famille, la date de naissance et l'email sont obligatoires."
      );
      return;
    }

    setLoading(true);
    try {
      const lieuNaissance = [form.villeNaissance, form.paysNaissance]
        .filter(Boolean)
        .join(", ");

      const url = await createOneShotSession({
        prenom: form.prenom,
        secondPrenom: form.secondPrenom,
        nomFamille: form.nomFamille,
        nomMarital: form.nomMarital,
        dateNaissance: form.dateNaissance,
        lieuNaissance,
        email,
      });

      // Redirection vers la page de paiement sécurisée Stripe
      window.location.href = url;
    } catch (err: any) {
      setError(err?.message || "Impossible de démarrer le paiement.");
      setLoading(false);
    }
  }

  /* ---------- Vue confirmation (retour de Stripe) ---------- */
  if (purchased) {
    return (
      <>
        <div style={{ background: "var(--cream-warm)", padding: "2rem 0 0" }}>
          <div className="container">
            <h1 style={{ marginBottom: "0.4rem" }}>Merci pour votre commande</h1>
            <p style={{ maxWidth: 600, marginBottom: 0, paddingBottom: "1.5rem" }}>
              Votre paiement a bien été reçu.
            </p>
          </div>
        </div>

        <div className="theme-page-layout">
          <div>
            <div className="stepper">
              <div className="step-tab"><span className="step-num">1</span> Vos informations</div>
              <div className="step-tab"><span className="step-num">2</span> Paiement</div>
              <div className="step-tab active"><span className="step-num">3</span> Confirmation</div>
            </div>

            <div className="form-card-large">
              <div className="confirmation-box">
                <div className="confirmation-icon">✨</div>
                <h2>Votre thème numérologique est en cours de préparation</h2>
                <p>
                  Notre numérologue calcule et rédige votre analyse personnalisée.
                  Vous recevrez votre thème complet <strong>dans les 24 heures</strong>.
                </p>
                <p>
                  Un email vient de vous être envoyé à <strong>{email || "votre adresse"}</strong>{" "}
                  pour <strong>créer votre mot de passe</strong> et accéder à votre espace
                  personnel, où votre thème et son PDF seront disponibles.
                </p>
                <p style={{ fontSize: "0.85rem", color: "var(--brown-muted)", marginTop: "1rem" }}>
                  Pensez à vérifier vos spams si vous ne voyez pas l'email d'ici quelques minutes.
                </p>
                <div style={{ marginTop: "1.5rem" }}>
                  <a href="/signin" className="btn btn-primary">Accéder à mon espace</a>
                </div>
              </div>
            </div>
          </div>

          <ThemeSidebar />
        </div>
      </>
    );
  }

  /* ---------- Vue formulaire + paiement ---------- */
  return (
    <>
      <div style={{ background: "var(--cream-warm)", padding: "2rem 0 0" }}>
        <div className="container">
          <h1 style={{ marginBottom: "0.4rem" }}>Générez votre thème numérologique</h1>
          <p style={{ maxWidth: 600, marginBottom: 0, paddingBottom: "1.5rem" }}>
            Remplissez votre état civil complet pour que nous puissions calculer votre
            analyse personnalisée. Plus les informations sont précises, plus le portrait
            est juste.
          </p>
        </div>
      </div>

      <div className="theme-page-layout">
        <div>
          <div className="stepper">
            <div className="step-tab active"><span className="step-num">1</span> Vos informations</div>
            <div className="step-tab"><span className="step-num">2</span> Paiement</div>
            <div className="step-tab"><span className="step-num">3</span> Confirmation</div>
          </div>

          <div className="form-card-large">
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="prenom">Prénom <span style={{ color: "#b04747" }}>*</span></label>
                <input id="prenom" name="prenom" type="text" value={form.prenom} onChange={handleChange} placeholder="Votre prénom usuel" autoComplete="given-name" />
              </div>
              <div className="form-group">
                <label htmlFor="secondPrenom">Second(s) prénom(s)</label>
                <input id="secondPrenom" name="secondPrenom" type="text" value={form.secondPrenom} onChange={handleChange} placeholder="Optionnel" />
              </div>
              <div className="form-group">
                <label htmlFor="nomFamille">Nom de famille (naissance) <span style={{ color: "#b04747" }}>*</span></label>
                <input id="nomFamille" name="nomFamille" type="text" value={form.nomFamille} onChange={handleChange} placeholder="Nom de naissance" autoComplete="family-name" />
              </div>
              <div className="form-group">
                <label htmlFor="nomMarital">Nom marital</label>
                <input id="nomMarital" name="nomMarital" type="text" value={form.nomMarital} onChange={handleChange} placeholder="Optionnel" />
              </div>
              <div className="form-group">
                <label htmlFor="dateNaissance">Date de naissance <span style={{ color: "#b04747" }}>*</span></label>
                <input id="dateNaissance" name="dateNaissance" type="text" value={form.dateNaissance} onChange={handleChange} inputMode="numeric" maxLength={10} placeholder="JJ/MM/AAAA" />
              </div>
              <div className="form-group">
                <label htmlFor="villeNaissance">Ville de naissance</label>
                <input id="villeNaissance" name="villeNaissance" type="text" value={form.villeNaissance} onChange={handleChange} placeholder="Optionnel" />
              </div>
              <div className="form-group">
                <label htmlFor="paysNaissance">Pays de naissance</label>
                <input id="paysNaissance" name="paysNaissance" type="text" value={form.paysNaissance} onChange={handleChange} placeholder="Optionnel" />
              </div>
              <div className="form-group">
                <label htmlFor="email">Adresse email <span style={{ color: "#b04747" }}>*</span></label>
                <input id="email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votre@email.fr" autoComplete="email" />
              </div>
            </div>

            <div style={{ marginTop: "2rem" }}>
              <button type="button" onClick={handlePay} disabled={loading} className="btn btn-primary btn-lg" style={{ width: "100%", justifyContent: "center" }}>
                {loading ? "Redirection vers le paiement..." : "Payer 59,90 € et recevoir mon thème"}
              </button>
            </div>

            {error && <p style={{ color: "#b04747", marginTop: "1rem" }}>{error}</p>}

            <div className="stripe-badge" style={{ justifyContent: "center", marginTop: "1rem" }}>
              🔒 Paiement sécurisé par Stripe — vos données bancaires ne nous sont jamais transmises
            </div>
            <p style={{ marginTop: "0.8rem", fontSize: "0.83rem", color: "var(--brown-muted)", textAlign: "center" }}>
              Vos données d'état civil servent uniquement à générer votre thème. Aucune revente.
            </p>
          </div>
        </div>

        <ThemeSidebar />
      </div>
    </>
  );
}

function ThemeSidebar() {
  return (
    <aside className="theme-sidebar">
      <div className="sidebar-card">
        <h4>Ce que vous allez recevoir</h4>
        <div className="sidebar-feature"><span className="icon">✓</span><p><strong>Portrait psychologique complet</strong>, votre caractère profond, vos forces, vos zones d'ombre</p></div>
        <div className="sidebar-feature"><span className="icon">✓</span><p><strong>Mission de vie</strong>, ce que votre chemin de vie révèle sur votre direction profonde</p></div>
        <div className="sidebar-feature"><span className="icon">✓</span><p><strong>Vos nombres essentiels</strong>, Expression, Actif, Héréditaire, de l'Âme</p></div>
        <div className="sidebar-feature"><span className="icon">✓</span><p><strong>Cycles &amp; Pinnacles</strong>, les grandes phases de votre vie</p></div>
        <div className="sidebar-feature"><span className="icon">✓</span><p><strong>Année personnelle 2026</strong>, l'énergie de votre cycle actuel</p></div>
        <div className="sidebar-feature"><span className="icon">✓</span><p><strong>Nombres karmiques</strong>, les défis récurrents à comprendre</p></div>
        <div className="trust-strip">
          <div className="trust-item">🔒 Données 100% confidentielles</div>
          <div className="trust-item">✉️ Livraison sous 24h</div>
          <div className="trust-item">⭐ Analyses rédigées par une numérologue</div>
        </div>
      </div>

      <a href="/exemple-theme-numerologique/" className="btn btn-ghost" style={{ width: "100%", justifyContent: "center", fontSize: "0.88rem" }}>
        Voir un exemple de thème
      </a>
    </aside>
  );
}
