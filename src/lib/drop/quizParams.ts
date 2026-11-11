import { AIRPORT_BY_CODE } from "@/lib/airports";

export type DropQuizPrefill = {
  preferredCity: string;
  airports: string[];
  month: number;
  duration: number;
};

const DAY_MS = 86_400_000;

// Zwraca timestamp (UTC) albo null, gdy to nie jest prawdziwa data YYYY-MM-DD
function parseDay(s: string | null): number | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d);
  const back = new Date(t);
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== m - 1 || back.getUTCDate() !== d) return null;
  return t;
}

export function parseDropParams(p: URLSearchParams): DropQuizPrefill | null {
  if (p.get("src") !== "drop") return null;

  const city = p.get("city")?.trim();
  const from = p.get("from");
  if (!city || !from || !AIRPORT_BY_CODE.has(from)) return null;

  const depart = parseDay(p.get("depart"));
  const ret = parseDay(p.get("return"));
  if (depart === null || ret === null || ret < depart) return null;

  const duration = Math.round((ret - depart) / DAY_MS) + 1;
  if (duration < 2 || duration > 21) return null;

  return {
    preferredCity: city,
    airports: [from],
    month: new Date(depart).getUTCMonth() + 1,
    duration,
  };
}
