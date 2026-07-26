import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, ClipboardList, LayoutGrid, Utensils, Boxes, Users, BarChart3 } from "lucide-react";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/orders", label: "Orders", icon: ClipboardList },
  { to: "/admin/tables", label: "Tables", icon: LayoutGrid },
  { to: "/admin/menu", label: "Menu", icon: Utensils },
  { to: "/admin/inventory", label: "Inventory", icon: Boxes },
  { to: "/admin/staff", label: "Staff", icon: Users },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
];

export default function AdminLayout() {
  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6">
      <div className="grid md:grid-cols-[220px_1fr] gap-6">
        <aside className="hidden md:block sticky top-24 self-start">
          <div className="text-xs uppercase tracking-[0.3em] text-ember-400 mb-3">Admin</div>
          <nav className="space-y-1">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                data-testid={`adm-nav-${n.label.toLowerCase()}`}
                className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors ${isActive ? "bg-ember-400/15 text-ember-500" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
              >
                <n.icon className="w-4 h-4" /> {n.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <div className="md:hidden -mx-4 px-4 pb-4 overflow-x-auto flex gap-2">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `whitespace-nowrap px-3 h-9 rounded-full text-sm flex items-center gap-1 ${isActive ? "bg-ember-400 text-neutral-900" : "border border-border"}`}>
              <n.icon className="w-3.5 h-3.5" /> {n.label}
            </NavLink>
          ))}
        </div>
        <div className="min-w-0"><Outlet /></div>
      </div>
    </div>
  );
}
