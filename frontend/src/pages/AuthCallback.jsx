import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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
      navigate("/login", { replace: true });
      return;
    }
    const session_id = decodeURIComponent(m[1]);
    (async () => {
      try {
        const { data } = await api.post("/auth/oauth/session", { session_id });
        setUser(data.user);
        toast.success(`Welcome, ${data.user.name}!`);
        const dest = data.user.role === "admin" ? "/admin" : data.user.role === "staff" ? "/staff" : data.user.role === "kitchen" ? "/kitchen" : "/menu";
        navigate(dest, { replace: true, state: { user: data.user } });
      } catch (e) {
        toast.error("Google sign-in failed. Please try again.");
        navigate("/login", { replace: true });
      }
    })();
  }, [navigate, setUser]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-8 h-8 text-ember-400 animate-spin" />
      <div className="text-muted-foreground">Setting your table...</div>
    </div>
  );
}
