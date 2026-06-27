// web/src/pages/SignInPage.tsx
import { useEffect, useMemo, useState } from "react";
import "../App.css";
import { supabase } from "../supabaseClient";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // true tant que l'on vérifie la session : évite d'afficher le formulaire
  // (puis de rediriger) à une personne déjà connectée.
  const [checking, setChecking] = useState(true);

  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const confirmed = params.get("confirmed") === "1";

  useEffect(() => {
    // Si une session Supabase existe déjà (ex: après confirmation d'email,
    // ou clic sur "Mon compte" en étant connecté) -> on va directement au profil.
    supabase.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token;
      if (token) {
        localStorage.setItem("auth_token", token);
        window.location.href = "/profile";
      } else {
        setChecking(false);
      }
    });
  }, []);

  // Pendant la vérification de session, on n'affiche PAS le formulaire
  // (sinon flash de la page de connexion avant la redirection).
  if (checking) {
    return (
      <div className="content-wrapper" style={{ maxWidth: 560, textAlign: "center", padding: "3rem 1.5rem" }}>
        <p className="hero-subtitle">Chargement…</p>
      </div>
    );
  }

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

      window.location.href = "/profile";
    } catch (err: any) {
      setError(err?.message || "Connexion impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="content-wrapper" style={{ maxWidth: 560 }}>
      <div className="text-center" style={{ marginBottom: "1.6rem" }}>
        <h1>Connexion</h1>
        <p className="hero-subtitle">Accédez à votre compte et à vos thèmes numérologiques.</p>
      </div>

      <div className="form-card">
        {confirmed && (
          <p style={{ background: "rgba(166,187,167,0.15)", border: "1px solid var(--sage)", borderRadius: "var(--radius-sm)", padding: "0.7rem 0.9rem", marginBottom: "1rem", color: "var(--brown-mid)" }}>
            Email confirmé. Vous pouvez maintenant vous connecter.
          </p>
        )}

        {error && <p style={{ color: "#b04747", marginBottom: "1rem" }}>{error}</p>}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="form-group">
            <label>Mot de passe</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </div>
        </form>

        <p style={{ marginTop: "1.3rem", textAlign: "center", fontSize: "0.9rem" }}>
          Pas encore de compte ? <a href="/signup">Créer un compte</a>
        </p>
        <p style={{ textAlign: "center", fontSize: "0.9rem", marginTop: "0.2rem" }}>
          Mot de passe oublié ? <a href="/reset-password">Réinitialiser</a>
        </p>
      </div>
    </div>
  );
}
