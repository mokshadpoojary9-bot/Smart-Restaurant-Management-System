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
                  className="p-3 rounded-xl border border-border flex items-center gap-3" data-testid={`vn-item-${n.id}`}>
                  <audio src={`data:${n.mime_type};base64,${n.audio_base64}`} controls className="flex-1" />
                  <div className="min-w-0 hidden md:block">
                    {n.dish_name && <div className="text-sm font-semibold truncate">{n.dish_name}</div>}
                    {n.message && <div className="text-xs text-muted-foreground truncate">{n.message}</div>}
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{new Date(n.created_at).toLocaleTimeString()}</div>
                  </div>
                  <button data-testid={`vn-del-${n.id}`} onClick={() => remove(n.id)} className="h-8 w-8 rounded-full text-coral-500 hover:bg-coral-500/10"><Trash2 className="w-3.5 h-3.5 mx-auto" /></button>
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
