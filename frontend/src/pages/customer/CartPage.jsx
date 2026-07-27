import { useState } from "react";
import { useCart } from "@/lib/CartContext";
import api from "@/lib/api";
import { toast } from "sonner";
import { Loader2, Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function CartPage() {
  const { items, setQty, remove, subtotal, count, clear } = useCart();
  const [busy, setBusy] = useState(false);
  const [tableNumber, setTableNumber] = useState("");
  const [notes, setNotes] = useState("");
  const navigate = useNavigate();

  const tax = subtotal * 0.05;
  const service = subtotal * 0.05;
  const total = subtotal + tax + service;

  const placeOrder = async () => {
    if (items.length === 0) return;
    setBusy(true);
    try {
      const { data } = await api.post("/orders", {
        items: items.map((i) => ({ item_id: i.item_id, name: i.name, price: i.price, qty: i.qty, notes: i.notes || "" })),
        table_number: tableNumber ? Number(tableNumber) : null,
        notes,
      });
      clear();
      toast.success(`Order placed! ${data.order_no}`);
      navigate(`/orders/${data.id}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to place order");
    } finally { setBusy(false); }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-[0.3em] text-ember-400 mb-2">Your order</div>
        <h1 className="font-display text-4xl">Review &amp; send to the kitchen.</h1>
      </div>

      {items.length === 0 ? (
        <div className="py-20 text-center">
          <div className="inline-flex w-16 h-16 rounded-full bg-secondary items-center justify-center mb-4">
            <ShoppingBag className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className="font-display text-3xl">Your cart is empty.</div>
          <p className="text-muted-foreground mt-2">Start with a signature dish from the menu.</p>
          <button data-testid="cart-goto-menu" onClick={() => navigate("/menu")} className="mt-6 px-5 h-11 rounded-full bg-ember-400 text-neutral-900 font-semibold">Browse menu</button>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          <div className="space-y-3">
            {items.map((i) => (
              <motion.div key={i.item_id} layout className="flex items-center gap-3 p-3 rounded-2xl border border-border bg-card">
                <img src={i.image_url} alt={i.name} className="w-20 h-20 rounded-xl object-cover" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{i.name}</div>
                  <div className="text-sm text-muted-foreground">${i.price.toFixed(2)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button data-testid={`cart-dec-${i.item_id}`} onClick={() => setQty(i.item_id, i.qty - 1)} className="h-8 w-8 rounded-full border border-border"><Minus className="w-3 h-3 mx-auto" /></button>
                  <span className="w-6 text-center" data-testid={`cart-qty-${i.item_id}`}>{i.qty}</span>
                  <button data-testid={`cart-inc-${i.item_id}`} onClick={() => setQty(i.item_id, i.qty + 1)} className="h-8 w-8 rounded-full border border-border"><Plus className="w-3 h-3 mx-auto" /></button>
                  <button data-testid={`cart-rm-${i.item_id}`} onClick={() => remove(i.item_id)} className="h-8 w-8 rounded-full text-coral-500 hover:bg-coral-500/10"><Trash2 className="w-3.5 h-3.5 mx-auto" /></button>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="p-6 rounded-2xl border border-border bg-card h-fit sticky top-20">
            <h3 className="font-display text-2xl mb-4">Bill preview</h3>
            <div className="space-y-2 text-sm">
              <Row label={`Subtotal (${count} items)`} value={`$${subtotal.toFixed(2)}`} />
              <Row label="Tax (5%)" value={`$${tax.toFixed(2)}`} />
              <Row label="Service (5%)" value={`$${service.toFixed(2)}`} />
              <div className="h-px bg-border my-2" />
              <Row label={<b>Total</b>} value={<b className="text-ember-400 text-lg">${total.toFixed(2)}</b>} />
            </div>
            <div className="mt-5 space-y-3">
              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">Table # (optional)</label>
                <input data-testid="cart-table" value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} type="number" min="1" className="mt-1 w-full h-11 rounded-xl border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-ember-400/50" placeholder="e.g. 5" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">Notes to chef</label>
                <textarea data-testid="cart-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2 outline-none focus:ring-2 focus:ring-ember-400/50" placeholder="Any allergies or preferences?" />
              </div>
              <button
                data-testid="cart-place-order"
                onClick={placeOrder} disabled={busy}
                className="w-full h-12 rounded-full bg-ember-400 text-neutral-900 font-semibold hover:bg-ember-500 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Place order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const Row = ({ label, value }) => (
  <div className="flex items-center justify-between">
    <span className="text-muted-foreground">{label}</span>
    <span>{value}</span>
  </div>
);
