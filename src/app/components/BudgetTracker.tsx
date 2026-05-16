"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  tripId: string;
  plannedBreakdown: {
    flights: string;
    accommodation: string;
    food: string;
    attractions: string;
  };
  plannedTotal: string;
}

const CATEGORIES = [
  { key: "flights", label: "Loty", emoji: "✈️" },
  { key: "accommodation", label: "Nocleg", emoji: "🛏️" },
  { key: "food", label: "Jedzenie", emoji: "🍽️" },
  { key: "transport", label: "Transport", emoji: "🚌" },
  { key: "attractions", label: "Atrakcje", emoji: "🎟️" },
  { key: "other", label: "Inne", emoji: "🛍️" },
] as const;

type CategoryKey = typeof CATEGORIES[number]["key"];

function parsePln(str: string): number {
  const match = str.match(/[\d\s]+/);
  if (!match) return 0;
  return parseInt(match[0].replace(/\s/g, ""), 10) || 0;
}

export default function BudgetTracker({ tripId, plannedBreakdown, plannedTotal }: Props) {
  const [open, setOpen] = useState(false);
  const [expenses, setExpenses] = useState<Record<CategoryKey, number>>({
    flights: 0, accommodation: 0, food: 0, transport: 0, attractions: 0, other: 0,
  });

  const storageKey = `wloczykij-budget-${tripId}`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setExpenses(JSON.parse(saved));
    } catch { /* ignore */ }
  }, [storageKey]);

  const update = (key: CategoryKey, value: number) => {
    const next = { ...expenses, [key]: Math.max(0, value) };
    setExpenses(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* ignore */ }
  };

  const totalSpent = Object.values(expenses).reduce((a, b) => a + b, 0);
  const totalPlanned = parsePln(plannedTotal);
  const diff = totalSpent - totalPlanned;
  const overBudget = diff > 0;

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
        style={{ background: "#F0F0F0", color: "var(--text-secondary)" }}
      >
        💰 {open ? "Ukryj tracker budżetu ↑" : "Śledź wydatki vs plan"}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 glass-card p-4 flex flex-col gap-4">
              {/* Total */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>WYDANO</p>
                  <p className="text-2xl font-bold" style={{ color: overBudget ? "#B91C1C" : "var(--text-primary)" }}>
                    {totalSpent.toLocaleString("pl-PL")} PLN
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>PLAN</p>
                  <p className="text-lg font-semibold" style={{ color: "var(--text-secondary)" }}>
                    {plannedTotal}
                  </p>
                </div>
              </div>

              {/* Diff indicator */}
              <div
                className="flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold"
                style={{
                  background: overBudget ? "#FEF2F2" : "#DCFCE7",
                  color: overBudget ? "#B91C1C" : "#16A34A",
                }}
              >
                <span>{overBudget ? "⚠️" : "✓"}</span>
                <span>
                  {overBudget
                    ? `${diff.toLocaleString("pl-PL")} PLN powyżej budżetu`
                    : totalSpent === 0
                    ? "Zacznij wpisywać wydatki"
                    : `${Math.abs(diff).toLocaleString("pl-PL")} PLN poniżej budżetu`}
                </span>
              </div>

              {/* Categories */}
              <div className="flex flex-col gap-3">
                {CATEGORIES.map(({ key, label, emoji }) => {
                  const planned = key === "flights" ? parsePln(plannedBreakdown.flights)
                    : key === "accommodation" ? parsePln(plannedBreakdown.accommodation)
                    : key === "food" ? parsePln(plannedBreakdown.food)
                    : key === "attractions" ? parsePln(plannedBreakdown.attractions)
                    : null;

                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold">
                          {emoji} {label}
                        </span>
                        {planned !== null && (
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                            plan: ~{planned} PLN
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => update(key, expenses[key] - 10)}
                          className="w-8 h-8 rounded-lg text-sm font-bold flex items-center justify-center flex-shrink-0 transition-opacity hover:opacity-70"
                          style={{ background: "#F0F0F0", color: "var(--text-secondary)" }}
                        >
                          −
                        </button>
                        <div className="flex-1 relative">
                          <input
                            type="number"
                            min={0}
                            value={expenses[key] || ""}
                            placeholder="0"
                            onChange={(e) => update(key, parseInt(e.target.value, 10) || 0)}
                            className="w-full px-3 py-2 rounded-xl text-sm font-semibold text-center outline-none"
                            style={{
                              background: "var(--bg-surface)",
                              border: "1px solid var(--border)",
                              color: "var(--text-primary)",
                            }}
                          />
                          <span
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                            style={{ color: "var(--text-muted)" }}
                          >
                            PLN
                          </span>
                        </div>
                        <button
                          onClick={() => update(key, expenses[key] + 10)}
                          className="w-8 h-8 rounded-lg text-sm font-bold flex items-center justify-center flex-shrink-0 transition-opacity hover:opacity-70"
                          style={{ background: "#F0F0F0", color: "var(--text-secondary)" }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => {
                  const reset = { flights: 0, accommodation: 0, food: 0, transport: 0, attractions: 0, other: 0 };
                  setExpenses(reset);
                  try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
                }}
                className="text-xs text-center transition-opacity hover:opacity-60"
                style={{ color: "var(--text-muted)" }}
              >
                Resetuj wydatki
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
