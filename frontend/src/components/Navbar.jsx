import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useTheme } from "@/lib/ThemeContext";
import { useCart } from "@/lib/CartContext";
import { Sun, Moon, ShoppingBag, LogOut, ChefHat, LayoutDashboard, User, Utensils, ClipboardList, CalendarRange } from "lucide-react";
import { motion } from "framer-motion";
import NotificationBell from "./NotificationBell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const { count } = useCart();
  const navigate = useNavigate();

  const roleLinks = {
    customer: [
      { to: "/menu", label: "Menu", icon: Utensils },
      { to: "/orders", label: "My Orders", icon: ClipboardList },
      { to: "/reservations", label: "Reservations", icon: CalendarRange },
    ],
    staff: [
      { to: "/staff", label: "Staff Board", icon: ClipboardList },
      { to: "/menu", label: "Menu", icon: Utensils },
    ],
    kitchen: [
      { to: "/kitchen", label: "KDS", icon: ChefHat },
    ],
    admin: [
      { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { to: "/admin/orders", label: "Orders" },
      { to: "/admin/tables", label: "Tables" },
      { to: "/admin/menu", label: "Menu" },
      { to: "/admin/inventory", label: "Inventory" },
      { to: "/admin/staff", label: "Staff" },
      { to: "/admin/analytics", label: "Analytics" },
    ],
  };

  const links = user ? roleLinks[user.role] || [] : [];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="max-w-[1400px] mx-auto flex items-center justify-between px-4 md:px-8 h-16">
        <Link to="/" className="flex items-center gap-2 group" data-testid="brand-link">
          <motion.div
            whileHover={{ rotate: -8 }}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-ember-400 to-coral-500 flex items-center justify-center"
          >
            <Utensils className="w-4 h-4 text-neutral-900" />
          </motion.div>
          <div className="flex flex-col leading-none">
            <span className="font-display text-2xl tracking-tight">Ember &amp; Oak</span>
            <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Smart Restaurant OS</span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === "/admin"}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-full text-sm transition-colors ${isActive ? "bg-ember-400/20 text-ember-500" : "text-muted-foreground hover:text-foreground"}`
              }
              data-testid={`nav-${l.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            data-testid="theme-toggle"
            className="h-9 w-9 rounded-full bg-secondary hover:bg-accent flex items-center justify-center transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {user?.role === "customer" && (
            <button
              onClick={() => navigate("/cart")}
              data-testid="cart-btn"
              className="relative h-9 w-9 rounded-full bg-secondary hover:bg-accent flex items-center justify-center"
            >
              <ShoppingBag className="w-4 h-4" />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-ember-400 text-neutral-900 text-[10px] font-semibold flex items-center justify-center">
                  {count}
                </span>
              )}
            </button>
          )}

          {user && <NotificationBell />}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button data-testid="user-menu" className="flex items-center gap-2 pl-2 pr-3 h-9 rounded-full bg-secondary hover:bg-accent">
                  <Avatar className="w-7 h-7">
                    <AvatarImage src={user.picture} />
                    <AvatarFallback className="text-xs bg-ember-400 text-neutral-900">{user.name?.[0] || "U"}</AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm">{user.name?.split(" ")[0]}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="text-sm">{user.name}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-widest">{user.role}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} data-testid="logout-btn">
                  <LogOut className="w-4 h-4 mr-2" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/login" data-testid="login-nav" className="px-4 h-9 rounded-full bg-ember-400 text-neutral-900 hover:bg-ember-500 flex items-center gap-2 text-sm font-semibold">
              <User className="w-4 h-4" /> Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
