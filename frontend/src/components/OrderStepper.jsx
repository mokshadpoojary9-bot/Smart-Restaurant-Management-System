import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "placed", label: "Placed" },
  { key: "preparing", label: "Preparing" },
  { key: "ready", label: "Ready" },
  { key: "served", label: "Served" },
];

export default function OrderStepper({ status = "placed" }) {
  const currentIdx = STEPS.findIndex((s) => s.key === status);
  return (
    <div className="w-full" data-testid="order-stepper">
      <div className="flex items-center justify-between relative">
        <div className="absolute top-5 left-5 right-5 h-1 bg-muted rounded-full" />
        <motion.div
          className="absolute top-5 left-5 h-1 bg-gradient-to-r from-ember-400 to-coral-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `calc(${(currentIdx / (STEPS.length - 1)) * 100}% - 10px)` }}
          transition={{ type: "spring", stiffness: 80, damping: 20 }}
        />
        {STEPS.map((s, i) => {
          const done = i <= currentIdx;
          const active = i === currentIdx;
          return (
            <div key={s.key} className="relative z-10 flex flex-col items-center flex-1">
              <motion.div
                animate={{ scale: active ? 1.1 : 1 }}
                transition={{ type: "spring", stiffness: 300 }}
                className={cn(
                  "w-11 h-11 rounded-full flex items-center justify-center border-2 transition-colors",
                  done ? "bg-ember-400 border-ember-400 text-neutral-900" : "bg-background border-border text-muted-foreground"
                )}
              >
                {done ? <Check className="w-5 h-5" /> : <span className="text-sm font-semibold">{i + 1}</span>}
              </motion.div>
              <span className={cn("mt-2 text-xs uppercase tracking-widest font-semibold", done ? "text-foreground" : "text-muted-foreground")}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
