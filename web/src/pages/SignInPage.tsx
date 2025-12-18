import { useEffect, useState } from "react";
import { loginUser } from "../api";
import "../App.css";
import { supabase } from "../supabaseClient";


export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  
  useEffect(() => {
    // Empêche le "flash" de message lié à un ancien token invalide
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
  }, []);


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data?.session?.access_token) {
        setError("Email ou mot de passe incorrect.");
        return;
      }

      // ✅ tu gardes ton système existant: JWT en localStorage
      localStorage.setItem("auth_token", data.session.access_token);

      // Optionnel: redirection
      window.location.href = "/profile";
    } catch (err: any) {
      setError(err?.message || "Connexion impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <h2>Connexion</h2>

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

        {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? "Connexion..." : "Se connecter"}
          </button>
      </form>

      <p style={{ marginTop: "16px" }}>
        Pas encore de compte ? <a href="/signup">Créer un compte</a>
      </p>
    </div>
  );
}
