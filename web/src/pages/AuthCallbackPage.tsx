import { useEffect } from "react";

export default function AuthCallbackPage() {
  useEffect(() => {
    window.location.replace("/signin?confirmed=1");
  }, []);

  return <div>Email confirmé ✅ Redirection…</div>;
}
