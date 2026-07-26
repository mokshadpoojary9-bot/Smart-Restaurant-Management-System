import { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { motion } from "framer-motion";

const STATUSES = ["placed", "preparing", "ready", "served", "cancelled"];
const NEXT = { placed: "preparing", preparing: "ready", ready: "served" };

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("all");
  const load = async () => { try { const { data } = await api.get("/orders"); setOrders(data); } catch {} };
  useEffect(() => { load(); const t = setInterval(load, 4000); return () => clearInterval(t); }, []);

  const update = async (id, s) => {
    try { await api.patch(`/orders/${id}/status`, { status: s }); toast.success(`Marked ${s}`); load(); }
    catch (e) { toast.error("Update failed"); }
  };

  const shown = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div>
      <h1 className="font-display text-4xl mb-4">Live orders</h1>
      <div className="flex flex-wrap gap-2 mb-4">
        <FBtn on={filter === "all"} onClick={() => setFilter("all")} label={`All (${orders.length})`} />
        {STATUSES.map((s) => (
          <FBtn key={s} on={filter === s} onClick={() => setFilter(s)} label={`${s} (${orders.filter(o => o.status === s).length})`} />
        ))}
      </div>
      {shown.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">No orders in this bucket.</div>
      ) : (
        <div className="space-y-3">
          {shown.map((o) => (
            <motion.div layout key={o.id} data-testid={`adm-ord-${o.id}`} className="p-4 rounded-2xl border border-border bg-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="font-display text-2xl">{o.order_no}</div>
                    <span className="text-xs uppercase tracking-widest px-2 py-1 rounded-full bg-secondary">{o.status}</span>
                    {o.table_number && <span className="text-xs px-2 py-1 rounded-full bg-ember-400/15 text-ember-500">Table #{o.table_number}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{new Date(o.created_at).toLocaleString()} · {o.customer_name}</div>
                </div>
                <div className="flex gap-2">
                  {NEXT[o.status] && (
                    <button data-testid={`adm-advance-${o.id}`} onClick={() => update(o.id, NEXT[o.status])} className="px-3 h-9 rounded-full bg-ember-400 text-neutral-900 text-sm font-semibold">→ {NEXT[o.status]}</button>
                  )}
                  {o.status !== "cancelled" && o.status !== "served" && (
                    <button data-testid={`adm-cancel-${o.id}`} onClick={() => update(o.id, "cancelled")} className="px-3 h-9 rounded-full border border-coral-500/40 text-coral-500 text-sm">Cancel</button>
                  )}
                </div>
              </div>
              <div className="mt-3 text-sm">
                {o.items.map((it) => (
                  <div key={it.item_id + it.name} className="flex justify-between py-1 border-t border-border first:border-t-0">
                    <span>{it.qty}× {it.name}</span>
                    <span className="text-muted-foreground">${(it.price * it.qty).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-right font-semibold text-ember-400">${o.total.toFixed(2)}</div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
const FBtn = ({ on, onClick, label }) => <button data-testid={`ord-filter-${label}`} onClick={onClick} className={`px-3 h-8 rounded-full text-xs uppercase tracking-widest ${on ? "bg-ember-400 text-neutral-900" : "border border-border"}`}>{label}</button>;
