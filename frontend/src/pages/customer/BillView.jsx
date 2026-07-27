import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "@/lib/api";
import { Loader2, Printer, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function BillView() {
  const { id } = useParams();
  const [bill, setBill] = useState(null);
  useEffect(() => { api.get(`/bills/${id}`).then(({ data }) => setBill(data)).catch(() => {}); }, [id]);
  if (!bill) return <div className="py-24 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-ember-400" /></div>;
  return (
    <div className="max-w-2xl mx-auto p-6 md:p-10 print:p-0">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Link to={-1} className="text-sm text-muted-foreground inline-flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> Back</Link>
        <button data-testid="print-bill" onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 h-10 rounded-full bg-ember-400 text-neutral-900 font-semibold"><Printer className="w-4 h-4" /> Print</button>
      </div>
      <div className="p-8 rounded-2xl border border-border bg-card">
        <div className="text-center mb-6">
          <div className="font-display text-3xl">Ember &amp; Oak</div>
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground mt-1">Official receipt · {bill.order_no}</div>
        </div>
        <div className="text-sm text-muted-foreground mb-4">
          <div>Guest: {bill.customer_name}</div>
          <div>Date: {new Date(bill.created_at).toLocaleString()}</div>
        </div>
        <div className="divide-y">
          {bill.items.map((i) => (
            <div key={i.item_id + i.name} className="flex items-center justify-between py-2 text-sm">
              <div><span className="font-semibold">{i.name}</span> <span className="text-muted-foreground">× {i.qty}</span></div>
              <div>${(i.price * i.qty).toFixed(2)}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t space-y-1 text-sm">
          <Row l="Subtotal" v={`$${bill.subtotal.toFixed(2)}`} />
          <Row l="Tax (5%)" v={`$${bill.tax.toFixed(2)}`} />
          <Row l="Service (5%)" v={`$${bill.service_charge.toFixed(2)}`} />
          <Row l={<b>Total</b>} v={<b className="text-ember-400 text-lg">${bill.total.toFixed(2)}</b>} />
        </div>
        <div className="mt-8 text-center text-xs text-muted-foreground">Thank you for dining with us · Ember &amp; Oak</div>
      </div>
    </div>
  );
}
const Row = ({ l, v }) => (<div className="flex justify-between"><span className="text-muted-foreground">{l}</span><span>{v}</span></div>);
