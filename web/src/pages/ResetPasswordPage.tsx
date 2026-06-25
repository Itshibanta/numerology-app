import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import "../App.css";

export default function ResetPasswordPage() {
  // "request" = saisir son email pour recevoir un lien.
  // "update"  = on arrive depuis le lien email -> on choisit directement le mot de passe.
  const [mode, setMode] = useState<"request" | "update">("request");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Si on arrive via le lien reçu par email, Supabase crée une session :
    // on passe alors en mode "choisir un mot de passe".
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setMode("update");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setMode("update");
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSendEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) console.error("RESET_EMAIL_ERROR", error);
      // Message anti-énumération
      setInfo("Si votre compte existe, un email vous sera envoyé.");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!password || password.length < 8) {
      setError("Votre mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError("Impossible d’enregistrer le mot de passe. Le lien a peut-être expiré.");
        return;
      }
      setDone(true);
      setTimeout(() => (window.location.href = "/profile"), 1200);
    } finally {
      setLoading(false);
    }
  }

  /* ----- Mode "choisir / créer son mot de passe" (arrivée depuis l'email) ----- */
  if (mode === "update") {
    return (
      <div className="content-wrapper" style={{ maxWidth: 560 }}>
        <div className="text-center" style={{ marginBottom: "1.6rem" }}>
          <h1>Choisissez votre mot de passe</h1>
          <p className="hero-subtitle">Définissez le mot de passe de votre compte.</p>
        </div>

        <div className="form-card">
          {done ? (
            <p style={{ background: "var(--cream-warm)", borderLeft: "3px solid var(--sage)", borderRadius: "var(--radius-md)", padding: "0.9rem 1.1rem", margin: 0, color: "var(--brown-mid)" }}>
              ✓ Mot de passe enregistré. Redirection vers votre espace…
            </p>
          ) : (
            <form onSubmit={handleUpdatePassword} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="form-group">
                <label>Nouveau mot de passe</label>
                <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 8 caractères" autoComplete="new-password" />
              </div>

              {error && <p style={{ color: "#b04747", margin: 0 }}>{error}</p>}

              <div className="form-actions">
                <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
                  {loading ? "Enregistrement..." : "Enregistrer mon mot de passe"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  /* ----- Mode "demander un lien par email" ----- */
  return (
    <div className="content-wrapper" style={{ maxWidth: 560 }}>
      <div className="text-center" style={{ marginBottom: "1.6rem" }}>
        <h1>Mot de passe oublié</h1>
        <p className="hero-subtitle">Saisissez votre email : nous vous enverrons un lien pour définir un nouveau mot de passe.</p>
      </div>

      <div className="form-card">
        <form onSubmit={handleSendEmail} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          {error && <p style={{ color: "#b04747", margin: 0 }}>{error}</p>}
          {info && (
            <p style={{ background: "var(--cream-warm)", borderLeft: "3px solid var(--sage)", borderRadius: "var(--radius-md)", padding: "0.9rem 1.1rem", margin: 0, color: "var(--brown-mid)" }}>
              {info}
            </p>
          )}

          <div className="form-actions">
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
              {loading ? "Envoi..." : "Recevoir le lien"}
            </button>
          </div>
        </form>

        <p style={{ marginTop: "1.3rem", textAlign: "center", fontSize: "0.9rem" }}>
          <a href="/signin">Retour à la connexion</a>
        </p>
      </div>
    </div>
  );
}
