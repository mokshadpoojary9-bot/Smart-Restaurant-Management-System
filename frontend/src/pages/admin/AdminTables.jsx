import { useEffect, useState } from "react";
import api from "@/lib/api";
import { FlipCard } from "@/components/FlipCard";
import { toast } from "sonner";
import { Users } from "lucide-react";

const STATUS_COLOR = { free: "bg-emerald-500/15 text-emerald-500", occupied: "bg-coral-500/15 text-coral-500", reserved: "bg-ember-400/15 text-ember-500" };

export default function AdminTables() {
  const [tables, setTables] = useState([]);
  const [orders, setOrders] = useState([]);

  const load = async () => {
    try {
      const [t, o] = await Promise.all([api.get("/tables"), api.get("/orders")]);
      setTables(t.data); setOrders(o.data);
    } catch {}
  };
  useEffect(() => { load(); const int = setInterval(load, 4000); return () => clearInterval(int); }, []);

  const cycle = async (t) => {
    const order = ["free", "reserved", "occupied"];
    const nxt = order[(order.indexOf(t.status) + 1) % order.length];
    try { await api.patch(`/tables/${t.number}`, { status: nxt }); toast.success(`Table #${t.number} → ${nxt}`); load(); }
    catch { toast.error("Update failed"); }
  };

  const orderFor = (n) => orders.find((o) => o.table_number === n && !["served", "cancelled"].includes(o.status));

  return (
    <div>
      <h1 className="font-display text-4xl mb-4">Table map</h1>
      <div className="flex gap-3 mb-4 text-xs">
        <Legend color="bg-emerald-500" label="Free" />
        <Legend color="bg-ember-400" label="Reserved" />
        <Legend color="bg-coral-500" label="Occupied" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {tables.map((t) => {
          const order = orderFor(t.number);
          return (
            <FlipCard
              key={t.number}
              className="h-40 w-full"
              front={
                <div onClick={(e) => e.stopPropagation()} className="w-full h-full rounded-2xl border border-border bg-card p-4 flex flex-col justify-between" data-testid={`tbl-${t.number}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">Table</div>
                      <div className="font-display text-4xl leading-none">#{t.number}</div>
                    </div>
                    <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded-full font-semibold ${STATUS_COLOR[t.status]}`}>{t.status}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground inline-flex items-center gap-1"><Users className="w-3 h-3" /> {t.seats} seats</span>
                    <button onClick={(e) => { e.stopPropagation(); cycle(t); }} data-testid={`tbl-cycle-${t.number}`} className="text-xs px-2 h-7 rounded-full bg-ember-400 text-neutral-900 font-semibold">Cycle</button>
                  </div>
                </div>
              }
              back={
                <div className="w-full h-full rounded-2xl border border-ember-400/40 bg-gradient-to-br from-neutral-900 to-neutral-950 text-white p-4 flex flex-col">
                  <div className="text-xs uppercase tracking-widest text-ember-300 mb-2">Table #{t.number}</div>
                  {order ? (
                    <div className="text-xs flex-1 space-y-1">
                      <div className="text-white/80 font-semibold">{order.order_no}</div>
                      <div className="text-white/60">{order.customer_name}</div>
                      <div className="text-white/60">${order.total.toFixed(2)} · {order.status}</div>
                    </div>
                  ) : (
                    <div className="text-xs text-white/50">No active order</div>
                  )}
                  <div className="text-[10px] text-white/40 text-right">tap to flip back</div>
                </div>
              }
            />
          );
        })}
      </div>
    </div>
  );
}
const Legend = ({ color, label }) => <span className="inline-flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${color}`} /> {label}</span>;
