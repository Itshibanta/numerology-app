import { useState } from "react";
import { registerUser } from "../api";
import "../App.css";
import { supabase } from "../supabaseClient";


export default function SignUpPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]  = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading] = useState(false);


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { firstName, lastName },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        const msg = (error.message || "").toLowerCase();
        if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
          setError("Un compte existe déjà avec cet email. Connecte-toi.");
        } else {
          setError("Inscription impossible : " + error.message);
        }
        return;
      }

      // UX V1: on redirige tout de suite
      window.location.href = "/signin?registered=1";
    } catch (err: any) {
      setError(err?.message || "Impossible de créer le compte.");
    } finally {
      setLoading(false);
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

        <button type="submit" className="auth-btn" disabled={loading}>
          {loading ? "Création..." : "S’inscrire"}
        </button>
      </form>

      <p style={{ marginTop: "16px" }}>
        Déjà un compte ? <a href="/signin">Connexion</a>
      </p>
    </div>
  );
}
