import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    let done = false;

    // 1) Écoute l’événement Supabase (le plus fiable)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (done) return;
      if (session) {
        done = true;
        navigate("/signin?confirmed=1");
      }
    });

    // 2) Fallback: tente une lecture immédiate de session
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!done && data.session) {
        done = true;
        navigate("/signin?confirmed=1");
      }
      // si pas de session → on renvoie quand même vers signin avec info
      if (!done) {
        navigate("/signin?confirmed=0");
      }
    })();

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  return <div>Validation en cours…</div>;
}
