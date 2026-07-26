import { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Plus, Minus, Trash2 } from "lucide-react";

export default function AdminInventory() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: "", unit: "kg", stock: 5, threshold: 2 });
  const load = async () => { try { const { data } = await api.get("/inventory"); setItems(data); } catch {} };
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    try { await api.post("/inventory", form); toast.success("Ingredient added"); load(); setForm({ name: "", unit: "kg", stock: 5, threshold: 2 }); }
    catch { toast.error("Add failed"); }
  };
  const restock = async (id, delta) => { try { await api.post(`/inventory/${id}/restock`, { delta }); load(); } catch {} };
  const remove = async (id) => { try { await api.delete(`/inventory/${id}`); load(); } catch {} };

  return (
    <div>
      <h1 className="font-display text-4xl mb-4">Inventory</h1>
      <form onSubmit={add} className="p-4 rounded-2xl border border-border bg-card grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
        <input data-testid="inv-name" required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-10 rounded-xl border border-border bg-background px-3" />
        <input data-testid="inv-unit" placeholder="Unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="h-10 rounded-xl border border-border bg-background px-3" />
        <input data-testid="inv-stock" type="number" step="0.1" placeholder="Stock" value={form.stock} onChange={(e) => setForm({ ...form, stock: parseFloat(e.target.value) })} className="h-10 rounded-xl border border-border bg-background px-3" />
        <input data-testid="inv-threshold" type="number" step="0.1" placeholder="Threshold" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: parseFloat(e.target.value) })} className="h-10 rounded-xl border border-border bg-background px-3" />
        <button data-testid="inv-add" className="h-10 rounded-full bg-ember-400 text-neutral-900 font-semibold">Add</button>
      </form>
      <div className="space-y-2">
        {items.map((i) => {
          const low = i.stock <= i.threshold;
          return (
            <div key={i.id} data-testid={`inv-row-${i.id}`} className={`p-3 rounded-2xl border ${low ? "border-coral-500/40 bg-coral-500/5" : "border-border bg-card"} flex items-center gap-3`}>
              <div className="flex-1">
                <div className="font-semibold">{i.name} <span className="text-xs text-muted-foreground">· {i.unit}</span></div>
                <div className="text-xs text-muted-foreground">Stock: <b className={low ? "text-coral-500" : ""}>{i.stock.toFixed(1)}</b> · threshold {i.threshold}</div>
              </div>
              <div className="flex items-center gap-1">
                <button data-testid={`inv-dec-${i.id}`} onClick={() => restock(i.id, -1)} className="h-8 w-8 rounded-full border border-border"><Minus className="w-3.5 h-3.5 mx-auto" /></button>
                <button data-testid={`inv-inc-${i.id}`} onClick={() => restock(i.id, 1)} className="h-8 w-8 rounded-full border border-border"><Plus className="w-3.5 h-3.5 mx-auto" /></button>
                <button data-testid={`inv-plus5-${i.id}`} onClick={() => restock(i.id, 5)} className="h-8 px-3 rounded-full bg-ember-400 text-neutral-900 text-xs font-semibold">+5</button>
                <button data-testid={`inv-del-${i.id}`} onClick={() => remove(i.id)} className="h-8 w-8 rounded-full text-coral-500"><Trash2 className="w-3.5 h-3.5 mx-auto" /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
