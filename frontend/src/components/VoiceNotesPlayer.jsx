import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Play, Pause, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

/**
 * Custom, functional Chef Voice Notes player — carousel with big play button,
 * animated waveform bars, seek bar, chef byline, and dish tag.
 */
export default function VoiceNotesPlayer() {
  const [notes, setNotes] = useState([]);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get("/voice-notes");
        setNotes(data);
        // clamp idx when list shrinks
        setIdx((i) => (i >= data.length ? 0 : i));
      } catch {}
    };
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  const note = notes[idx];

  // Reset player when switching notes
  useEffect(() => {
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [note?.id]);

  const toggle = async () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); }
    else {
      try { await a.play(); } catch (e) { /* ignore */ }
    }
  };

  const onTime = () => {
    const a = audioRef.current;
    if (!a) return;
    setCurrent(a.currentTime || 0);
    if (isFinite(a.duration)) setDuration(a.duration);
  };

  const seek = (e) => {
    const a = audioRef.current;
    if (!a || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    a.currentTime = pct * duration;
    setCurrent(a.currentTime);
  };

  if (!notes || notes.length === 0) return null;

  const dur = duration || note?.duration_seconds || 0;
  const pct = dur ? (current / dur) * 100 : 0;

  const prev = () => setIdx((i) => (i - 1 + notes.length) % notes.length);
  const next = () => setIdx((i) => (i + 1) % notes.length);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 relative overflow-hidden rounded-2xl border border-coral-500/30"
      data-testid="voice-notes-player"
    >
      {/* Gradient backdrop */}
      <div className="absolute inset-0 bg-gradient-to-br from-coral-500/15 via-ember-400/10 to-transparent" />
      <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-coral-500/20 blur-3xl" />
      <div className="absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-ember-400/15 blur-3xl" />

      <div className="relative p-5 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <motion.div
              animate={playing ? { scale: [1, 1.08, 1] } : { scale: 1 }}
              transition={{ repeat: playing ? Infinity : 0, duration: 1.4 }}
              className="w-10 h-10 rounded-full bg-coral-500/20 text-coral-500 flex items-center justify-center"
            >
              <Mic className="w-4 h-4" />
            </motion.div>
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-coral-500 inline-flex items-center gap-1">
                Chef's note <Sparkles className="w-3 h-3 text-ember-400" />
              </div>
              <div className="text-sm text-muted-foreground">Straight from the pass — tonight's tip.</div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {idx + 1} / {notes.length}
          </div>
        </div>

        {/* Player card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={note.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="rounded-2xl bg-background/70 backdrop-blur border border-border p-4 md:p-5"
            data-testid={`chef-note-${note.id}`}
          >
            <div className="flex items-center gap-4">
              {/* Play/pause */}
              <motion.button
                onClick={toggle}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                data-testid={`chef-note-play-${note.id}`}
                aria-label={playing ? "Pause" : "Play"}
                className="shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-ember-400 to-coral-500 text-neutral-900 flex items-center justify-center shadow-lg shadow-ember-500/30"
              >
                {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
              </motion.button>

              <div className="flex-1 min-w-0">
                {note.dish_name && (
                  <div className="text-sm font-semibold truncate flex items-center gap-1">
                    <span className="text-ember-400">▲</span> {note.dish_name}
                  </div>
                )}
                {note.message ? (
                  <div className="text-sm text-muted-foreground italic line-clamp-2 font-display">"{note.message}"</div>
                ) : (
                  <div className="text-sm text-muted-foreground">Tap play to listen.</div>
                )}

                {/* Waveform bars */}
                <div className="mt-2 flex items-end gap-[3px] h-6" aria-hidden>
                  {Array.from({ length: 32 }).map((_, i) => {
                    const seed = (Math.sin(i * 1.3) + 1) / 2; // 0..1 pseudo random
                    const base = 20 + seed * 80; // 20..100%
                    return (
                      <motion.span
                        key={i}
                        className={`w-[3px] rounded-full ${i / 32 < pct / 100 ? "bg-ember-400" : "bg-muted"}`}
                        animate={playing ? { scaleY: [1, 0.5 + seed, 1, 0.4 + seed * 1.2, 1] } : { scaleY: 1 }}
                        transition={{ duration: 0.9 + seed * 0.6, repeat: playing ? Infinity : 0, delay: i * 0.02 }}
                        style={{ height: `${base}%`, transformOrigin: "bottom" }}
                      />
                    );
                  })}
                </div>

                {/* Seek bar */}
                <div
                  className="mt-2 h-1.5 rounded-full bg-muted cursor-pointer relative overflow-hidden"
                  onClick={seek}
                  data-testid={`chef-note-seek-${note.id}`}
                  role="slider"
                  aria-valuenow={Math.round(pct)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-ember-400 to-coral-500 rounded-full"
                    animate={{ width: `${pct}%` }}
                    transition={{ ease: "linear", duration: 0.1 }}
                  />
                </div>

                {/* Meta line */}
                <div className="mt-2 flex items-center justify-between text-[11px] uppercase tracking-widest text-muted-foreground">
                  <span>{formatTime(current)} / {formatTime(dur)}</span>
                  <span>
                    {note.chef_name || "Chef"} · {new Date(note.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            </div>

            {/* Hidden native audio driver */}
            <audio
              ref={audioRef}
              src={`data:${note.mime_type};base64,${note.audio_base64}`}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => { setPlaying(false); setCurrent(0); }}
              onTimeUpdate={onTime}
              onLoadedMetadata={onTime}
              onDurationChange={onTime}
              preload="metadata"
            />
          </motion.div>
        </AnimatePresence>

        {/* Nav */}
        {notes.length > 1 && (
          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={prev}
              data-testid="chef-note-prev"
              className="inline-flex items-center gap-1 text-xs px-3 h-8 rounded-full border border-border hover:bg-secondary"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>
            <div className="flex gap-1.5">
              {notes.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  data-testid={`chef-note-dot-${i}`}
                  aria-label={`Go to note ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-ember-400" : "w-1.5 bg-muted hover:bg-ember-400/50"}`}
                />
              ))}
            </div>
            <button
              onClick={next}
              data-testid="chef-note-next"
              className="inline-flex items-center gap-1 text-xs px-3 h-8 rounded-full border border-border hover:bg-secondary"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function formatTime(s) {
  s = Math.max(0, Math.floor(s || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r < 10 ? "0" : ""}${r}`;
}
