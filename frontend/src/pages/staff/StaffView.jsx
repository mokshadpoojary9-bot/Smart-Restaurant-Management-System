import { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { FlipCard } from "@/components/FlipCard";

const NEXT = { placed: "preparing", preparing: "ready", ready: "served" };

export default function StaffView() {
  const [orders, setOrders] = useState([]);
  const [tables, setTables] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [queue, setQueue] = useState([]);

  const load = async () => {
    try {
      const [o, t, r, q] = await Promise.all([api.get("/orders"), api.get("/tables"), api.get("/reservations"), api.get("/queue")]);
      setOrders(o.data); setTables(t.data); setReservations(r.data); setQueue(q.data);
    } catch {}
  };
  useEffect(() => { load(); const int = setInterval(load, 4000); return () => clearInterval(int); }, []);

  const advance = async (o) => {
    const next = NEXT[o.status]; if (!next) return;
    try { await api.patch(`/orders/${o.id}/status`, { status: next }); toast.success(`${o.order_no} → ${next}`); load(); }
    catch { toast.error("Update failed"); }
  };
  const seat = async (r) => { try { await api.patch(`/reservations/${r.id}/status`, { status: "seated" }); toast.success("Seated"); load(); } catch {} };
  const seatQ = async (q) => { try { await api.patch(`/queue/${q.id}/seat`); toast.success("Seated from queue"); load(); } catch {} };

  const active = orders.filter((o) => !["served", "cancelled"].includes(o.status));

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6">
      <div className="text-xs uppercase tracking-[0.3em] text-ember-400 mb-2">Floor</div>
      <h1 className="font-display text-4xl mb-6">Staff board</h1>

      <div className="grid lg:grid-cols-3 gap-4">
        <section className="lg:col-span-2 p-5 rounded-2xl border border-border bg-card">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Active orders ({active.length})</div>
          {active.length === 0 ? <div className="text-sm text-muted-foreground py-6">All caught up.</div> : (
            <div className="space-y-2">
              {active.map((o) => (
                <motion.div layout key={o.id} data-testid={`staff-ord-${o.id}`} className="p-3 rounded-xl border border-border">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="font-display text-xl">{o.order_no} <span className="text-xs text-muted-foreground">· {o.status}</span></div>
                      <div className="text-xs text-muted-foreground">Table #{o.table_number || "—"} · {o.customer_name}</div>
                    </div>
                    {NEXT[o.status] && <button data-testid={`staff-adv-${o.id}`} onClick={() => advance(o)} className="px-3 h-9 rounded-full bg-ember-400 text-neutral-900 text-sm font-semibold">→ {NEXT[o.status]}</button>}
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">{o.items.map((i) => `${i.qty}× ${i.name}`).join(" · ")}</div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        <section className="p-5 rounded-2xl border border-border bg-card">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Table map</div>
          <div className="grid grid-cols-3 gap-2">
            {tables.map((t) => (
              <FlipCard key={t.number} className="h-24 w-full"
                front={
                  <div className={`w-full h-full rounded-xl border p-2 flex flex-col justify-between ${t.status === "free" ? "border-emerald-500/40" : t.status === "reserved" ? "border-ember-400/40" : "border-coral-500/40"}`}>
                    <div className="text-xs">#{t.number}</div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{t.status}</div>
                  </div>
                }
                back={
                  <div className="w-full h-full rounded-xl border border-ember-400/40 bg-neutral-950 text-white p-2 text-xs">
                    <div className="font-semibold">Table #{t.number}</div>
                    <div className="text-white/60">{t.seats} seats</div>
                  </div>
                }
              />
            ))}
          </div>
        </section>

        <section className="p-5 rounded-2xl border border-border bg-card">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Reservations</div>
          {reservations.length === 0 ? <div className="text-sm text-muted-foreground">None.</div> : reservations.slice(0, 8).map((r) => (
            <div key={r.id} className="py-2 flex items-center justify-between border-b last:border-b-0 border-border text-sm" data-testid={`res-${r.id}`}>
              <div>
                <div className="font-semibold">{r.name}</div>
                <div className="text-xs text-muted-foreground">{r.date} {r.time} · {r.party_size} guests · Table #{r.table_number || "?"}</div>
              </div>
              {r.status === "confirmed" && <button data-testid={`res-seat-${r.id}`} onClick={() => seat(r)} className="px-3 h-8 rounded-full bg-ember-400 text-neutral-900 text-xs font-semibold">Seat</button>}
              {r.status !== "confirmed" && <span className="text-xs uppercase tracking-widest">{r.status}</span>}
            </div>
          ))}
        </section>

        <section className="lg:col-span-2 p-5 rounded-2xl border border-border bg-card">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Walk-in queue</div>
          {queue.length === 0 ? <div className="text-sm text-muted-foreground">No one waiting.</div> : (
            <div className="space-y-2">
              {queue.map((q) => (
                <div key={q.id} className="flex items-center justify-between p-2 rounded-lg border border-border">
                  <div className="text-sm"><b>#{q.position}</b> · {q.name} · {q.party_size} guests · ETA ~{q.eta_minutes}m</div>
                  <button data-testid={`q-seat-${q.id}`} onClick={() => seatQ(q)} className="px-3 h-8 rounded-full bg-ember-400 text-neutral-900 text-xs font-semibold">Seat now</button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
