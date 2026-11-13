import type { QuizAnswers } from "@/types";
import { ORIGIN_GENITIVE } from "@/lib/drop/email";

const COMPANION: Record<string, string> = { solo: "Sam/a", couple: "Para", family: "Rodzina", friends: "Znajomi" };
const BUDGET: Record<string, string> = { low: "do 1500 zł", medium: "1500–3000 zł" };
const MONTH_SHORT = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];

// Odpowiedzi z quizu w kilku krótkich frazach, do pokazania na ekranie logowania.
// Tylko to, co człowiek faktycznie wybrał; nic nie jest dopowiedziane.
export function quizSummary(a: QuizAnswers): string[] {
  const out: string[] = [];
  if (a.companion && COMPANION[a.companion]) out.push(COMPANION[a.companion]);
  if (a.budget && BUDGET[a.budget]) out.push(BUDGET[a.budget]);
  if (a.month) out.push(`${MONTH_SHORT[a.month - 1]} · ${a.duration ?? 5} dni`);
  const from = a.airports.map((c) => ORIGIN_GENITIVE[c]).filter(Boolean);
  if (from.length > 0) out.push(`z ${from.join(" lub ")}`);
  return out;
}
