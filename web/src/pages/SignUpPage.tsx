import { useState } from "react";
import { registerUser } from "../api";
import "../App.css";

export default function SignUpPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]  = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      await registerUser({ firstName, lastName, email, password });
      window.location.href = "/signin";
    } catch (err: any) {
      setError(err.message || "Impossible de créer le compte.");
    }
  }

  return (
    <div className="auth-container">
      <h2>Créer un compte</h2>

      <form onSubmit={handleSubmit} className="auth-form">
        <label>Prénom</label>
        <input
          required
          value={firstName}
          onChange={e => setFirstName(e.target.value)}
        />

        <label>Nom</label>
        <input
          required
          value={lastName}
          onChange={e => setLastName(e.target.value)}
        />

        <label>Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
        />

        <label>Mot de passe</label>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        {error && <p className="auth-error">{error}</p>}

        <button type="submit" className="auth-btn">
          S’inscrire
        </button>
      </form>

      <p style={{ marginTop: "16px" }}>
        Déjà un compte ? <a href="/signin">Connexion</a>
      </p>
    </div>
  );
}
