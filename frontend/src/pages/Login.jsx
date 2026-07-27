import { useState, useEffect } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import { Loader2, LogIn, Chrome, Leaf, ArrowRight, Sparkles, Flame, Utensils, CalendarClock, Bot, ShieldCheck, Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function dashFor(role) {
  return role === "admin" ? "/admin" : role === "staff" ? "/staff" : role === "kitchen" ? "/kitchen" : "/menu";
}

const HERO_WORDS = ["Warmth.", "Craft.", "Fire.", "Flavour.", "Stories."];

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [wordIdx, setWordIdx] = useState(0);

  // Rotating hero word
  useEffect(() => {
    const t = setInterval(() => setWordIdx((i) => (i + 1) % HERO_WORDS.length), 2400);
    return () => clearInterval(t);
  }, []);

  // Already signed in? Bounce to the intended destination.
  if (user) {
    const from = loc.state?.from?.pathname;
    const target = (from && from !== "/") ? from : dashFor(user.role);
    return <Navigate to={target} replace />;
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const u = await login(email, password);
      toast.success(`Welcome, ${u.name}`);
      const from = loc.state?.from?.pathname;
      const target = (from && from !== "/") ? from : dashFor(u.role);
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
    <div className="min-h-screen relative overflow-hidden bg-neutral-950 text-white">
      {/* Ambient animated blobs */}
      <motion.div
        className="pointer-events-none absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full bg-ember-400/20 blur-[110px]"
        animate={{ x: [0, 40, 0], y: [0, 60, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute -bottom-40 -right-40 w-[560px] h-[560px] rounded-full bg-coral-500/20 blur-[130px]"
        animate={{ x: [0, -60, 0], y: [0, -40, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Grain overlay */}
      <div className="grain absolute inset-0 pointer-events-none opacity-30" />

      <div className="relative min-h-screen grid md:grid-cols-[1.05fr_1fr] gap-0">
        {/* LEFT — Brand storytelling */}
        <div className="hidden md:flex flex-col justify-between p-12 lg:p-16 relative overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-3"
          >
            <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-ember-400 to-coral-500 flex items-center justify-center">
              <motion.div
                className="absolute inset-0 rounded-2xl bg-ember-400/60 blur-md"
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 2.4, repeat: Infinity }}
              />
              <Sparkles className="w-5 h-5 text-neutral-900 relative z-10" />
            </div>
            <div className="leading-none">
              <div className="font-display text-3xl tracking-tight">Ember &amp; Oak</div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-white/50 mt-1">Smart Restaurant OS</div>
            </div>
            <span className="ml-2 inline-flex items-center gap-1 h-6 px-2 rounded-full bg-emerald-500 text-white text-[10px] font-semibold uppercase tracking-widest">
              <Leaf className="w-3 h-3" /> Pure Veg
            </span>
          </motion.div>

          {/* Professional feature flashcards */}
          <FeatureFlashcards />

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.6 }}
            className="space-y-6"
          >
            <div className="text-xs uppercase tracking-[0.3em] text-ember-300">A vegetarian fine-dining OS</div>
            <h1 className="font-display text-5xl lg:text-6xl leading-[0.98] tracking-tight">
              Slow food.<br />
              Fast{" "}
              <AnimatePresence mode="wait">
                <motion.span
                  key={HERO_WORDS[wordIdx]}
                  initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                  transition={{ duration: 0.4 }}
                  className="italic text-ember-300 inline-block"
                >
                  {HERO_WORDS[wordIdx]}
                </motion.span>
              </AnimatePresence>
            </h1>
            <p className="text-white/70 text-base max-w-md leading-relaxed">
              A single, beautifully-wired platform for diners, servers, chefs and owners. Sign in below or spin up an account with Google in one tap.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="grid grid-cols-3 gap-4 max-w-md"
          >
            <Stat n="37+" l="Veg dishes" />
            <Stat n="4" l="Live dashboards" />
            <Stat n="AI" l="Gemini insights" />
          </motion.div>
        </div>

        {/* RIGHT — Auth panel */}
        <div className="relative flex items-center justify-center p-6 md:p-10">
          {/* Glass card */}
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 24, delay: 0.15 }}
            className="w-full max-w-md relative"
          >
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-ember-400/30 to-coral-500/30 blur-2xl opacity-40" aria-hidden />
            <div className="relative glass-dark rounded-3xl p-7 md:p-8 border border-white/10 shadow-2xl">
              <div className="text-xs uppercase tracking-[0.3em] text-ember-300 mb-2">First time or returning?</div>
              <h2 className="font-display text-3xl md:text-4xl mb-1">Pull up a chair.</h2>
              <p className="text-sm text-white/60 mb-6">Sign in with Google in one tap — new visitors get an account instantly. Or use the email form below.</p>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                data-testid="google-login-btn"
                onClick={googleLogin}
                className="group w-full h-12 rounded-full bg-white text-neutral-900 hover:bg-white/95 font-semibold flex items-center justify-center gap-2 shadow-lg shadow-white/10"
              >
                <Chrome className="w-4 h-4" /> Continue with Google
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1 text-neutral-500" />
              </motion.button>

              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-white/10" />
                <div className="text-[10px] uppercase tracking-widest text-white/40">or with email</div>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              <form onSubmit={onSubmit} className="space-y-3">
                <FloatingInput
                  id="email"
                  testid="login-email"
                  type="email"
                  label="Email"
                  value={email}
                  onChange={(v) => setEmail(v)}
                  autoComplete="email"
                  required
                />
                <FloatingInput
                  id="password"
                  testid="login-password"
                  type="password"
                  label="Password"
                  value={password}
                  onChange={(v) => setPassword(v)}
                  autoComplete="current-password"
                  required
                />
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={busy}
                  data-testid="login-submit"
                  className="w-full h-12 rounded-full bg-gradient-to-r from-ember-400 to-coral-500 text-neutral-900 font-semibold hover:brightness-110 disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-ember-500/30 mt-2"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />} Sign in
                </motion.button>
              </form>

              <div className="text-xs text-white/50 text-center mt-6 leading-relaxed">
                New here? Just tap <b className="text-white">Continue with Google</b> — we'll create your account instantly. No forms, no waiting.
              </div>

              <div className="mt-6 p-4 rounded-2xl bg-white/[0.03] border border-white/5 text-[11px] text-white/50 leading-relaxed">
                <div className="text-white/80 font-semibold uppercase tracking-widest text-[10px] mb-2 inline-flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-ember-300" /> Try a demo role
                </div>
                <div>Owner: <b className="text-white/80">radharamanmdp@gmail.com</b> — sign up once, auto-promoted to Admin</div>
                <div>Kitchen: chef@ember.demo · chef123</div>
                <div>Server: server@ember.demo · staff123</div>
                <div>Diner: guest@ember.demo · guest123</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function Stat({ n, l }) {
  return (
    <div>
      <div className="font-display text-3xl text-ember-300">{n}</div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-white/50 mt-1">{l}</div>
    </div>
  );
}

const FEATURES = [
  {
    icon: Utensils,
    title: "Live Menu Board",
    body: "37 pure-veg dishes with real-time availability, allergens & prep times — updated the moment the chef flips a switch.",
    kbd: "Diner · Server",
    tint: "from-ember-400/25 to-amber-500/10",
  },
  {
    icon: CalendarClock,
    title: "Smart Reservations",
    body: "Auto-matches parties to the right table, tracks the live queue and messages guests when their seat is ready.",
    kbd: "Host · Staff",
    tint: "from-coral-500/25 to-rose-500/10",
  },
  {
    icon: Bot,
    title: "AI Operations",
    body: "Gemini-powered demand forecasts, inventory risk alerts and a plain-English weekly digest — served to the owner.",
    kbd: "Owner",
    tint: "from-violet-500/25 to-indigo-500/10",
  },
  {
    icon: ShieldCheck,
    title: "Kitchen Display + Bills",
    body: "Chef KDS with order timers, one-tap status flow and instant itemised bills with tax & service — no paperwork.",
    kbd: "Kitchen · Cashier",
    tint: "from-emerald-500/25 to-teal-500/10",
  },
];

function FeatureFlashcards() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.55 }}
      className="grid grid-cols-2 gap-3 max-w-lg my-6"
      data-testid="login-feature-flashcards"
    >
      {FEATURES.map((f, i) => (
        <FlashcardTile key={f.title} f={f} i={i} />
      ))}
    </motion.div>
  );
}

function FlashcardTile({ f, i }) {
  const Icon = f.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 + i * 0.08, type: "spring", stiffness: 220, damping: 22 }}
      whileHover={{ y: -3, scale: 1.015 }}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] backdrop-blur-xl p-4 shadow-lg shadow-black/20"
    >
      <div className={`pointer-events-none absolute -top-8 -right-8 w-28 h-28 rounded-full bg-gradient-to-br ${f.tint} blur-2xl opacity-70 group-hover:opacity-100 transition-opacity`} />
      <div className="relative flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-ember-300" strokeWidth={1.8} />
        </div>
        <span className="text-[9px] uppercase tracking-[0.18em] text-white/40 border border-white/10 rounded-full px-2 py-0.5">
          {f.kbd}
        </span>
      </div>
      <div className="relative">
        <div className="font-display text-lg leading-tight text-white mb-1">{f.title}</div>
        <p className="text-[12px] leading-relaxed text-white/60 line-clamp-3">{f.body}</p>
      </div>
      <div className="pointer-events-none absolute inset-x-4 bottom-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
    </motion.div>
  );
}

function FloatingInput({ id, testid, type, label, value, onChange, autoComplete, required }) {
  const [focused, setFocused] = useState(false);
  const isActive = focused || !!value;
  return (
    <div className="relative">
      <label
        htmlFor={id}
        className={`absolute left-4 pointer-events-none transition-all duration-200 ${
          isActive
            ? "-top-2 text-[10px] uppercase tracking-widest text-ember-300 bg-neutral-950 px-1"
            : "top-3.5 text-sm text-white/50"
        }`}
      >
        {label}
      </label>
      <input
        id={id}
        data-testid={testid}
        type={type}
        required={required}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full h-12 rounded-xl border border-white/10 bg-white/[0.03] px-4 pt-1 text-white placeholder:text-white/30 focus:ring-2 focus:ring-ember-400/50 focus:border-ember-400/40 outline-none transition-all"
      />
    </div>
  );
}
