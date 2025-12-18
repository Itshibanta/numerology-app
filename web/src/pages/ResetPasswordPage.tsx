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
        redirectTo: "https://classy-sfogliatella-0aecf9.netlify.app/reset-password",
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
    <div className="auth-container">
      <h2>Réinitialiser le mot de passe</h2>

      <form onSubmit={handleSend} className="auth-form">
        <label>Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {error && <p className="auth-error">{error}</p>}
        {info && <p className="auth-info">{info}</p>}

        <button type="submit" className="auth-btn" disabled={loading}>
          {loading ? "Envoi..." : "Réinitialiser mon mot de passe"}
        </button>
      </form>

      <p style={{ marginTop: "16px" }}>
        <a href="/signin">Retour à la connexion</a>
      </p>
    </div>
  );
}
