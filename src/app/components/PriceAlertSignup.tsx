"use client";

import { useState } from "react";

export default function PriceAlertSignup() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      // Re-use newsletter endpoint — subscribers get price alerts when feature ships
      await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source: "price_alert" }),
      });
      setSent(true);
    } catch {
      setSent(true); // show success anyway — don't block user
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="mt-6 p-5 rounded-2xl"
      style={{ background: "#EEF3FF", border: "1px solid #BFDBFE" }}
    >
      <div className="flex items-start gap-3 mb-4">
        <span className="text-2xl flex-shrink-0">🔔</span>
        <div>
          <p className="font-bold text-sm" style={{ color: "#1D4ED8" }}>
            Alerty cenowe — już wkrótce
          </p>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: "#3B4A6B" }}>
            Powiadomimy Cię gdy lot do Barcelony, Lizbony lub Aten spadnie poniżej Twojego budżetu.
            Zapisz email — dostaniesz alert jako pierwszy.
          </p>
        </div>
      </div>

      {sent ? (
        <div
          className="px-4 py-3 rounded-xl text-center"
          style={{ background: "#DCFCE7", border: "1px solid #BBF7D0" }}
        >
          <p className="text-sm font-bold" style={{ color: "#15803D" }}>✓ Zapisano! Powiadomimy Cię gdy alerty będą gotowe.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <label htmlFor="price-alert-email" className="sr-only">
            Email na alerty cenowe
          </label>
          <input
            id="price-alert-email"
            type="email"
            placeholder="twoj@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-1 px-4 py-3 rounded-2xl text-sm outline-none"
            style={{
              background: "#FFFFFF",
              border: "1.5px solid #BFDBFE",
              color: "var(--text-primary)",
            }}
            onFocus={(e) => { e.target.style.borderColor = "#1D4ED8"; }}
            onBlur={(e) => { e.target.style.borderColor = "#BFDBFE"; }}
          />
          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="px-4 py-3 rounded-2xl text-sm font-semibold transition-opacity disabled:opacity-50 whitespace-nowrap"
            style={{ background: "#1D4ED8", color: "white" }}
          >
            {loading ? "…" : "Zapisz się"}
          </button>
        </form>
      )}
    </div>
  );
}
