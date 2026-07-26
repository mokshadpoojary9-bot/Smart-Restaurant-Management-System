import { useEffect, useState } from "react";
import api from "@/lib/api";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Cell } from "recharts";

export default function AdminAnalytics() {
  const [sum, setSum] = useState(null);
  useEffect(() => { api.get("/analytics/summary").then(({ data }) => setSum(data)).catch(() => {}); }, []);
  return (
    <div>
      <h1 className="font-display text-4xl mb-4">Analytics</h1>
      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <div className="p-5 rounded-2xl border border-border bg-card" data-testid="area-revenue">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Daily revenue</div>
          <div className="h-72"><ResponsiveContainer>
            <AreaChart data={sum?.daily_series || []}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="date" stroke="#888" fontSize={11} />
              <YAxis stroke="#888" fontSize={11} />
              <Tooltip contentStyle={{ background: "#111", border: "1px solid #333", borderRadius: 12 }} />
              <Area type="monotone" dataKey="revenue" stroke="#F59E0B" strokeWidth={2.5} fill="url(#rev)" />
            </AreaChart>
          </ResponsiveContainer></div>
        </div>
        <div className="p-5 rounded-2xl border border-border bg-card" data-testid="chart-top-items">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Top selling items</div>
          <div className="h-72"><ResponsiveContainer>
            <BarChart data={sum?.top_items || []} layout="vertical" margin={{ left: 24 }}>
              <XAxis type="number" stroke="#888" fontSize={11} />
              <YAxis type="category" dataKey="name" stroke="#888" fontSize={11} width={130} />
              <Tooltip contentStyle={{ background: "#111", border: "1px solid #333", borderRadius: 12 }} />
              <Bar dataKey="qty" radius={[0, 6, 6, 0]}>
                {(sum?.top_items || []).map((_, i) => (
                  <Cell key={i} fill={i % 2 ? "#F43F5E" : "#F59E0B"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer></div>
        </div>
      </div>
    </div>
  );
}
