"use client";

import { useMemo, useState } from "react";
import { CONTINENTS, CONTINENT_LABELS, countryName } from "@/lib/world/countries";
import { filterCountries } from "@/lib/world/search";

// Pełnoprawny sposób zaznaczania: małych krajów (Malta, Liechtenstein, Watykan) nie da się trafić palcem na globusie
export default function CountryList({ visited, onToggle }: { visited: ReadonlySet<string>; onToggle: (iso: string) => void }) {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => filterCountries(query), [query]);

  return (
    <section aria-label="Lista krajów">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Szukaj kraju…"
        aria-label="Szukaj kraju"
        style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg-surface)", fontSize: 15 }}
      />
      <div style={{ maxHeight: 420, overflowY: "auto", marginTop: 12, paddingRight: 4 }}>
        {matches.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Nic nie pasuje do „{query}”.</p>}
        {CONTINENTS.map((continent) => {
          const inGroup = matches.filter((c) => c.continent === continent);
          if (inGroup.length === 0) return null;
          return (
            <div key={continent} style={{ marginBottom: 14 }}>
              <h3 style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", margin: "0 0 6px" }}>
                {CONTINENT_LABELS[continent]}
              </h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 2 }}>
                {inGroup.map((c) => (
                  <li key={c.iso}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 4px", cursor: "pointer", fontSize: 15 }}>
                      <input type="checkbox" checked={visited.has(c.iso)} onChange={() => onToggle(c.iso)} />
                      {countryName(c.iso)}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
