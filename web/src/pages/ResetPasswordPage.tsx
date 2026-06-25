import { useState } from "react";
import { supabase } from "../supabaseClient";
import "../App.css";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      // ✅ Message “anti-enumération”: on dit la même chose quoi qu’il arrive
      if (error) {
        console.error("RESET_EMAIL_ERROR", error);
      }

      setInfo("Si votre compte existe, un email vous sera envoyé.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="content-wrapper" style={{ maxWidth: 560 }}>
      <div className="text-center" style={{ marginBottom: "1.6rem" }}>
        <h1>Réinitialiser le mot de passe</h1>
        <p className="hero-subtitle">Saisissez votre email : nous vous enverrons un lien de réinitialisation.</p>
      </div>

      <div className="form-card">
        <form onSubmit={handleSend} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          {error && <p style={{ color: "#b04747", margin: 0 }}>{error}</p>}
          {info && (
            <p style={{ background: "rgba(166,187,167,0.15)", border: "1px solid var(--sage)", borderRadius: "var(--radius-sm)", padding: "0.7rem 0.9rem", margin: 0, color: "var(--brown-mid)" }}>
              {info}
            </p>
          )}

          <div className="form-actions">
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
              {loading ? "Envoi..." : "Réinitialiser mon mot de passe"}
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
