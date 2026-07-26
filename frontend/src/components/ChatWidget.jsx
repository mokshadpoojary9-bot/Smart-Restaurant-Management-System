import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, X, Sparkles } from "lucide-react";
import { API } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

export default function ChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! I'm Amber, your dining concierge. Ask me about tonight's menu, ingredients or availability." },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  if (!user) return null;

  const send = async () => {
    const q = input.trim();
    if (!q || streaming) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: q }, { role: "assistant", content: "" }]);
    setStreaming(true);
    try {
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      const res = await fetch(`${API}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("jwt") || ""}` },
        credentials: "include",
        body: JSON.stringify({ message: q }),
        signal: ctrl.signal,
      });
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() || "";
        for (const p of parts) {
          const line = p.replace(/^data:\s?/, "");
          if (line === "[DONE]" || line.startsWith("[ERROR]")) continue;
          setMessages((m) => {
            const nm = [...m];
            nm[nm.length - 1] = { role: "assistant", content: (nm[nm.length - 1].content || "") + line };
            return nm;
          });
        }
      }
    } catch (e) {
      setMessages((m) => {
        const nm = [...m];
        if (!nm[nm.length - 1].content) nm[nm.length - 1].content = "Sorry, I couldn't reach the AI. Please try again.";
        return nm;
      });
    } finally {
      setStreaming(false);
    }
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((o) => !o)}
        data-testid="chat-toggle-btn"
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-gradient-to-br from-ember-400 to-coral-500 shadow-xl shadow-ember-500/30 flex items-center justify-center text-neutral-900"
        aria-label="Open AI assistant"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-50 w-[92vw] max-w-sm h-[520px] glass-dark rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            data-testid="chat-widget"
          >
            <div className="p-4 border-b border-white/10 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-ember-300" />
              <div>
                <div className="font-display text-xl leading-none text-white">Amber</div>
                <div className="text-xs text-white/60">Gemini-powered concierge</div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${m.role === "user" ? "bg-ember-400 text-neutral-900" : "bg-white/10 text-white"}`}>
                    {m.content || <span className="inline-flex gap-1 items-center text-white/60"><span className="tick">·</span><span className="tick">·</span><span className="tick">·</span></span>}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <div className="p-3 border-t border-white/10 flex gap-2">
              <input
                data-testid="chat-input"
                className="flex-1 bg-white/5 rounded-full px-4 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-ember-400/50"
                placeholder="What's spicy tonight?"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                disabled={streaming}
              />
              <button
                data-testid="chat-send-btn"
                onClick={send}
                disabled={streaming || !input.trim()}
                className="h-10 w-10 rounded-full bg-ember-400 flex items-center justify-center text-neutral-900 disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
