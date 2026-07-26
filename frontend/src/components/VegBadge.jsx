import { Leaf } from "lucide-react";
import { motion } from "framer-motion";

/** Prominent Pure Veg badge used across the app (nav, landing, menu banner). */
export default function VegBadge({ size = "sm", className = "" }) {
  const sizes = {
    xs: "h-6 px-2 text-[10px] gap-1",
    sm: "h-7 px-2.5 text-xs gap-1.5",
    md: "h-9 px-3 text-sm gap-2",
  };
  return (
    <motion.span
      initial={{ scale: 0.9 }}
      animate={{ scale: 1 }}
      className={`inline-flex items-center rounded-full font-semibold uppercase tracking-widest bg-emerald-500 text-white shadow-sm shadow-emerald-500/30 ${sizes[size]} ${className}`}
      title="100% Pure Vegetarian kitchen"
      data-testid="pure-veg-badge"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-white/90" />
      <Leaf className="w-3 h-3" />
      100% Pure Veg
    </motion.span>
  );
}

/** Full-width "Pure Veg Kitchen" banner strip. */
export function PureVegBanner({ className = "" }) {
  return (
    <div className={`w-full flex items-center gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/5 px-4 py-3 ${className}`} data-testid="pure-veg-banner">
      <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
        <Leaf className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs uppercase tracking-[0.3em] text-emerald-500">Pure Veg Kitchen</div>
        <div className="text-sm text-muted-foreground">Every dish, drink and dessert on our menu is 100% vegetarian. No meat, no fish, no eggs in savoury dishes.</div>
      </div>
    </div>
  );
}
