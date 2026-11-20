import type { QuizAnswers } from "@/types";
import { groupLabel } from "@/lib/group";
import { ORIGIN_GENITIVE } from "@/lib/drop/email";
import { monthYearShort } from "@/lib/tripMonth";

const COMPANION: Record<string, string> = { solo: "Sam/a", couple: "Para", family: "Rodzina", friends: "Znajomi" };
const BUDGET: Record<string, string> = { low: "do 1500 zł", medium: "1500–3000 zł", high: "powyżej 3000 zł" };

// Odpowiedzi z quizu w kilku krótkich frazach, do pokazania na ekranie logowania.
// Tylko to, co człowiek faktycznie wybrał; nic nie jest dopowiedziane.
export function quizSummary(a: QuizAnswers, now: Date = new Date()): string[] {
  const out: string[] = [];
  const withGroup = a.group && (a.companion === "friends" || a.companion === "family");
  if (withGroup && a.group) out.push(groupLabel(a.group));
  else if (a.companion && COMPANION[a.companion]) out.push(COMPANION[a.companion]);
  if (a.budget && BUDGET[a.budget]) out.push(BUDGET[a.budget]);
  if (a.month) {
    const when = monthYearShort(a.month, now);
    out.push(a.duration ? `${when} · ${a.duration} dni` : when);
  }
  const from = a.airports.map((c) => ORIGIN_GENITIVE[c]).filter(Boolean);
  if (from.length > 0) out.push(`z ${from.join(" lub ")}`);
  return out;
}
