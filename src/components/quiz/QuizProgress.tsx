"use client";

import { motion } from "framer-motion";
import { IconCheck } from "@/app/components/Icons";

type Props = {
  total: number;
  current: number;
  maxVisited: number;
  onJump: (step: number) => void;
};

// Stepping stones across a stream, the same crossing the hero walker makes.
// Crossed stones are brick and tappable, the current one is ringed, the rest are bare.
export default function QuizProgress({ total, current, maxVisited, onJump }: Props) {
  const fill = total > 1 ? (current / (total - 1)) * 100 : 0;

  return (
    <div
      role="progressbar"
      aria-valuenow={current + 1}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-label={`Postęp quizu: pytanie ${current + 1} z ${total}`}
      className="relative"
      style={{ height: 44 }}
    >
      {/* Stream: the water line, brick where you have already crossed */}
      <div
        aria-hidden="true"
        className="absolute rounded-full"
        style={{ left: 22, right: 22, top: 21, height: 2, background: "var(--border)" }}
      />
      <div aria-hidden="true" className="absolute" style={{ left: 22, right: 22, top: 21, height: 2 }}>
        <motion.div
          initial={false}
          animate={{ width: `${fill}%` }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{ height: "100%", background: "var(--accent)", borderRadius: 999 }}
        />
      </div>

      <ol className="relative flex justify-between h-full m-0 p-0 list-none">
        {Array.from({ length: total }).map((_, i) => {
          const done = i < current;
          const isCurrent = i === current;
          const reachable = i <= maxVisited && !isCurrent;
          return (
            <li key={i} className="flex">
              <button
                type="button"
                onClick={() => onJump(i)}
                disabled={!reachable}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`Pytanie ${i + 1}${done ? " — odpowiedziane" : ""}`}
                className="flex items-center justify-center"
                style={{
                  width: 44,
                  height: 44,
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: reachable ? "pointer" : "default",
                }}
              >
                <motion.span
                  initial={false}
                  animate={{ scale: isCurrent ? 1 : 0.86 }}
                  transition={{ type: "spring", stiffness: 420, damping: 30 }}
                  className="flex items-center justify-center"
                  style={{
                    width: 26,
                    height: 20,
                    borderRadius: "50% 50% 46% 54% / 58% 58% 42% 42%",
                    background: done || isCurrent ? "var(--accent)" : "var(--bg-surface)",
                    border: `1.5px solid ${done || isCurrent ? "var(--accent)" : "var(--border)"}`,
                    boxShadow: isCurrent
                      ? "0 0 0 3px var(--bg-primary), 0 0 0 4.5px var(--accent), 0 2px 4px rgba(28,16,8,0.18)"
                      : done
                      ? "0 1px 2px rgba(28,16,8,0.2)"
                      : "none",
                    color: "#fff",
                  }}
                >
                  {done && <IconCheck size={12} />}
                  {isCurrent && (
                    <span style={{ fontSize: 12, fontWeight: 700, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                      {i + 1}
                    </span>
                  )}
                </motion.span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
