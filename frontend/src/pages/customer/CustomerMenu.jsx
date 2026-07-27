import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { FlipCard } from "@/components/FlipCard";
import { Search, Plus, Leaf, Star, Flame, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/lib/CartContext";
import { useAuth } from "@/lib/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import VegBadge, { PureVegBanner } from "@/components/VegBadge";

const CATS_ALL = "All";
const STOP_WORDS = new Set(["cuisine", "cuisines", "dish", "dishes", "food", "recipe", "recipes", "meal", "the", "and", "with", "some", "any", "a", "an", "of", "in", "on"]);

export default function CustomerMenu() {
  const { user } = useAuth();
  const { add } = useCart();
  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState(CATS_ALL);
  const [recs, setRecs] = useState(null);
  const [recLoading, setRecLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get("/menu");
        setItems(data.items);
        setCats([CATS_ALL, ...data.categories]);
        // Prune cart of any stale items no longer in the menu
        if (data.items?.length) {
          const validIds = new Set(data.items.map((i) => i.id));
          const raw = localStorage.getItem("cart");
          if (raw) {
            try {
              const cart = JSON.parse(raw);
              const cleaned = cart.filter((c) => validIds.has(c.item_id));
              if (cleaned.length !== cart.length) {
                localStorage.setItem("cart", JSON.stringify(cleaned));
              }
            } catch {}
          }
        }
      } catch (e) {
        // silent — will retry on next poll
      } finally { setLoading(false); }
    };
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!user || user.role !== "customer") return;
    setRecLoading(true);
    api.get("/ai/recommendations").then(({ data }) => setRecs(data)).catch(() => {}).finally(() => setRecLoading(false));
  }, [user]);

  const filtered = useMemo(() => {
    const raw = q.trim().toLowerCase();
    const words = raw.split(/\s+/).filter((w) => w && w.length >= 2 && !STOP_WORDS.has(w));
    return items.filter((i) => {
      if (cat !== CATS_ALL && i.category !== cat) return false;
      if (!words.length) return true;
      const hay = [i.name, i.description, i.category, ...(i.tags || []), ...(i.allergens || [])]
        .join(" ").toLowerCase();
      return words.some((w) => hay.includes(w));
    });
  }, [items, cat, q]);

  const onAdd = (m) => {
    if (!user) { toast.error("Please sign in to place an order"); return; }
    if (user.role !== "customer") { toast.error("Only diners can add to cart"); return; }
    if (!m.available) { toast.error(`${m.name} is currently unavailable`); return; }
    add(m);
    toast.success(`${m.name} added to cart`);
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-ember-400 mb-2">Tonight's menu</div>
          <h1 className="font-display text-4xl sm:text-5xl">Small fires, bold flavours.</h1>
          <p className="text-muted-foreground mt-2 max-w-xl">Tap any dish to flip the card and read allergens, prep time and story. Availability updates in real time.</p>
        </div>
        <VegBadge size="md" />
      </div>

      <PureVegBanner className="mb-6" />

      {/* AI Recommendations */}
      {user?.role === "customer" && (
        <div className="mb-8 p-5 rounded-2xl border border-ember-400/30 bg-ember-400/5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-ember-400" />
            <div className="text-xs uppercase tracking-[0.25em] text-ember-400">Curated for you · Gemini</div>
          </div>
          {recLoading ? (
            <div className="flex gap-3"><Skeleton className="h-24 w-1/3" /><Skeleton className="h-24 w-1/3" /><Skeleton className="h-24 w-1/3" /></div>
          ) : recs?.picks?.length ? (
            <>
              <p className="text-sm text-muted-foreground mb-3">{recs.rationale}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {recs.picks.map((p) => (
                  <div key={p.id} className="p-3 rounded-xl bg-background/60 border border-border flex gap-3 items-center" data-testid={`rec-${p.id}`}>
                    <img src={p.image_url} alt={p.name} className="w-14 h-14 rounded-lg object-cover" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{p.name}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">{p.reason}</div>
                    </div>
                    <button data-testid={`rec-add-${p.id}`} onClick={() => onAdd(p)} className="h-8 w-8 rounded-full bg-ember-400 text-neutral-900 flex items-center justify-center"><Plus className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </>
          ) : <p className="text-sm text-muted-foreground">Order a dish and we'll start tailoring picks for you.</p>}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            data-testid="menu-search"
            className="w-full h-11 pl-9 pr-3 rounded-full border border-border bg-background focus:ring-2 focus:ring-ember-400/50 outline-none"
            placeholder="Try 'paneer', 'indian', 'italian', 'spicy', 'mushroom'..."
            value={q} onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <span className="text-xs uppercase tracking-widest text-emerald-500 inline-flex items-center gap-1"><Leaf className="w-3 h-3" /> Every dish is 100% veg</span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-3 mb-6">
        {cats.map((c) => (
          <button
            key={c} onClick={() => setCat(c)} data-testid={`cat-${c}`}
            className={`px-4 h-9 whitespace-nowrap rounded-full text-sm transition-colors ${cat === c ? "bg-ember-400 text-neutral-900" : "border border-border hover:bg-secondary"}`}
          >{c}</button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-[380px] rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <>
          <div className="mb-4 p-4 rounded-xl border border-ember-400/30 bg-ember-400/5 text-sm">
            <span className="font-semibold">No exact match for "{q}"</span>
            <span className="text-muted-foreground"> — here's the rest of tonight's menu.</span>
          </div>
          <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {items
              .filter((i) => cat === CATS_ALL || i.category === cat)
              .map((m) => (
                <motion.div key={m.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                  <FlipCard
                    className="h-[380px] w-full"
                    front={<MenuFront item={m} onAdd={onAdd} />}
                    back={<MenuBack item={m} onAdd={onAdd} />}
                  />
                </motion.div>
              ))}
          </motion.div>
        </>
      ) : (
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          <AnimatePresence>
            {filtered.map((m) => (
              <motion.div key={m.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <FlipCard
                  className="h-[380px] w-full"
                  front={<MenuFront item={m} onAdd={onAdd} />}
                  back={<MenuBack item={m} onAdd={onAdd} />}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

function MenuFront({ item, onAdd }) {
  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-border bg-card">
      <div className="relative h-56">
        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/80 via-transparent to-transparent" />
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-full font-bold bg-emerald-500 text-white shadow-md inline-flex items-center gap-1" data-testid={`veg-badge-${item.id}`}>
            <Leaf className="w-3 h-3" /> VEG
          </span>
          {item.spice_level >= 2 && (
            <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-full font-semibold bg-coral-500 text-white inline-flex items-center gap-1"><Flame className="w-3 h-3" /> Spicy</span>
          )}
        </div>
        {!item.available && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <div className="px-3 py-1 rounded-full bg-coral-500 text-white text-xs uppercase tracking-widest">86'd tonight</div>
          </div>
        )}
      </div>
      <div className="p-4 h-[calc(100%-14rem)] flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-2xl leading-tight">{item.name}</h3>
          <div className="text-ember-400 font-semibold">${item.price.toFixed(2)}</div>
        </div>
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Star className="w-3 h-3 fill-ember-400 text-ember-400" /> {item.rating.toFixed(1)} · {item.category}</div>
        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{item.description}</p>
        <div className="mt-auto flex items-center justify-between">
          <span className="text-xs text-muted-foreground italic">Tap to flip →</span>
          <button
            data-testid={`add-${item.id}`}
            onClick={(e) => { e.stopPropagation(); onAdd(item); }}
            disabled={!item.available}
            className="h-9 px-3 rounded-full bg-ember-400 text-neutral-900 font-semibold hover:bg-ember-500 flex items-center gap-1 disabled:opacity-40"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>
    </div>
  );
}

function MenuBack({ item, onAdd }) {
  return (
    <div className="w-full h-full rounded-2xl border border-ember-400/40 bg-gradient-to-br from-neutral-900 to-neutral-950 text-white p-6 flex flex-col">
      <div className="text-xs uppercase tracking-[0.3em] text-ember-400 mb-3">The Story</div>
      <h3 className="font-display text-3xl leading-tight">{item.name}</h3>
      <p className="text-sm text-white/70 mt-3 leading-relaxed">{item.description}</p>
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <InfoRow label="Prep time" value={`${item.prep_minutes} min`} />
        <InfoRow label="Category" value={item.category} />
        <InfoRow label="Spice" value={"·".repeat(Math.max(1, item.spice_level))} />
        <InfoRow label="Rating" value={`${item.rating.toFixed(1)}/5`} />
      </div>
      <div className="mt-4">
        <div className="text-xs uppercase tracking-widest text-white/50 mb-1">Allergens</div>
        <div className="flex flex-wrap gap-1">
          {item.allergens.length ? item.allergens.map((a) => (
            <span key={a} className="text-[11px] px-2 py-0.5 rounded-full bg-coral-500/20 text-coral-300">{a}</span>
          )) : <span className="text-white/40 text-xs">none listed</span>}
        </div>
      </div>
      <button
        data-testid={`add-back-${item.id}`}
        onClick={(e) => { e.stopPropagation(); onAdd(item); }}
        disabled={!item.available}
        className="mt-auto h-11 rounded-full bg-ember-400 text-neutral-900 font-semibold hover:bg-ember-500 flex items-center justify-center gap-2 disabled:opacity-40"
      >
        <Plus className="w-4 h-4" /> Add to order · ${item.price.toFixed(2)}
      </button>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="rounded-xl bg-white/5 p-2">
      <div className="text-[10px] uppercase tracking-widest text-white/50">{label}</div>
      <div className="text-white text-sm">{value}</div>
    </div>
  );
}
