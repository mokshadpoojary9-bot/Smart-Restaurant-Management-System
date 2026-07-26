import { useState } from "react";
import { Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import { Loader2, UserPlus, Chrome } from "lucide-react";
import { motion } from "framer-motion";

function dashFor(role) {
  return role === "admin" ? "/admin" : role === "staff" ? "/staff" : role === "kitchen" ? "/kitchen" : "/menu";
}

export default function Register() {
  const { user, signup } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);

  // Already signed in? Bounce to intended destination (treat '/' as "no destination").
  if (user) {
    const from = loc.state?.from?.pathname;
    const target = (from && from !== "/") ? from : dashFor(user.role);
    return <Navigate to={target} replace />;
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const u = await signup(form.name, form.email, form.password);
      toast.success(`Welcome, ${u.name}!`);
      const from = loc.state?.from?.pathname;
      const target = (from && from !== "/") ? from : dashFor(u.role);
      navigate(target, { replace: true });
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Signup failed");
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
        <img src="https://images.pexels.com/photos/29962487/pexels-photo-29962487.jpeg" className="absolute inset-0 w-full h-full object-cover" alt="restaurant" />
        <div className="absolute inset-0 bg-gradient-to-tr from-neutral-950 via-neutral-950/70 to-transparent" />
        <div className="absolute bottom-10 left-10 right-10 text-white">
          <div className="text-xs uppercase tracking-[0.3em] text-ember-300 mb-3">Join the table</div>
          <h2 className="font-display text-4xl lg:text-5xl leading-tight max-w-md">
            One account, one <span className="italic text-ember-300">unforgettable</span> evening.
          </h2>
        </div>
      </div>
      <div className="flex items-center justify-center p-6 md:p-12">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="text-xs uppercase tracking-[0.3em] text-ember-400 mb-2">Create account</div>
          <h1 className="font-display text-4xl mb-6">Reserve your seat at Ember.</h1>

          <button data-testid="google-signup-btn" onClick={googleLogin} className="w-full h-11 rounded-full border border-border bg-card hover:bg-secondary flex items-center justify-center gap-2 mb-4">
            <Chrome className="w-4 h-4" /> Continue with Google
          </button>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-border" />
            <div className="text-xs uppercase tracking-widest text-muted-foreground">or</div>
            <div className="flex-1 h-px bg-border" />
          </div>
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Full name</label>
              <input data-testid="reg-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full h-11 rounded-xl border border-border bg-background px-4 focus:ring-2 focus:ring-ember-400/50 outline-none" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Email</label>
              <input data-testid="reg-email" required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1 w-full h-11 rounded-xl border border-border bg-background px-4 focus:ring-2 focus:ring-ember-400/50 outline-none" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Password</label>
              <input data-testid="reg-password" required type="password" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-1 w-full h-11 rounded-xl border border-border bg-background px-4 focus:ring-2 focus:ring-ember-400/50 outline-none" />
            </div>
            <button type="submit" disabled={busy} data-testid="reg-submit" className="w-full h-11 rounded-full bg-ember-400 text-neutral-900 font-semibold hover:bg-ember-500 disabled:opacity-60 flex items-center justify-center gap-2">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Create account
            </button>
          </form>
          <div className="text-sm text-muted-foreground mt-6">
            Already have an account? <Link to="/login" className="text-ember-400 hover:underline">Sign in</Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
