import { POLISH_AIRPORTS } from "@/lib/airports";

const UTM = "utm_source=swiat&utm_medium=web&utm_campaign=world";

// Link spod wyniku mapy do okazji z lotniska zapamiętanego przez pasek na stronie głównej (klucz deals_origin).
// Nie importujemy originFromSlug z lib/drop/read, bo ten moduł ciągnie klienta Supabase do paczki przeglądarki.
export function dealsLinkFor(origin: string | null | undefined): string {
  const code = (origin ?? "").trim().toUpperCase();
  const known = POLISH_AIRPORTS.some((a) => a.code === code);
  return `/okazje/${(known ? code : "WRO").toLowerCase()}?${UTM}`;
}
