import { useEffect } from "react";

export default function AuthCallbackPage() {
  useEffect(() => {
    const t = setTimeout(() => window.location.replace("/signin?confirmed=1"), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="content-wrapper" style={{ maxWidth: 560 }}>
      <div className="text-center" style={{ padding: "3rem 1rem" }}>
        <h1>Email confirmé</h1>
        <p className="hero-subtitle">Redirection vers votre connexion…</p>
      </div>
    </div>
  );
}
