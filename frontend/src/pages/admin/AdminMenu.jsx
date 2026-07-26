import { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil } from "lucide-react";

const EMPTY = { name: "", description: "", price: 12, category: "Mains", image_url: "", is_veg: true, rating: 4.5, allergens: [], prep_minutes: 15, available: true, spice_level: 1, tags: [] };

export default function AdminMenu() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null); // item id or null
  const [form, setForm] = useState(EMPTY);

  const load = async () => {
    try { const { data } = await api.get("/menu"); setItems(data.items); } catch {}
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (m) => { setEditing(m.id); setForm({ ...m, allergens: m.allergens || [], tags: m.tags || [] }); setOpen(true); };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.patch(`/menu/${editing}`, form);
        toast.success("Updated");
      } else {
        await api.post("/menu", form);
        toast.success("Added");
      }
      setOpen(false); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Save failed"); }
  };

  const remove = async (id) => {
    if (!window.confirm("Remove this dish?")) return;
    try { await api.delete(`/menu/${id}`); toast.success("Deleted"); load(); } catch { toast.error("Delete failed"); }
  };

  const toggle = async (m) => {
    try { await api.patch(`/menu/${m.id}`, { available: !m.available }); toast.success(!m.available ? "Now available" : "Marked unavailable"); load(); }
    catch { toast.error("Toggle failed"); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-4xl">Menu items</h1>
        <button data-testid="menu-new-btn" onClick={openNew} className="h-10 px-4 rounded-full bg-ember-400 text-neutral-900 font-semibold inline-flex items-center gap-1"><Plus className="w-4 h-4" /> New</button>
      </div>

      <div className="grid gap-3">
        {items.map((m) => (
          <div key={m.id} className="p-3 rounded-2xl border border-border bg-card flex items-center gap-3" data-testid={`menu-row-${m.id}`}>
            <img src={m.image_url} alt={m.name} className="w-16 h-16 rounded-xl object-cover" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold">{m.name} <span className="text-xs text-muted-foreground">· {m.category} · ${m.price.toFixed(2)}</span></div>
              <div className="text-xs text-muted-foreground line-clamp-1">{m.description}</div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground flex items-center gap-2">
                Available <Switch data-testid={`menu-toggle-${m.id}`} checked={m.available} onCheckedChange={() => toggle(m)} />
              </label>
              <button data-testid={`menu-edit-${m.id}`} onClick={() => openEdit(m)} className="h-8 w-8 rounded-full border border-border"><Pencil className="w-3.5 h-3.5 mx-auto" /></button>
              <button data-testid={`menu-del-${m.id}`} onClick={() => remove(m.id)} className="h-8 w-8 rounded-full text-coral-500 hover:bg-coral-500/10"><Trash2 className="w-3.5 h-3.5 mx-auto" /></button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit dish" : "New dish"}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="grid grid-cols-2 gap-3">
            <FF label="Name" className="col-span-2"><input data-testid="mf-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="ib" /></FF>
            <FF label="Category"><input data-testid="mf-cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="ib" /></FF>
            <FF label="Price"><input data-testid="mf-price" type="number" step="0.5" value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) })} className="ib" /></FF>
            <FF label="Description" className="col-span-2"><textarea data-testid="mf-desc" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="ib py-2" /></FF>
            <FF label="Image URL" className="col-span-2"><input data-testid="mf-img" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="ib" /></FF>
            <FF label="Prep minutes"><input data-testid="mf-prep" type="number" value={form.prep_minutes} onChange={(e) => setForm({ ...form, prep_minutes: parseInt(e.target.value) || 0 })} className="ib" /></FF>
            <FF label="Spice (0-3)"><input data-testid="mf-spice" type="number" min="0" max="3" value={form.spice_level} onChange={(e) => setForm({ ...form, spice_level: parseInt(e.target.value) || 0 })} className="ib" /></FF>
            <FF label="Allergens (comma)"><input data-testid="mf-all" value={form.allergens.join(", ")} onChange={(e) => setForm({ ...form, allergens: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} className="ib" /></FF>
            <FF label="Tags (comma)"><input data-testid="mf-tags" value={form.tags.join(", ")} onChange={(e) => setForm({ ...form, tags: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} className="ib" /></FF>
            <label className="flex items-center gap-2 text-sm col-span-2"><Switch data-testid="mf-veg" checked={form.is_veg} onCheckedChange={(v) => setForm({ ...form, is_veg: v })} /> Vegetarian</label>
            <label className="flex items-center gap-2 text-sm col-span-2"><Switch data-testid="mf-avail" checked={form.available} onCheckedChange={(v) => setForm({ ...form, available: v })} /> Available now</label>
            <div className="col-span-2 flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="px-4 h-10 rounded-full border border-border">Cancel</button>
              <button data-testid="mf-save" type="submit" className="px-4 h-10 rounded-full bg-ember-400 text-neutral-900 font-semibold">Save</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <style>{`.ib{width:100%;height:2.5rem;border-radius:.75rem;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:0 .75rem;outline:none}
      .ib:focus{box-shadow:0 0 0 2px rgba(245,158,11,.5)}`}</style>
    </div>
  );
}
const FF = ({ label, children, className = "" }) => (
  <label className={`block ${className}`}>
    <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
    <div className="mt-1">{children}</div>
  </label>
);
