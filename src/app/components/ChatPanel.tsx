"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  role: "user" | "model";
  parts: [{ text: string }];
}

interface Props {
  tripId: string;
  city: string;
}

export default function ChatPanel({ tripId, city }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    const userMsg: Message = { role: "user", parts: [{ text }] };
    const next = [...messages, userMsg];
    setMessages(next);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId, messages: next }),
      });
      const data = await res.json();
      if (data.text) {
        setMessages((prev) => [...prev, { role: "model", parts: [{ text: data.text }] }]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "model", parts: [{ text: "Przepraszam, wystąpił błąd. Spróbuj ponownie." }] },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const SUGGESTIONS = [
    "Gdzie tanio zjeść w pobliżu centrum?",
    "Co zrobić jeśli pada deszcz?",
    "Jak dojechać z lotniska?",
    "Jakie są darmowe atrakcje?",
  ];

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-xl transition-transform hover:scale-105 active:scale-95"
        style={{ background: "var(--accent)", color: "white" }}
        aria-label="Zapytaj AI o plan"
      >
        💬
      </button>

      {/* Drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/30"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 350 }}
              className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-3xl shadow-2xl"
              style={{
                background: "var(--bg-primary)",
                maxHeight: "80dvh",
                maxWidth: 448,
                margin: "0 auto",
              }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full" style={{ background: "var(--border)" }} />
              </div>

              {/* Header */}
              <div className="px-5 pb-3 flex items-center justify-between border-b" style={{ borderColor: "var(--border)" }}>
                <div>
                  <p className="font-bold text-sm">💬 Zapytaj AI</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    Asystent zna Twój plan — {city}
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="text-lg leading-none transition-opacity hover:opacity-60"
                  style={{ color: "var(--text-muted)" }}
                >
                  ×
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3" style={{ minHeight: 200 }}>
                {messages.length === 0 && (
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>
                      Sugestie pytań:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {SUGGESTIONS.map((s) => (
                        <button
                          key={s}
                          onClick={() => { setInput(s); }}
                          className="text-xs px-3 py-1.5 rounded-full font-medium transition-opacity hover:opacity-70"
                          style={{ background: "var(--accent-light)", color: "var(--accent)" }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
                      style={{
                        background: msg.role === "user" ? "var(--accent)" : "var(--bg-surface)",
                        color: msg.role === "user" ? "white" : "var(--text-primary)",
                        border: msg.role === "model" ? "1px solid var(--border)" : "none",
                      }}
                    >
                      {msg.parts[0].text}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div
                      className="flex items-center gap-1.5 rounded-2xl px-4 py-3"
                      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
                    >
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full animate-bounce"
                          style={{
                            background: "var(--text-muted)",
                            animationDelay: `${i * 0.15}s`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div
                className="px-4 py-3 flex gap-2 border-t"
                style={{ borderColor: "var(--border)", paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                  placeholder={`Zapytaj o ${city}…`}
                  className="flex-1 px-4 py-2.5 rounded-2xl text-sm outline-none"
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                  }}
                  disabled={loading}
                />
                <button
                  onClick={send}
                  disabled={loading || !input.trim()}
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-opacity disabled:opacity-40"
                  style={{ background: "var(--accent)", color: "white" }}
                >
                  ↑
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
