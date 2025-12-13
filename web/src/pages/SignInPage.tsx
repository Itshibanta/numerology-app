import { useState } from "react";
import { loginUser } from "../api";
import "../App.css";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      const res = await loginUser({ email, password });

      if (res?.token) {
        localStorage.setItem("auth_token", res.token);
      }

      if (res?.user) {
        localStorage.setItem("user", JSON.stringify(res.user));
      }

      window.location.href = "/theme";
    } catch (err: any) {
      setError(err?.message || "Email ou mot de passe incorrect.");
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

        <button type="submit" className="auth-btn">
          Se connecter
        </button>
      </form>

      <p style={{ marginTop: "16px" }}>
        Pas encore de compte ? <a href="/signup">Créer un compte</a>
      </p>
    </div>
  );
}
