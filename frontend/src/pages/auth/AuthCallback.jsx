import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

function dashFor(role) {
  return role === "admin" ? "/admin" : role === "staff" ? "/staff" : role === "kitchen" ? "/kitchen" : "/menu";
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    const hash = window.location.hash || "";
    const m = hash.match(/session_id=([^&]+)/);
    if (!m) {
      // Nothing to exchange — go straight to login.
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      navigate("/login", { replace: true });
      return;
    }
    const session_id = decodeURIComponent(m[1]);
    (async () => {
      try {
        const { data } = await api.post("/auth/oauth/session", { session_id });
        setUser(data.user);
        // Wipe the #session_id=... from the URL BEFORE navigating so AppRouter doesn't
        // re-trigger AuthCallback on the next render.
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        toast.success(`Welcome, ${data.user.name}!`);
        navigate(dashFor(data.user.role), { replace: true });
      } catch (e) {
        console.error("OAuth session exchange failed", e);
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        toast.error(
          e?.response?.data?.detail
            ? `Google sign-in failed: ${e.response.data.detail}`
            : "Google sign-in failed. Please try again or use email login."
        );
        navigate("/login", { replace: true });
      }
    })();
  }, [navigate, setUser]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-8 h-8 text-ember-400 animate-spin" />
      <div className="text-muted-foreground">Setting your table...</div>
    </div>
  );
}
