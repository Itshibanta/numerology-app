import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      navigate(data.session ? "/signin?confirmed=1" : "/signin?confirmed=0");
    })();
  }, [navigate]);

  return <div>Validation en cours…</div>;
}
