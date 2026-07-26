import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Suspense, lazy } from "react";
import { ArrowRight, Zap, ChefHat, BarChart3, Bell, Utensils, Clock, Boxes, Users, Sparkles } from "lucide-react";
import VegBadge, { PureVegBanner } from "@/components/VegBadge";

const Hero3D = lazy(() => import("@/components/Hero3D"));

const PROBLEMS = [
  { icon: Zap, title: "Live availability", desc: "Kitchen toggles a dish — customers see it vanish from the menu in seconds. No more disappointment.", tone: "ember" },
  { icon: Utensils, title: "Menu discovery", desc: "Search, filter, veg/non-veg, allergen badges, ratings, and 3D flip-cards for the full story on every dish.", tone: "coral" },
  { icon: Clock, title: "No more waiting", desc: "Smart reservations auto-assign tables. Walk-in queue shows live position and ETA to every guest.", tone: "ember" },
  { icon: ChefHat, title: "Zero comms lag", desc: "One order flows Placed → Preparing → Ready → Served across customer, floor, and kitchen simultaneously.", tone: "coral" },
  { icon: Boxes, title: "Auto billing & inventory", desc: "Every order auto-generates an itemized bill and quietly decrements ingredient stock behind the scenes.", tone: "ember" },
  { icon: Users, title: "Unified staff view", desc: "One shared source of truth for tables, orders, requests — floor and back-of-house finally speak the same language.", tone: "coral" },
  { icon: BarChart3, title: "AI-powered insights", desc: "Gemini turns raw data into plain-English weekly summaries, demand forecasts, and inventory predictions.", tone: "ember" },
];

const container = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 24 } } };

export default function Landing() {
  return (
    <div className="relative overflow-hidden">
      {/* HERO */}
      <section className="relative min-h-[calc(100vh-4rem)] max-w-[1400px] mx-auto px-6 md:px-12 py-12 md:py-20">
        <div className="grid lg:grid-cols-2 gap-8 items-center relative">
          <motion.div variants={container} initial="hidden" animate="visible" className="space-y-6 relative z-10">
            <motion.div variants={item} className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ember-400/10 border border-ember-400/30">
                <Sparkles className="w-3.5 h-3.5 text-ember-400" />
                <span className="text-xs uppercase tracking-[0.25em] text-ember-400">VibeAthon 6.0 · Smart Restaurant OS</span>
              </div>
              <VegBadge size="sm" />
            </motion.div>
            <motion.h1 variants={item} className="font-display text-5xl sm:text-6xl lg:text-7xl leading-[0.95] tracking-tight">
              The restaurant<br /><span className="italic text-ember-400">runs itself</span>.<br />You run the show.
            </motion.h1>
            <motion.p variants={item} className="text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed">
              Ember &amp; Oak is the operating system for modern dining — a live digital menu,
              smart reservations, real-time kitchen &amp; floor coordination, auto-billing, and
              Gemini-powered intelligence, all in one place.
            </motion.p>
            <motion.div variants={item} className="flex flex-wrap gap-3">
              <Link to="/menu" data-testid="landing-menu-btn" className="group inline-flex items-center gap-2 px-6 py-3 rounded-full bg-ember-400 text-neutral-900 font-semibold hover:bg-ember-500 transition-colors">
                Explore the menu
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link to="/login" data-testid="landing-login-btn" className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-border hover:bg-secondary transition-colors">
                Restaurant sign-in
              </Link>
            </motion.div>
            <motion.div variants={item} className="grid grid-cols-3 gap-6 pt-4 max-w-md">
              {[
                { n: "7", l: "Problems solved" },
                { n: "4", l: "Role dashboards" },
                { n: "AI", l: "Gemini insights" },
              ].map((s) => (
                <div key={s.l}>
                  <div className="font-display text-4xl text-ember-400">{s.n}</div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">{s.l}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>
          <div className="relative h-[380px] sm:h-[520px] w-full">
            <Suspense fallback={<div className="w-full h-full rounded-3xl bg-gradient-to-br from-ember-400/20 to-coral-500/20 animate-pulse" />}>
              <Hero3D />
            </Suspense>
            <div className="absolute inset-0 pointer-events-none rounded-3xl bg-gradient-to-t from-background to-transparent opacity-40" />
          </div>
        </div>
      </section>

      {/* PURE VEG BANNER */}
      <section className="relative max-w-[1400px] mx-auto px-6 md:px-12 pt-2 pb-4">
        <PureVegBanner />
      </section>

      {/* PROBLEMS -> SOLUTIONS */}
      <section className="relative max-w-[1400px] mx-auto px-6 md:px-12 py-16">
        <div className="mb-12">
          <div className="text-xs uppercase tracking-[0.3em] text-ember-400 mb-3">The 7 pain points we eliminate</div>
          <h2 className="font-display text-4xl sm:text-5xl tracking-tight max-w-2xl">
            Fine dining shouldn't feel like <span className="italic text-coral-500">a spreadsheet</span> on fire.
          </h2>
        </div>
        <motion.div variants={container} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {PROBLEMS.map((p, i) => (
            <motion.div
              key={p.title}
              variants={item}
              whileHover={{ y: -6 }}
              className="group relative p-6 rounded-2xl border border-border bg-card hover:border-ember-400/40 transition-colors overflow-hidden"
            >
              <div className={`absolute -top-8 -right-8 w-32 h-32 rounded-full blur-2xl opacity-0 group-hover:opacity-30 transition-opacity ${p.tone === "ember" ? "bg-ember-400" : "bg-coral-500"}`} />
              <div className={`inline-flex w-10 h-10 rounded-xl items-center justify-center mb-4 ${p.tone === "ember" ? "bg-ember-400/15 text-ember-400" : "bg-coral-500/15 text-coral-500"}`}>
                <p.icon className="w-5 h-5" />
              </div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">0{i + 1}</div>
              <h3 className="font-display text-2xl mb-2">{p.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ROLES */}
      <section className="relative max-w-[1400px] mx-auto px-6 md:px-12 py-16">
        <div className="text-xs uppercase tracking-[0.3em] text-ember-400 mb-3">One platform · four roles</div>
        <h2 className="font-display text-4xl sm:text-5xl tracking-tight mb-10">Built for every seat in the house.</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: "Customer", desc: "Browse the flip-card menu, book, queue, order, track & pay.", color: "from-ember-400 to-coral-500" },
            { title: "Server / Staff", desc: "Table map, live order queue, seat reservations, walk-in queue.", color: "from-coral-500 to-ember-400" },
            { title: "Kitchen (KDS)", desc: "Kanban board of incoming tickets. Toggle availability. Ship food faster.", color: "from-ember-400 to-coral-500" },
            { title: "Admin / Owner", desc: "Analytics, AI insights, inventory, staff & full operational visibility.", color: "from-coral-500 to-ember-400" },
          ].map((r, i) => (
            <div key={i} className="relative p-6 rounded-2xl border border-border bg-card overflow-hidden">
              <div className={`w-full h-1 bg-gradient-to-r ${r.color} rounded-full mb-4`} />
              <h3 className="font-display text-2xl mb-2">{r.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{r.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative max-w-[1400px] mx-auto px-6 md:px-12 py-24">
        <div className="relative rounded-3xl p-10 md:p-16 border border-ember-400/30 bg-gradient-to-br from-ember-400/10 to-coral-500/10 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-ember-400/20 blur-3xl" />
          <div className="relative">
            <h2 className="font-display text-4xl sm:text-5xl tracking-tight mb-4 max-w-2xl">
              Taste the future of <span className="italic text-ember-400">restaurant operations</span>.
            </h2>
            <p className="text-muted-foreground max-w-xl mb-8">
              Sign in as a diner or the restaurant owner to explore every dashboard, every flow, and every AI feature — all wired to real data.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/register" data-testid="cta-signup" className="px-6 py-3 rounded-full bg-ember-400 text-neutral-900 font-semibold hover:bg-ember-500">Create account</Link>
              <Link to="/menu" data-testid="cta-menu" className="px-6 py-3 rounded-full border border-border hover:bg-secondary">Browse menu</Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="max-w-[1400px] mx-auto px-6 md:px-12 py-10 text-xs text-muted-foreground border-t border-border">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>© {new Date().getFullYear()} Ember &amp; Oak · Smart Restaurant OS · Built for VibeAthon 6.0</div>
          <div className="uppercase tracking-widest">React · FastAPI · MongoDB · Gemini 3 Flash</div>
        </div>
      </footer>
    </div>
  );
}
