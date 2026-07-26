import { useEffect, useState } from "react";
import api from "@/lib/api";
import { FlipCard } from "@/components/FlipCard";
import { motion } from "framer-motion";
import { DollarSign, ShoppingBag, TrendingUp, Sparkles, Loader2 } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";

export default function AdminDashboard() {
  const [sum, setSum] = useState(null);
  const [insight, setInsight] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [invAlerts, setInvAlerts] = useState(null);
  const [loadingInsight, setLoadingInsight] = useState(true);

  useEffect(() => {
    const load = async () => {
      try { const { data } = await api.get("/analytics/summary"); setSum(data); } catch {}
    };
    load();
    const t = setInterval(load, 6000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    (async () => {
      try { const { data } = await api.get("/ai/weekly-insight"); setInsight(data); } catch {}
      finally { setLoadingInsight(false); }
      try { const { data } = await api.get("/ai/forecast"); setForecast(data); } catch {}
      try { const { data } = await api.get("/ai/inventory-alerts"); setInvAlerts(data); } catch {}
    })();
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-ember-400">Overview</div>
          <h1 className="font-display text-4xl">Ember command center</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Revenue today"
          value={sum ? `$${sum.revenue_today.toFixed(2)}` : "—"}
          icon={DollarSign}
          detail={<div className="text-xs text-muted-foreground">Lifetime: <b className="text-foreground">${sum?.revenue_total.toFixed(2) ?? "0.00"}</b></div>}
        />
        <KpiCard
          label="Orders today"
          value={sum?.orders_today ?? "—"}
          icon={ShoppingBag}
          detail={<div className="text-xs text-muted-foreground">Total ever: <b className="text-foreground">{sum?.orders_total ?? 0}</b></div>}
        />
        <KpiCard
          label="Avg order value"
          value={sum ? `$${sum.avg_order_value.toFixed(2)}` : "—"}
          icon={TrendingUp}
          detail={<div className="text-xs text-muted-foreground">Served: <b className="text-foreground">{sum?.served_count ?? 0}</b></div>}
        />
        <KpiCard
          label="AI status"
          value="Gemini · live"
          icon={Sparkles}
          detail={<div className="text-xs text-muted-foreground">Streaming chat, forecasts &amp; insights</div>}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <Panel title="Revenue · last 7 days" testid="chart-revenue">
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={sum?.daily_series || []}>
                <CartesianGrid stroke="#333" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="#888" fontSize={11} />
                <YAxis stroke="#888" fontSize={11} />
                <Tooltip contentStyle={{ background: "#111", border: "1px solid #333", borderRadius: 12 }} />
                <Line dataKey="revenue" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Orders by hour" testid="chart-hours">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={sum?.hour_series || []}>
                <CartesianGrid stroke="#333" strokeDasharray="3 3" />
                <XAxis dataKey="hour" stroke="#888" fontSize={11} />
                <YAxis stroke="#888" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#111", border: "1px solid #333", borderRadius: 12 }} />
                <Bar dataKey="orders" fill="#F43F5E" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <Panel title="AI · weekly insight" testid="ai-insight">
          {loadingInsight ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-6"><Loader2 className="w-4 h-4 animate-spin" /> Gemini is writing your recap...</div>
          ) : insight ? (
            <div>
              <p className="text-sm leading-relaxed">{insight.summary}</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <StatMini label="Revenue" value={`$${insight.revenue.toFixed(2)}`} />
                <StatMini label="Orders" value={insight.orders} />
                <StatMini label="Top day" value={insight.top_day} />
              </div>
            </div>
          ) : <div className="text-sm text-muted-foreground">No data yet. Once orders come in, Gemini will summarise your week.</div>}
        </Panel>
        <Panel title="AI · demand forecast" testid="ai-forecast">
          {forecast ? (
            <div>
              <p className="text-sm text-muted-foreground leading-relaxed">{forecast.summary}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {forecast.top_hours.map((h) => (
                  <span key={h.hour} className="text-xs px-2 py-1 rounded-full bg-ember-400/15 text-ember-500">Peak {h.hour}:00 · {h.orders} orders</span>
                ))}
              </div>
            </div>
          ) : <div className="text-sm text-muted-foreground">Analysing your traffic patterns...</div>}
        </Panel>
      </div>

      {invAlerts && invAlerts.at_risk?.length > 0 && (
        <Panel title="AI · inventory alerts" testid="ai-inv-alerts">
          <p className="text-sm text-muted-foreground mb-3">{invAlerts.summary}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {invAlerts.at_risk.map((r) => (
              <div key={r.name} className="p-3 rounded-xl border border-coral-500/40 bg-coral-500/5">
                <div className="font-semibold">{r.name}</div>
                <div className="text-xs text-muted-foreground">{r.stock.toFixed(1)} {r.unit} left · ~{r.hours}h at current rate</div>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, detail }) {
  return (
    <FlipCard
      className="h-32 w-full"
      front={
        <div className="w-full h-full p-4 rounded-2xl border border-border bg-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
            <Icon className="w-4 h-4 text-ember-400" />
          </div>
          <div>
            <div className="font-display text-3xl">{value}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Tap for detail</div>
          </div>
        </div>
      }
      back={
        <div className="w-full h-full p-4 rounded-2xl border border-ember-400/40 bg-gradient-to-br from-neutral-900 to-neutral-950 text-white flex flex-col justify-between">
          <div className="text-xs uppercase tracking-widest text-ember-300">{label}</div>
          <div>{detail}</div>
        </div>
      }
    />
  );
}

function Panel({ title, children, testid }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} data-testid={testid} className="p-5 rounded-2xl border border-border bg-card">
      <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-3">{title}</div>
      {children}
    </motion.div>
  );
}
const StatMini = ({ label, value }) => (
  <div className="p-2 rounded-lg bg-secondary">
    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
    <div className="font-semibold">{value}</div>
  </div>
);
