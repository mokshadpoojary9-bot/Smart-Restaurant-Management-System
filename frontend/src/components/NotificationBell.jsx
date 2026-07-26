import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import api from "@/lib/api";
import { motion } from "framer-motion";

export default function NotificationBell() {
  const [items, setItems] = useState([]);
  const unread = items.filter((n) => !n.read).length;

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get("/notifications");
        setItems(data);
      } catch {}
    };
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  const markRead = async (id) => {
    try { await api.post(`/notifications/${id}/read`); } catch {}
    setItems((p) => p.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button data-testid="notif-bell" className="relative h-9 w-9 rounded-full bg-secondary hover:bg-accent flex items-center justify-center transition-colors">
          <Bell className="w-4 h-4" />
          {unread > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-coral-500 text-white text-[10px] font-semibold flex items-center justify-center"
            >
              {unread}
            </motion.span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 max-h-96 overflow-y-auto p-0">
        <div className="p-3 border-b text-xs uppercase tracking-widest font-semibold text-muted-foreground">
          Notifications
        </div>
        {items.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground text-center">Nothing yet. New activity will appear here.</div>
        ) : (
          <div className="divide-y">
            {items.map((n) => (
              <div key={n.id} className={`p-3 text-sm cursor-pointer hover:bg-accent ${n.read ? "opacity-60" : ""}`} onClick={() => markRead(n.id)} data-testid={`notif-${n.id}`}>
                <div className="flex items-start gap-2">
                  <span className={`mt-1.5 w-2 h-2 rounded-full ${n.kind === "low-stock" || n.kind === "ai-alert" ? "bg-coral-500" : "bg-ember-400"}`} />
                  <div>
                    <p>{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
