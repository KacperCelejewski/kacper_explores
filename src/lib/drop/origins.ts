import { POLISH_AIRPORTS } from "@/lib/airports";

// Lotniska, dla których zrzut pobiera okazje: lotniska subskrybentów idą pierwsze (przy limicie czasu
// cron przerywa od końca), a za nimi wszystkie polskie, żeby było co pokazać też osobom bez zapisu.
export function dropOrigins(subscriberAirports: Array<string[] | null | undefined>): string[] {
  const origins = new Set<string>();
  for (const list of subscriberAirports) for (const code of list ?? []) origins.add(code);
  for (const a of POLISH_AIRPORTS) origins.add(a.code);
  return [...origins];
}
