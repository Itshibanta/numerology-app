// web/src/pages/SignUpPage.tsx
import { useState } from "react";
import "../App.css";
import { supabase } from "../supabaseClient";

export default function SignUpPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string>("");
  const [info, setInfo] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { firstName, lastName },
          emailRedirectTo:
            "https://classy-sfogliatella-0aecf9.netlify.app/signin?confirmed=1",
        },
      });

      if (signUpError) {
        setError("Inscription impossible : " + signUpError.message);
        return;
      }

      // Option A (anti-énumération) : message neutre, même si l'email existe déjà
      setSubmitted(true);
      setInfo(
        "Si un compte existe déjà, connectez-vous. Sinon, vérifiez vos emails pour confirmer l’inscription."
      );
    } catch (err: any) {
      setError(err?.message || "Impossible de créer le compte.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <h2>Créer un compte</h2>

      {error && <p className="auth-error">{error}</p>}
      {info && <p className="auth-info">{info}</p>}

      <form onSubmit={handleSubmit} className="auth-form">
        <label>Prénom</label>
        <input
          required
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          disabled={submitted}
        />

        <label>Nom</label>
        <input
          required
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          disabled={submitted}
        />

        <label>Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitted}
        />

        <label>Mot de passe</label>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={submitted}
        />

        <button
          type="submit"
          className="auth-btn"
          disabled={loading || submitted}
        >
          {submitted ? "Email envoyé ✅" : loading ? "Création..." : "S’inscrire"}
        </button>
      </form>

      <p style={{ marginTop: "16px" }}>
        Déjà un compte ? <a href="/signin">Connexion</a>
      </p>
    </div>
  );
}
