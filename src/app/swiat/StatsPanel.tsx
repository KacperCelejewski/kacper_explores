import { CONTINENT_LABELS } from "@/lib/world/countries";
import { formatPercent, type Stats } from "@/lib/world/stats";

export default function StatsPanel({ stats }: { stats: Stats }) {
  return (
    <section aria-label="Twoje liczby" style={{ padding: 20, borderRadius: 16, background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
      <p style={{ fontSize: 56, fontWeight: 700, lineHeight: 1, margin: 0, color: "var(--accent)", fontFamily: "var(--font-heading)" }}>
        {formatPercent(stats.percent)}
      </p>
      <p style={{ margin: "6px 0 0", fontSize: 15 }}>
        świata, czyli <strong>{stats.visited} z {stats.total}</strong> krajów
      </p>
      <ul style={{ listStyle: "none", padding: 0, margin: "16px 0 0", display: "grid", gap: 8 }}>
        {stats.continents.map((c) => (
          <li key={c.continent}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span>{CONTINENT_LABELS[c.continent]}</span>
              <span style={{ color: "var(--text-muted)" }}>{c.visited}/{c.total} · {formatPercent(c.percent)}</span>
            </div>
            <div role="presentation" style={{ height: 6, borderRadius: 3, background: "var(--bg-primary)", marginTop: 3 }}>
              <div style={{ height: 6, borderRadius: 3, width: `${c.percent}%`, background: "var(--accent)" }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
