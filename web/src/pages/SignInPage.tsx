// web/src/pages/SignInPage.tsx
import { useEffect, useMemo, useState } from "react";
import "../App.css";
import { supabase } from "../supabaseClient";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const confirmed = params.get("confirmed") === "1";

  useEffect(() => {
    // Nettoie un éventuel token legacy pour éviter les effets bizarres
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data?.session?.access_token) {
        const msg = (error?.message || "").toLowerCase();
        if (msg.includes("email not confirmed")) {
          setError("Confirmez votre compte avec l’email reçu avant de vous connecter.");
        } else {
          setError("Email ou mot de passe incorrect.");
        }
        return;
      }

      // Garde ton système existant: token en localStorage pour appeler ton backend
      localStorage.setItem("auth_token", data.session.access_token);

      window.location.href = "/";
    } catch (err: any) {
      setError(err?.message || "Connexion impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <h2>Connexion</h2>

      {confirmed && (
        <p className="auth-info">
          Email confirmé Vous pouvez maintenant vous connecter.
        </p>
      )}

      {error && <p className="auth-error">{error}</p>}

      <form onSubmit={handleSubmit} className="auth-form">
        <label>Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label>Mot de passe</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit" className="auth-btn" disabled={loading}>
          {loading ? "Connexion..." : "Se connecter"}
        </button>
      </form>

      <p style={{ marginTop: "24px" }}>
        Pas encore de compte ? <a href="/signup">Créer un compte</a>
      </p>

      <p style={{ marginTop: "-10px" }}>
        Mot de passe oublié ? <a href="/reset-password">Réinitialisez-le mot</a>
      </p>
    </div>
  );
}
