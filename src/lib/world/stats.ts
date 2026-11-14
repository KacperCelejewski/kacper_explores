import { CONTINENTS, COUNTRIES, type Continent } from "./countries";

export interface ContinentStat {
  continent: Continent;
  visited: number;
  total: number;
  percent: number;
}

export interface Stats {
  visited: number;
  total: number;
  percent: number;
  continents: ContinentStat[];
}

const CONTINENT_OF = new Map(COUNTRIES.map((c) => [c.iso, c.continent]));

// Procenty po liczbie krajów: każdy z 195 państw waży tyle samo. Kody spoza listy i duplikaty są pomijane.
export function countryStats(visited: Iterable<string>): Stats {
  const seen = new Set<string>();
  for (const iso of visited) if (CONTINENT_OF.has(iso)) seen.add(iso);

  const continents: ContinentStat[] = CONTINENTS.map((continent) => {
    const total = COUNTRIES.filter((c) => c.continent === continent).length;
    const count = [...seen].filter((iso) => CONTINENT_OF.get(iso) === continent).length;
    return { continent, visited: count, total, percent: (count / total) * 100 };
  });

  return { visited: seen.size, total: COUNTRIES.length, percent: (seen.size / COUNTRIES.length) * 100, continents };
}

// Całe procenty; powyżej zera, ale poniżej 1% pokazujemy "<1%", żeby pierwszy kraj nie wyglądał jak brak postępu
export function formatPercent(percent: number): string {
  if (percent <= 0) return "0%";
  if (percent < 1) return "<1%";
  return `${Math.round(percent)}%`;
}
