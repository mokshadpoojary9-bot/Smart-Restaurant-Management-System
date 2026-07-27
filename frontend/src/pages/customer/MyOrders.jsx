import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList } from "lucide-react";

const STATUS_STYLES = {
  placed: "bg-ember-400/20 text-ember-500",
  preparing: "bg-blue-500/20 text-blue-500",
  ready: "bg-emerald-500/20 text-emerald-500",
  served: "bg-neutral-500/20 text-neutral-400",
  cancelled: "bg-coral-500/20 text-coral-500",
};

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const load = async () => {
      try { const { data } = await api.get("/orders"); setOrders(data); }
      catch (e) { /* silent retry */ }
      finally { setLoading(false); }
    };
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
      <div className="text-xs uppercase tracking-[0.3em] text-ember-400 mb-2">History</div>
      <h1 className="font-display text-4xl mb-6">Your orders</h1>
      {loading ? <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
        : orders.length === 0 ? (
          <div className="py-16 text-center">
            <ClipboardList className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
            <div className="font-display text-2xl">No orders yet.</div>
            <p className="text-muted-foreground mt-1">Your dining history will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <Link key={o.id} to={`/orders/${o.id}`} data-testid={`order-row-${o.id}`} className="block p-4 rounded-2xl border border-border bg-card hover:border-ember-400/40 transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-display text-2xl">{o.order_no}</div>
                    <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()} · {o.items.length} items</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs uppercase tracking-widest px-2 py-1 rounded-full font-semibold ${STATUS_STYLES[o.status]}`}>{o.status}</span>
                    <div className="text-ember-400 font-semibold">${o.total.toFixed(2)}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
    </div>
  );
}
