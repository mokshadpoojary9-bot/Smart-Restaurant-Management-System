import { useEffect, useRef, useState } from "react";
import { Mic, Square, Trash2, Loader2, Play, Pause, Wand2 } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
/**
 * Chef Voice Notes — kitchen/admin only recorder + list.
 * Uses MediaRecorder API; audio saved as base64 in MongoDB.
 */
export default function ChefVoiceNotes({ menu = [] }) {
  const [notes, setNotes] = useState([]);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [dishId, setDishId] = useState("");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewBlob, setPreviewBlob] = useState(null);
  const [duration, setDuration] = useState(0);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const load = async () => {
    try { const { data } = await api.get("/voice-notes"); setNotes(data); } catch {}
  };
  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, []);

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Microphone not supported in this browser");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime });
        setPreviewBlob(blob);
        setPreviewUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      rec.start();
      mediaRef.current = rec;
      setRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
      // auto stop at 60s
      setTimeout(() => { if (mediaRef.current?.state === "recording") stop(); }, 60_000);
    } catch (e) {
      toast.error("Microphone access denied");
    }
  };

  const stop = () => {
    if (mediaRef.current?.state === "recording") mediaRef.current.stop();
    clearInterval(timerRef.current);
    setRecording(false);
  };

  const discard = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewBlob(null);
    setDuration(0);
  };

  const upload = async () => {
    if (!previewBlob) return;
    setBusy(true);
    try {
      const base64 = await blobToBase64(previewBlob);
      const dish = menu.find((m) => m.id === dishId);
      await api.post("/voice-notes", {
        audio_base64: base64,
        mime_type: previewBlob.type || "audio/webm",
        message,
        dish_id: dish?.id || null,
        dish_name: dish?.name || null,
        duration_seconds: duration,
      });
      toast.success("Voice note posted to tonight's specials");
      discard();
      setMessage("");
      setDishId("");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Upload failed");
    } finally { setBusy(false); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this voice note?")) return;
    try { await api.delete(`/voice-notes/${id}`); load(); } catch {}
  };

  return (
    <div className="p-5 rounded-2xl border border-ember-400/30 bg-card">
      <div className="flex items-center gap-2 mb-3">
        <Wand2 className="w-4 h-4 text-ember-400" />
        <div className="text-xs uppercase tracking-[0.3em] text-ember-400">Chef's voice notes</div>
      </div>
      <p className="text-sm text-muted-foreground mb-4">Record a 5–60s tip about tonight's specials. Diners see it as a listen-widget above the menu.</p>

      <div className="grid md:grid-cols-[1fr_320px] gap-4 items-start">
        <div className="p-4 rounded-xl border border-border">
          {!previewUrl ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <motion.button
                data-testid="vn-record-btn"
                onClick={recording ? stop : start}
                whileTap={{ scale: 0.92 }}
                className={`w-20 h-20 rounded-full flex items-center justify-center ${recording ? "bg-coral-500" : "bg-ember-400"} text-neutral-900`}
                aria-label={recording ? "Stop recording" : "Start recording"}
              >
                {recording ? <Square className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
              </motion.button>
              <div className="text-sm text-muted-foreground">
                {recording ? <span className="text-coral-500 font-semibold">● Recording · {duration}s</span> : "Tap to record"}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <audio data-testid="vn-preview" src={previewUrl} controls className="w-full" />
              <div className="flex gap-2">
                <button data-testid="vn-discard" onClick={discard} className="flex-1 h-10 rounded-full border border-border text-sm">Discard</button>
                <button data-testid="vn-upload" onClick={upload} disabled={busy} className="flex-1 h-10 rounded-full bg-ember-400 text-neutral-900 font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-1">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Post note
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Dish (optional)</span>
            <select data-testid="vn-dish" value={dishId} onChange={(e) => setDishId(e.target.value)} className="mt-1 w-full h-10 rounded-xl border border-border bg-background px-3">
              <option value="">— No specific dish —</option>
              {menu.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Text caption (optional)</span>
            <input data-testid="vn-msg" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={200} className="mt-1 w-full h-10 rounded-xl border border-border bg-background px-3" placeholder="Tonight the ribeye is on point..." />
          </label>
        </div>
      </div>

      <div className="mt-6">
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Live on the guest menu</div>
        {notes.length === 0 ? (
          <div className="text-sm text-muted-foreground">No voice notes yet. Post one and it'll appear on every diner's menu instantly.</div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {notes.map((n) => (
                <motion.div key={n.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="p-3 rounded-xl border border-border bg-background/60" data-testid={`vn-item-${n.id}`}>
                  <MiniPlayer note={n} />
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="min-w-0 text-xs text-muted-foreground">
                      {n.dish_name && <span className="font-semibold text-foreground">{n.dish_name}</span>}
                      {n.dish_name && n.message && <span> · </span>}
                      {n.message && <span className="italic">"{n.message}"</span>}
                      <span className="ml-2">{new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <button data-testid={`vn-del-${n.id}`} onClick={() => remove(n.id)} className="h-8 w-8 rounded-full text-coral-500 hover:bg-coral-500/10 shrink-0"><Trash2 className="w-3.5 h-3.5 mx-auto" /></button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(r.result.split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

/** Compact custom audio player used inside the kitchen list. */
function MiniPlayer({ note }) {
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [error, setError] = useState(false);
  const ref = useRef(null);

  const toggle = async () => {
    const a = ref.current;
    if (!a || error) return;
    if (playing) a.pause();
    else { try { await a.play(); } catch { setError(true); } }
  };

  const onTime = () => {
    const a = ref.current; if (!a) return;
    setCur(a.currentTime || 0);
    if (isFinite(a.duration)) setDur(a.duration);
  };

  const pct = dur ? (cur / dur) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <motion.button
        onClick={toggle}
        whileTap={{ scale: 0.9 }}
        className="shrink-0 w-11 h-11 rounded-full bg-gradient-to-br from-ember-400 to-coral-500 text-neutral-900 flex items-center justify-center"
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </motion.button>
      <div className="flex-1">
        <div className="flex items-end gap-[2px] h-4">
          {Array.from({ length: 24 }).map((_, i) => {
            const seed = (Math.sin(i * 1.7) + 1) / 2;
            const base = 25 + seed * 70;
            return (
              <motion.span
                key={i}
                className={`w-[3px] rounded-full ${(i / 24) < pct / 100 ? "bg-ember-400" : "bg-muted"}`}
                animate={playing ? { scaleY: [1, 0.4 + seed, 1] } : { scaleY: 1 }}
                transition={{ duration: 0.8 + seed * 0.6, repeat: playing ? Infinity : 0 }}
                style={{ height: `${base}%`, transformOrigin: "bottom" }}
              />
            );
          })}
        </div>
        <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-gradient-to-r from-ember-400 to-coral-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="text-[11px] tabular-nums text-muted-foreground shrink-0">{fmt(cur)}/{fmt(dur || note?.duration_seconds || 0)}</div>
      <audio
        ref={ref}
        src={`data:${note.mime_type};base64,${note.audio_base64}`}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setCur(0); }}
        onTimeUpdate={onTime}
        onLoadedMetadata={onTime}
        onDurationChange={onTime}
        onError={() => setError(true)}
        preload="metadata"
      />
      {error && <span className="text-[10px] text-coral-500 shrink-0">unavailable</span>}
    </div>
  );
}

function fmt(s) {
  s = Math.max(0, Math.floor(s || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r < 10 ? "0" : ""}${r}`;
}
