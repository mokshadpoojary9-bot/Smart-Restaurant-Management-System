import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "@/lib/api";
import OrderStepper from "@/components/OrderStepper";
import { Loader2, Receipt, Clock, Utensils } from "lucide-react";
import { motion } from "framer-motion";

export default function OrderTrack() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data } = await api.get(`/orders/${id}`);
        if (!cancelled) setOrder(data);
      } catch {}
      finally { if (!cancelled) setLoading(false); }
    };
    load();
    const t = setInterval(load, 3000);
    return () => { cancelled = true; clearInterval(t); };
  }, [id]);

  if (loading) return <div className="py-24 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-ember-400" /></div>;
  if (!order) return <div className="py-24 text-center text-muted-foreground">Order not found.</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-8">
      <div className="mb-2 text-xs uppercase tracking-[0.3em] text-ember-400">Live status</div>
      <div className="flex items-baseline justify-between gap-3 mb-6">
        <h1 className="font-display text-4xl">Order {order.order_no}</h1>
        <span className="text-sm text-muted-foreground inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> ETA ~{order.eta_minutes} min</span>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-2xl border border-border bg-card">
        <OrderStepper status={order.status} />
      </motion.div>

      <div className="mt-6 p-6 rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-2 mb-4">
          <Utensils className="w-4 h-4 text-ember-400" />
          <h2 className="font-display text-2xl">Your dishes</h2>
        </div>
        <div className="divide-y">
          {order.items.map((it) => (
            <div key={it.item_id + it.name} className="flex items-center justify-between py-3">
              <div>
                <div className="font-semibold">{it.name}</div>
                <div className="text-xs text-muted-foreground">Qty {it.qty} · {it.prep_minutes} min prep</div>
              </div>
              <div className="text-ember-400 font-semibold">${(it.price * it.qty).toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 p-6 rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-2 mb-4"><Receipt className="w-4 h-4 text-ember-400" /><h2 className="font-display text-2xl">Bill</h2></div>
        <div className="space-y-2 text-sm">
          <Row label="Subtotal" value={`$${order.subtotal.toFixed(2)}`} />
          <Row label="Tax" value={`$${order.tax.toFixed(2)}`} />
          <Row label="Service" value={`$${order.service_charge.toFixed(2)}`} />
          <div className="h-px bg-border my-2" />
          <Row label={<b>Total</b>} value={<b className="text-ember-400 text-lg">${order.total.toFixed(2)}</b>} />
        </div>
        {order.bill_id && (
          <Link to={`/bills/${order.bill_id}`} data-testid="view-bill" className="mt-4 inline-block text-sm text-ember-400 hover:underline">View printable receipt →</Link>
        )}
      </div>
    </div>
  );
}
const Row = ({ label, value }) => (<div className="flex items-center justify-between"><span className="text-muted-foreground">{label}</span><span>{value}</span></div>);
