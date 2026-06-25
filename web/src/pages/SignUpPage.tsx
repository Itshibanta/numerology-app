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
          emailRedirectTo: `${window.location.origin}/signin?confirmed=1`,
        },
      });

      if (signUpError) {
        setError("Inscription impossible : " + signUpError.message);
        return;
      }

      // Option A (anti-énumération) : message neutre, même si l'email existe déjà
      setSubmitted(true);
      setInfo(
        "Vérifiez vos emails pour confirmer l’inscription. Si un compte existe déjà, connectez-vous."
      );
    } catch (err: any) {
      setError(err?.message || "Impossible de créer le compte.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="content-wrapper" style={{ maxWidth: 560 }}>
      <div className="text-center" style={{ marginBottom: "1.6rem" }}>
        <h1>Créer un compte</h1>
        <p className="hero-subtitle">Quelques secondes pour accéder à vos thèmes numérologiques.</p>
      </div>

      <div className="form-card">
        {error && <p style={{ color: "#b04747", marginBottom: "1rem" }}>{error}</p>}
        {info && (
          <div
            style={{
              display: "flex",
              gap: "0.6rem",
              alignItems: "flex-start",
              background: "var(--cream-warm)",
              borderLeft: "3px solid var(--sage)",
              borderRadius: "var(--radius-md)",
              padding: "0.9rem 1.1rem",
              marginBottom: "1.2rem",
              color: "var(--brown-mid)",
              fontSize: "0.92rem",
              lineHeight: 1.5,
            }}
          >
            <span style={{ color: "var(--sage-dark)", fontWeight: 700 }}>✓</span>
            <span>{info}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="form-group">
            <label>Prénom</label>
            <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={submitted} />
          </div>

          <div className="form-group">
            <label>Nom</label>
            <input required value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={submitted} />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={submitted} />
          </div>

          <div className="form-group">
            <label>Mot de passe</label>
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} disabled={submitted} />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading || submitted} style={{ width: "100%", justifyContent: "center" }}>
              {submitted ? "Email envoyé" : loading ? "Création..." : "S’inscrire"}
            </button>
          </div>
        </form>

        <p style={{ marginTop: "1.3rem", textAlign: "center", fontSize: "0.9rem" }}>
          Déjà un compte ? <a href="/signin">Connexion</a>
        </p>
      </div>
    </div>
  );
}
