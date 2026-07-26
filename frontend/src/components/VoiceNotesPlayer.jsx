import { useEffect, useState } from "react";
import api from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Play, Pause } from "lucide-react";

/**
 * Chef Voice Notes player widget — shown on the customer menu above dishes.
 */
export default function VoiceNotesPlayer() {
  const [notes, setNotes] = useState([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try { const { data } = await api.get("/voice-notes"); setNotes(data); } catch {}
    };
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, []);

  if (!notes || notes.length === 0) return null;

  const shown = expanded ? notes : notes.slice(0, 1);

  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="mb-6 p-4 rounded-2xl border border-coral-500/30 bg-gradient-to-r from-coral-500/10 to-ember-400/5 overflow-hidden relative">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-coral-500/20 text-coral-500 flex items-center justify-center">
          <Mic className="w-4 h-4" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-coral-500">Chef's note {notes.length > 1 ? `· ${notes.length} tonight` : ""}</div>
          <div className="text-sm text-muted-foreground">Straight from the pass — tap play for tonight's tip.</div>
        </div>
      </div>
      <div className="space-y-2">
        <AnimatePresence>
          {shown.map((n) => (
            <motion.div key={n.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="p-3 rounded-xl bg-background/60 border border-border flex flex-col md:flex-row md:items-center gap-3" data-testid={`chef-note-${n.id}`}>
              <audio src={`data:${n.mime_type};base64,${n.audio_base64}`} controls className="w-full md:w-64" />
              <div className="flex-1 min-w-0">
                {n.dish_name && <div className="text-sm font-semibold truncate">🔥 {n.dish_name}</div>}
                {n.message && <div className="text-xs text-muted-foreground line-clamp-2">"{n.message}"</div>}
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
                  {n.chef_name || "Chef"} · {new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {notes.length > 1 && (
        <button data-testid="chef-note-toggle" onClick={() => setExpanded((x) => !x)} className="mt-3 text-xs text-ember-400 hover:underline">
          {expanded ? "Show less" : `Show ${notes.length - 1} more note${notes.length - 1 > 1 ? "s" : ""}`}
        </button>
      )}
    </motion.div>
  );
}
