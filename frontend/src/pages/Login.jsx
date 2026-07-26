import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import { Loader2, LogIn, Chrome } from "lucide-react";
import { motion } from "framer-motion";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const u = await login(email, password);
      toast.success(`Welcome back, ${u.name}`);
      const target = loc.state?.from?.pathname || dashFor(u.role);
      navigate(target, { replace: true });
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Login failed");
    } finally { setBusy(false); }
  };

  const googleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] grid md:grid-cols-2">
      <div className="hidden md:block relative overflow-hidden">
        <img src="https://images.pexels.com/photos/10633476/pexels-photo-10633476.jpeg" alt="Restaurant" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-tr from-neutral-950 via-neutral-950/70 to-transparent" />
        <div className="absolute bottom-10 left-10 right-10 text-white">
          <div className="text-xs uppercase tracking-[0.3em] text-ember-300 mb-3">Ember &amp; Oak</div>
          <h2 className="font-display text-4xl lg:text-5xl leading-tight max-w-md">
            Where hospitality meets an <span className="italic text-ember-300">intelligent</span> stack.
          </h2>
        </div>
      </div>
      <div className="flex items-center justify-center p-6 md:p-12">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="text-xs uppercase tracking-[0.3em] text-ember-400 mb-2">Sign in</div>
          <h1 className="font-display text-4xl mb-6">Good to see you back.</h1>

          <button
            data-testid="google-login-btn"
            onClick={googleLogin}
            className="w-full h-11 rounded-full border border-border bg-card hover:bg-secondary flex items-center justify-center gap-2 mb-4"
          >
            <Chrome className="w-4 h-4" /> Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-border" />
            <div className="text-xs uppercase tracking-widest text-muted-foreground">or email</div>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Email</label>
              <input
                data-testid="login-email"
                type="email" required autoComplete="email"
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full h-11 rounded-xl border border-border bg-background px-4 focus:ring-2 focus:ring-ember-400/50 outline-none"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Password</label>
              <input
                data-testid="login-password"
                type="password" required autoComplete="current-password"
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full h-11 rounded-xl border border-border bg-background px-4 focus:ring-2 focus:ring-ember-400/50 outline-none"
              />
            </div>
            <button
              type="submit" disabled={busy}
              data-testid="login-submit"
              className="w-full h-11 rounded-full bg-ember-400 text-neutral-900 font-semibold hover:bg-ember-500 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />} Sign in
            </button>
          </form>

          <div className="text-sm text-muted-foreground mt-6">
            New here? <Link to="/register" className="text-ember-400 hover:underline">Create an account</Link>
          </div>

          <div className="mt-8 p-4 rounded-xl bg-secondary/50 text-xs text-muted-foreground leading-relaxed">
            <div className="text-foreground font-semibold uppercase tracking-widest text-[10px] mb-2">Demo logins</div>
            <div>Owner: <b>radharamanmdp@gmail.com</b> · sign up first, you'll be auto-promoted to Admin.</div>
            <div>Kitchen: chef@ember.demo · chef123</div>
            <div>Server: server@ember.demo · staff123</div>
            <div>Diner: guest@ember.demo · guest123</div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function dashFor(role) {
  return role === "admin" ? "/admin" : role === "staff" ? "/staff" : role === "kitchen" ? "/kitchen" : "/menu";
}
