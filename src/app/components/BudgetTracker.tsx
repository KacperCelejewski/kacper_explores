"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { budgetComparison, plannedUpperBound } from "@/lib/priceTrust";
import { IconPlane, IconBed, IconFork, IconBus, IconTicket, IconTag, IconCoin, IconAlert, IconCheck } from "./Icons";

interface Props {
  tripId: string;
  plannedBreakdown: {
    flights: string;
    accommodation: string;
    food: string;
    attractions: string;
    transport?: string;
  };
  plannedTotal: string;
}

const CATEGORIES = [
  { key: "flights", label: "Loty", Icon: IconPlane },
  { key: "accommodation", label: "Nocleg", Icon: IconBed },
  { key: "food", label: "Jedzenie", Icon: IconFork },
  { key: "transport", label: "Transport", Icon: IconBus },
  { key: "attractions", label: "Atrakcje", Icon: IconTicket },
  { key: "other", label: "Inne", Icon: IconTag },
] as const;

type CategoryKey = typeof CATEGORIES[number]["key"];

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

  // Szacunek planu jest bez lotów, więc wydatki na loty nie liczą się do porównania z planem
  const { comparable, diff, overBudget } = budgetComparison(expenses, plannedTotal);

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
        style={{ background: "var(--bg-surface)", color: "var(--text-secondary)" }}
      >
        <span className="inline-flex items-center gap-1.5"><IconCoin size={16} />{open ? "Ukryj tracker budżetu ↑" : "Śledź wydatki vs plan"}</span>
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
                  <p className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>WYDANO NA MIEJSCU (BEZ LOTU)</p>
                  <p className="text-2xl font-bold" style={{ color: overBudget ? "var(--error)" : "var(--text-primary)" }}>
                    {comparable.toLocaleString("pl-PL")} zł
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>PLAN NA MIEJSCU (BEZ LOTU)</p>
                  <p className="text-lg font-semibold" style={{ color: "var(--text-secondary)" }}>
                    {plannedTotal}
                  </p>
                </div>
              </div>

              {/* Diff indicator */}
              <div
                className="flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold"
                style={{
                  background: overBudget ? "var(--error-bg)" : "var(--success-bg)",
                  color: overBudget ? "var(--error)" : "var(--success)",
                }}
              >
                <span>{overBudget ? <IconAlert size={16} /> : <IconCheck size={16} />}</span>
                <span>
                  {overBudget
                    ? `${diff.toLocaleString("pl-PL")} zł powyżej budżetu`
                    : comparable === 0
                    ? "Zacznij wpisywać wydatki"
                    : `${Math.abs(diff).toLocaleString("pl-PL")} zł poniżej budżetu`}
                </span>
              </div>

              {/* Categories */}
              <div className="flex flex-col gap-3">
                {CATEGORIES.map(({ key, label, Icon }) => {
                  const planned = key === "flights" ? plannedUpperBound(plannedBreakdown.flights)
                    : key === "accommodation" ? plannedUpperBound(plannedBreakdown.accommodation)
                    : key === "food" ? plannedUpperBound(plannedBreakdown.food)
                    : key === "attractions" ? plannedUpperBound(plannedBreakdown.attractions)
                    : key === "transport" && plannedBreakdown.transport ? plannedUpperBound(plannedBreakdown.transport)
                    : null;

                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold inline-flex items-center gap-1.5">
                          <Icon size={14} /> {label}
                        </span>
                        {key === "flights" ? (
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>poza sumą planu na miejscu</span>
                        ) : planned !== null && planned > 0 && (
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                            szacunek planu: ~{planned} zł
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => update(key, expenses[key] - 10)}
                          className="w-8 h-8 rounded-lg text-sm font-bold flex items-center justify-center flex-shrink-0 transition-opacity hover:opacity-70"
                          style={{ background: "var(--bg-surface)", color: "var(--text-secondary)" }}
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
                            zł
                          </span>
                        </div>
                        <button
                          onClick={() => update(key, expenses[key] + 10)}
                          className="w-8 h-8 rounded-lg text-sm font-bold flex items-center justify-center flex-shrink-0 transition-opacity hover:opacity-70"
                          style={{ background: "var(--bg-surface)", color: "var(--text-secondary)" }}
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
