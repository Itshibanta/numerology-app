// web/src/pages/FreeThemeGeneratorPage.tsx
import { useState, useEffect } from "react";
import type { ChangeEvent } from "react";
import { generateFreeTheme, setFreePassword } from "../api";
import { supabase } from "../supabaseClient";
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

export default function FreeThemeGeneratorPage() {
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

  const [done, setDone] = useState(false);
  const [accountExists, setAccountExists] = useState(false);
  const [claimToken, setClaimToken] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Création du mot de passe (compte neuf uniquement)
  const [password, setPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwDone, setPwDone] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsLoggedIn(!!data.session);
    });
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

  async function handleGenerate() {
    setError(null);
    if (!form.prenom || !form.nomFamille || !form.dateNaissance || !email) {
      setError("Tous les champs contenant une * doivent être remplis");
      return;
    }
    setLoading(true);
    try {
      const lieuNaissance = [form.villeNaissance, form.paysNaissance]
        .filter(Boolean)
        .join(", ");

      const r = await generateFreeTheme({
        prenom: form.prenom,
        secondPrenom: form.secondPrenom,
        nomFamille: form.nomFamille,
        nomMarital: form.nomMarital,
        dateNaissance: form.dateNaissance,
        lieuNaissance,
        email,
      });

      setAccountExists(r.accountExists);
      setClaimToken(r.claimToken);
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setError(err?.message || "Impossible de générer votre thème gratuit.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePassword() {
    setPwError(null);
    if (!password || password.length < 8) {
      setPwError("Votre mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (!claimToken) {
      setPwError("Lien expiré. Utilisez « Mot de passe oublié » depuis la page de connexion.");
      return;
    }
    setPwLoading(true);
    try {
      await setFreePassword(email, claimToken, password);
      setPwDone(true);
    } catch (err: any) {
      setPwError(err?.message || "Impossible de créer le mot de passe.");
    } finally {
      setPwLoading(false);
    }
  }

  // L'option mot de passe n'est proposée que pour un compte NEUF
  // (non connecté ET email pas déjà en base).
  const showPasswordStep = !isLoggedIn && !accountExists && !!claimToken;

  /* ---------- Vue confirmation ---------- */
  if (done) {
    return (
      <>
        <div style={{ background: "var(--cream-warm)", padding: "2rem 0 0" }}>
          <div className="container">
            <h1 style={{ marginBottom: "0.4rem" }}>Votre thème gratuit est prêt</h1>
            <p style={{ maxWidth: 600, marginBottom: 0, paddingBottom: "1.5rem" }}>
              Merci ! Votre résumé numérologique a bien été généré.
            </p>
          </div>
        </div>

        <div className="theme-page-layout">
          <div className="stepper">
            <div className="step-tab"><span className="step-num">1</span> Vos informations</div>
            <div className="step-tab active"><span className="step-num">2</span> Confirmation</div>
          </div>

          <div>
            <div className="form-card-large">
              <div className="confirmation-box">
                <div className="confirmation-icon">✨</div>
                <h2>Votre thème gratuit vous attend dans votre espace</h2>
                <p>
                  Vous pourrez le retrouver <strong>d'ici quelques instants</strong> dans
                  votre espace compte, où vous pourrez le consulter et le télécharger en PDF.
                </p>

                {isLoggedIn || accountExists ? (
                  <div className="password-field">
                    <p>Votre thème gratuit est disponible dans votre espace personnel.</p>
                    <a
                      href="/profile"
                      className="btn btn-primary"
                      style={{ width: "100%", justifyContent: "center", marginTop: "0.6rem" }}
                    >
                      Accéder à mon espace
                    </a>
                  </div>
                ) : pwDone ? (
                  <div className="password-field">
                    <p style={{ color: "var(--sage-dark)", fontWeight: 600 }}>
                      ✓ Votre mot de passe a été créé.
                    </p>
                    <a
                      href="/profile"
                      className="btn btn-primary"
                      style={{ width: "100%", justifyContent: "center", marginTop: "0.6rem" }}
                    >
                      Accéder à mon espace
                    </a>
                    <a
                      href="/exemple-theme-numerologique/"
                      className="btn btn-ghost"
                      style={{ width: "100%", justifyContent: "center", marginTop: "0.7rem" }}
                    >
                      Voir un exemple de thème complet
                    </a>
                  </div>
                ) : showPasswordStep ? (
                  <div className="password-field">
                    <p style={{ marginBottom: "0.8rem" }}>
                      Créez le mot de passe de votre compte pour accéder à votre thème :
                    </p>
                    <div className="form-group" style={{ marginBottom: "1rem", textAlign: "left" }}>
                      <label htmlFor="newPassword">Mot de passe</label>
                      <input
                        id="newPassword"
                        type="password"
                        value={password}
                        minLength={8}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimum 8 caractères"
                        autoComplete="new-password"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleCreatePassword}
                      disabled={pwLoading}
                      className="btn btn-primary"
                      style={{ width: "100%", justifyContent: "center" }}
                    >
                      {pwLoading ? "Création..." : "Créer mon compte"}
                    </button>
                    {pwError && <p style={{ color: "#b04747", marginTop: "0.8rem" }}>{pwError}</p>}
                  </div>
                ) : (
                  <div className="password-field">
                    <a
                      href="/signin"
                      className="btn btn-primary"
                      style={{ width: "100%", justifyContent: "center", marginTop: "0.6rem" }}
                    >
                      Accéder à mon espace
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          <FreeSidebar />
        </div>
      </>
    );
  }

  /* ---------- Vue formulaire ---------- */
  return (
    <>
      <div style={{ background: "var(--cream-warm)", padding: "2rem 0 0" }}>
        <div className="container">
          <h1 style={{ marginBottom: "0.4rem" }}>Découvrez votre thème gratuit</h1>
          <p style={{ maxWidth: 600, marginBottom: 0, paddingBottom: "1.5rem" }}>
            Remplissez votre état civil pour recevoir, gratuitement et sans attente, un
            résumé numérologique de votre profil. Il sera disponible dans votre espace
            compte, consultable et téléchargeable en PDF.
          </p>
        </div>
      </div>

      <div className="theme-page-layout">
        <div className="stepper">
          <div className="step-tab active"><span className="step-num">1</span> Vos informations</div>
          <div className="step-tab"><span className="step-num">2</span> Confirmation</div>
        </div>

        <div>
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
              <button type="button" onClick={handleGenerate} disabled={loading} className="btn btn-primary btn-lg" style={{ width: "100%", justifyContent: "center" }}>
                {loading ? "Génération de votre résumé en cours..." : "Recevoir mon thème gratuit"}
              </button>
            </div>

            {error && <p style={{ color: "#b04747", marginTop: "1rem", textAlign: "center" }}>{error}</p>}

            <p style={{ marginTop: "0.8rem", fontSize: "0.83rem", color: "var(--brown-muted)", textAlign: "center" }}>
              Vos données d'état civil servent uniquement à générer votre thème.
            </p>
          </div>
        </div>

        <FreeSidebar />
      </div>
    </>
  );
}

function FreeSidebar() {
  return (
    <aside className="theme-sidebar">
      <div className="sidebar-card">
        <h4>Ce que vous allez recevoir</h4>
        <div className="sidebar-feature"><span className="icon">✓</span><p><strong>Une introduction</strong> à votre profil numérologique</p></div>
        <div className="sidebar-feature"><span className="icon">✓</span><p><strong>Votre énergie dominante</strong> et vos forces principales</p></div>
        <div className="sidebar-feature"><span className="icon">✓</span><p><strong>Votre axe émotionnel &amp; relationnel</strong></p></div>
        <div className="sidebar-feature"><span className="icon">✓</span><p><strong>Vos principaux enjeux &amp; défis</strong></p></div>
        <div className="sidebar-feature"><span className="icon">✓</span><p><strong>Une conclusion</strong> synthétique et inspirante</p></div>
        <div className="trust-strip">
          <div className="trust-item">⚡ Disponible sans attente</div>
          <div className="trust-item">🔒 Données 100% confidentielles</div>
          <div className="trust-item">📄 Téléchargeable en PDF</div>
        </div>
      </div>

      <a href="/exemple-theme-numerologique/" className="btn btn-ghost" style={{ width: "100%", justifyContent: "center", fontSize: "0.88rem" }}>
        Voir un exemple de thème complet
      </a>
    </aside>
  );
}
