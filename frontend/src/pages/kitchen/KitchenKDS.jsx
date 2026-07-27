import { useEffect, useState } from "react";
import api from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Clock, Flame } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const COLS = [
  { key: "placed", title: "Incoming", nextKey: "preparing", nextLabel: "Start", color: "border-ember-400" },
  { key: "preparing", title: "Preparing", nextKey: "ready", nextLabel: "Mark ready", color: "border-blue-500" },
  { key: "ready", title: "Ready", nextKey: "served", nextLabel: "Serve", color: "border-emerald-500" },
  { key: "served", title: "Served", nextKey: null, nextLabel: null, color: "border-neutral-500" },
];

export default function KitchenKDS() {
  const [orders, setOrders] = useState([]);
  const [menu, setMenu] = useState([]);

  const load = async () => {
    try {
      const [o, m] = await Promise.all([api.get("/orders"), api.get("/menu")]);
      setOrders(o.data); setMenu(m.data.items);
    } catch {}
  };
  useEffect(() => { load(); const t = setInterval(load, 3000); return () => clearInterval(t); }, []);

  const advance = async (o, next) => {
    try { await api.patch(`/orders/${o.id}/status`, { status: next }); toast.success(`${o.order_no} → ${next}`); load(); }
    catch { toast.error("Update failed"); }
  };
  const toggleAvail = async (m) => {
    try { await api.patch(`/menu/${m.id}`, { available: !m.available }); toast.success(!m.available ? `${m.name} available` : `${m.name} 86'd`); load(); }
    catch { toast.error("Toggle failed"); }
  };

  const byStatus = (s) => orders.filter((o) => o.status === s).slice(0, 20);

  return (
    <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-6">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-ember-400">Kitchen Display System</div>
          <h1 className="font-display text-4xl">KDS · Line view</h1>
        </div>
        <div className="text-xs text-muted-foreground">Auto-refreshes every 3s</div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {COLS.map((c) => (
          <div key={c.key} className={`rounded-2xl border ${c.color} border-l-4 bg-card p-3 min-h-[60vh]`} data-testid={`kds-col-${c.key}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="font-display text-xl">{c.title}</div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-secondary">{byStatus(c.key).length}</span>
            </div>
            <div className="space-y-2">
              <AnimatePresence>
                {byStatus(c.key).map((o) => {
                  const age = Math.floor((Date.now() - new Date(o.created_at).getTime()) / 60000);
                  const urgent = age > (o.eta_minutes || 15);
                  return (
                    <motion.div layout key={o.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className={`p-3 rounded-xl bg-background border ${urgent && c.key !== "served" ? "border-coral-500 ring-1 ring-coral-500/50" : "border-border"}`}
                      data-testid={`kds-ord-${o.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">{o.order_no}</div>
                        <div className={`text-[10px] uppercase tracking-widest inline-flex items-center gap-1 ${urgent ? "text-coral-500" : "text-muted-foreground"}`}>
                          {urgent && <Flame className="w-3 h-3" />} <Clock className="w-3 h-3" /> {age}m
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">Table #{o.table_number || "—"}</div>
                      <div className="mt-2 text-sm">
                        {o.items.map((i) => (
                          <div key={i.item_id + i.name} className="flex justify-between">
                            <span>{i.qty}× {i.name}</span>
                            <span className="text-muted-foreground">{i.prep_minutes}m</span>
                          </div>
                        ))}
                      </div>
                      {c.nextKey && (
                        <button data-testid={`kds-adv-${o.id}`} onClick={() => advance(o, c.nextKey)} className="mt-2 w-full h-9 rounded-full bg-ember-400 text-neutral-900 font-semibold text-sm">
                          {c.nextLabel}
                        </button>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {byStatus(c.key).length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-8">Empty</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="p-5 rounded-2xl border border-border bg-card">
        <div className="text-xs uppercase tracking-[0.3em] text-ember-400 mb-3">Live availability · 86 list</div>
        <p className="text-sm text-muted-foreground mb-4">Toggle a dish off and it disappears from the guest menu in seconds.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {menu.map((m) => (
            <label key={m.id} data-testid={`kds-avail-${m.id}`} className="p-3 rounded-xl border border-border flex items-center gap-3 cursor-pointer">
              <img src={m.image_url} alt={m.name} className="w-10 h-10 rounded-lg object-cover" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{m.name}</div>
                <div className="text-xs text-muted-foreground">${m.price.toFixed(2)}</div>
              </div>
              <Switch checked={m.available} onCheckedChange={() => toggleAvail(m)} />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
