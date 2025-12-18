import { useEffect } from "react";

export default function AuthCallbackPage() {
  useEffect(() => {
    // Si tu utilises HashRouter, tes routes sont sous "#/..."
    const usesHashRouter = window.location.hash.startsWith("#/");

    if (usesHashRouter) {
      window.location.replace("/#/signin?confirmed=1");
    } else {
      window.location.replace("/signin?confirmed=1");
    }
  }, []);

  return <div>Email confirmé ✅ Redirection…</div>;
}
