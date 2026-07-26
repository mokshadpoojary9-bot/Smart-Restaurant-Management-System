import { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Trash2, UserPlus } from "lucide-react";

export default function AdminStaff() {
  const [staff, setStaff] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "staff" });

  const load = async () => {
    try {
      const [s, c] = await Promise.all([api.get("/staff"), api.get("/customers")]);
      setStaff(s.data); setCustomers(c.data);
    } catch {}
  };
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    try { await api.post("/staff", form); toast.success("Team member added"); setForm({ name: "", email: "", password: "", role: "staff" }); load(); }
    catch (e) { toast.error(e?.response?.data?.detail || "Failed"); }
  };
  const remove = async (uid) => { if (!window.confirm("Remove this user?")) return; try { await api.delete(`/staff/${uid}`); toast.success("Removed"); load(); } catch (e) { toast.error(e?.response?.data?.detail || "Failed"); } };

  return (
    <div>
      <h1 className="font-display text-4xl mb-4">Team &amp; guests</h1>

      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Staff, kitchen &amp; admins</div>
          <div className="space-y-2 mb-8">
            {staff.map((u) => (
              <div key={u.user_id} data-testid={`staff-${u.user_id}`} className="p-3 rounded-2xl border border-border bg-card flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-ember-400/20 text-ember-500 flex items-center justify-center font-semibold">{u.name?.[0]}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{u.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                </div>
                <span className="text-xs uppercase tracking-widest px-2 py-1 rounded-full bg-secondary">{u.role}</span>
                <button data-testid={`staff-del-${u.user_id}`} onClick={() => remove(u.user_id)} className="h-8 w-8 rounded-full text-coral-500"><Trash2 className="w-3.5 h-3.5 mx-auto" /></button>
              </div>
            ))}
          </div>

          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Customers ({customers.length})</div>
          <div className="space-y-2">
            {customers.map((c) => (
              <div key={c.user_id} className="p-3 rounded-2xl border border-border bg-card flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-coral-500/20 text-coral-500 flex items-center justify-center font-semibold">{c.name?.[0]}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{c.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{c.email}</div>
                </div>
                <div className="text-xs text-muted-foreground text-right">
                  <div>{c.orders_count} orders</div>
                  <div className="text-ember-400 font-semibold">${c.total_spent.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={add} className="p-5 rounded-2xl border border-border bg-card h-fit sticky top-24 space-y-3">
          <div className="font-display text-2xl inline-flex items-center gap-2"><UserPlus className="w-4 h-4 text-ember-400" /> Add team member</div>
          <input data-testid="sf-name" required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-10 rounded-xl border border-border bg-background px-3 w-full" />
          <input data-testid="sf-email" required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-10 rounded-xl border border-border bg-background px-3 w-full" />
          <input data-testid="sf-pass" required type="password" placeholder="Temporary password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="h-10 rounded-xl border border-border bg-background px-3 w-full" />
          <select data-testid="sf-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="h-10 rounded-xl border border-border bg-background px-3 w-full">
            <option value="staff">Staff / Server</option>
            <option value="kitchen">Kitchen</option>
            <option value="admin">Admin</option>
          </select>
          <button data-testid="sf-add" className="w-full h-10 rounded-full bg-ember-400 text-neutral-900 font-semibold">Add</button>
        </form>
      </div>
    </div>
  );
}
