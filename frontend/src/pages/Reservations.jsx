import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { CalendarRange, Users, Clock, Phone, User, ListOrdered, Loader2 } from "lucide-react";

export default function Reservations() {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: "", phone: "", party_size: 2, date: new Date().toISOString().slice(0, 10), time: "19:30" });
  const [busy, setBusy] = useState(false);
  const [mine, setMine] = useState([]);
  const [queue, setQueue] = useState([]);
  const [tab, setTab] = useState("reserve"); // reserve | queue

  useEffect(() => {
    if (user) {
      setForm((f) => ({ ...f, name: user.name || "" }));
    }
  }, [user]);

  const load = async () => {
    try {
      const [r, q] = await Promise.all([api.get("/reservations"), api.get("/queue")]);
      setMine(r.data);
      setQueue(q.data);
    } catch {}
  };
  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, []);

  const reserve = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/reservations", form);
      toast.success(data.table_number ? `Reserved! Table #${data.table_number} · ${data.date} at ${data.time}` : "Reservation confirmed. We'll assign a table shortly.");
      load();
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || "Failed to reserve";
      toast.error(String(msg));
    }
    finally { setBusy(false); }
  };
  const joinQueue = async () => {
    if (!form.name || !form.phone) { toast.error("Name and phone are required"); return; }
    setBusy(true);
    try {
      const { data } = await api.post("/queue", { name: form.name || user.name, phone: form.phone, party_size: form.party_size });
      toast.success(`You're #${data.position} in queue · ETA ~${data.eta_minutes}m`);
      load();
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || "Queue join failed";
      toast.error(String(msg));
    }
    finally { setBusy(false); }
  };

  const cancelRes = async (r) => {
    if (!window.confirm(`Cancel reservation on ${r.date} at ${r.time}?`)) return;
    try {
      await api.patch(`/reservations/${r.id}/status`, { status: "cancelled" });
      toast.success("Reservation cancelled");
      load();
    } catch (e) { toast.error("Cancel failed"); }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
      <div className="text-xs uppercase tracking-[0.3em] text-ember-400 mb-2">Book your table</div>
      <h1 className="font-display text-4xl mb-6">Skip the wait. Or don't — we've got you covered either way.</h1>

      <div className="flex gap-2 mb-6">
        <button data-testid="tab-reserve" onClick={() => setTab("reserve")} className={`px-4 h-9 rounded-full text-sm ${tab === "reserve" ? "bg-ember-400 text-neutral-900" : "border border-border"}`}>Reserve</button>
        <button data-testid="tab-queue" onClick={() => setTab("queue")} className={`px-4 h-9 rounded-full text-sm ${tab === "queue" ? "bg-ember-400 text-neutral-900" : "border border-border"}`}>Walk-in queue</button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <motion.div layout className="p-6 rounded-2xl border border-border bg-card">
          {tab === "reserve" ? (
            <form onSubmit={reserve} className="space-y-3">
              <Field icon={User} label="Name"><input data-testid="res-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-base" /></Field>
              <Field icon={Phone} label="Phone"><input data-testid="res-phone" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-base" placeholder="+1 555-..." /></Field>
              <div className="grid grid-cols-3 gap-2">
                <Field icon={Users} label="Guests"><input data-testid="res-party" required min={1} max={20} type="number" value={form.party_size} onChange={(e) => setForm({ ...form, party_size: Number(e.target.value) })} className="input-base" /></Field>
                <Field icon={CalendarRange} label="Date"><input data-testid="res-date" required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input-base" /></Field>
                <Field icon={Clock} label="Time"><input data-testid="res-time" required type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="input-base" /></Field>
              </div>
              <button data-testid="res-submit" disabled={busy} className="w-full h-11 rounded-full bg-ember-400 text-neutral-900 font-semibold hover:bg-ember-500 disabled:opacity-60 flex items-center justify-center gap-2">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarRange className="w-4 h-4" />} Reserve table
              </button>
            </form>
          ) : (
            <div className="space-y-3">
              <Field icon={User} label="Name"><input data-testid="q-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-base" /></Field>
              <Field icon={Phone} label="Phone"><input data-testid="q-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-base" /></Field>
              <Field icon={Users} label="Party size"><input data-testid="q-party" type="number" min={1} max={20} value={form.party_size} onChange={(e) => setForm({ ...form, party_size: Number(e.target.value) })} className="input-base" /></Field>
              <button data-testid="q-submit" disabled={busy} onClick={joinQueue} className="w-full h-11 rounded-full bg-ember-400 text-neutral-900 font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
                <ListOrdered className="w-4 h-4" /> Join queue
              </button>
              <div className="pt-3 border-t border-border">
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Live queue</div>
                {queue.length === 0 ? <div className="text-sm text-muted-foreground">No one waiting — walk right in.</div> : queue.map((q) => (
                  <div key={q.id} className="flex items-center justify-between py-2 text-sm">
                    <div><b>#{q.position}</b> · {q.name} · {q.party_size} guests</div>
                    <div className="text-muted-foreground">ETA ~{q.eta_minutes}m</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        <div className="p-6 rounded-2xl border border-border bg-card">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Your reservations</div>
          {mine.length === 0 ? (
            <div className="text-sm text-muted-foreground">You don't have any reservations yet.</div>
          ) : (
            <div className="space-y-2">
              {mine.map((r) => (
                <div key={r.id} className="p-3 rounded-xl border border-border" data-testid={`myres-${r.id}`}>
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{r.date} · {r.time}</div>
                    <span className={`text-xs uppercase tracking-widest px-2 py-1 rounded-full ${
                      r.status === "confirmed" ? "bg-ember-400/15 text-ember-500" :
                      r.status === "seated" ? "bg-emerald-500/15 text-emerald-500" :
                      r.status === "cancelled" ? "bg-coral-500/15 text-coral-500" : "bg-secondary"
                    }`}>{r.status}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{r.party_size} guests · {r.table_number ? `Table #${r.table_number}` : "Table TBD"}</div>
                  {r.status === "confirmed" && (
                    <button data-testid={`res-cancel-${r.id}`} onClick={() => cancelRes(r)} className="mt-2 text-xs text-coral-500 hover:underline">Cancel</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <style>{`.input-base{width:100%;height:2.5rem;border-radius:0.75rem;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:0 1rem;outline:none}
      .input-base:focus{box-shadow:0 0 0 2px rgba(245,158,11,.5)}`}</style>
    </div>
  );
}

function Field({ icon: Icon, label, children }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-muted-foreground inline-flex items-center gap-1 mb-1"><Icon className="w-3 h-3" />{label}</span>
      {children}
    </label>
  );
}
