// Czyste agregacje do sekcji „Czwartkowy zrzut” w /admin/analytics.

/** Każdy subskrybent liczony raz na lotnisko z jego tablicy; sortowanie malejąco po liczbie, potem po kodzie. */
export function countAirports(
  rows: { airports: string[] | null }[]
): { airport: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const code of new Set(row.airports ?? [])) {
      if (!code) continue;
      counts.set(code, (counts.get(code) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([airport, count]) => ({ airport, count }))
    .sort((a, b) => b.count - a.count || a.airport.localeCompare(b.airport));
}

/** N najnowszych unikalnych tygodni (klucze „YYYY-Www” sortują się leksykograficznie), najnowszy pierwszy. */
export function latestWeeks(weeks: string[], n: number): string[] {
  return [...new Set(weeks)].sort().reverse().slice(0, n);
}

/** Czy błąd PostgREST/Postgres oznacza brak tabeli (migracja niezastosowana). */
export function isMissingTableError(error: { code?: string } | null | undefined): boolean {
  return error?.code === "42P01" || error?.code === "PGRST205";
}
