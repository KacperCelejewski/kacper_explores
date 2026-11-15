import type { FlightPassengers } from "@/lib/group";
import { SKY_IDS } from "./sky-ids";

function toSkyId(iataCode: string): string {
  return (SKY_IDS[iataCode]?.skyId ?? iataCode).toLowerCase();
}

function toSkyDate(dateStr: string): string {
  const d = new Date(dateStr);
  const yy = String(d.getUTCFullYear()).slice(2);
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

export function buildSkyscannerUrl(
  originCode: string,
  destCode: string,
  departDate?: string | null,
  returnDate?: string | null,
  passengers?: FlightPassengers,
): string {
  const origin = toSkyId(originCode);
  const dest = toSkyId(destCode);

  const datePart = (departDate && returnDate)
    ? `${toSkyDate(departDate)}/${toSkyDate(returnDate)}/`
    : "";

  return `https://www.skyscanner.pl/transport/loty/${origin}/${dest}/${datePart}?adultsv2=${passengers?.adults ?? 1}&cabin_class=economy`;
}

// TODO(group): preserve the already-merged passenger contract here. Infant handling
// remains a separate group task; do not silently change its existing warning/behavior.
// Without passenger data the existing one-adult fallback remains unchanged.
// Ścieżka niesie dorosłych, potem dzieci (cyfra dzieci pomijana przy 0). Niemowląt nie kodujemy.
// Obie liczby są jednocyfrowe, bo dorośli i dzieci razem nie przekraczają MAX_GROUP (9).
function passengerCode(p?: FlightPassengers): string {
  if (!p) return "1";
  return `${p.adults}${p.children > 0 ? p.children : ""}`;
}

// Format wyszukiwania Aviasales: WRO0512BCN08121 = z WRO 5.12, powrót 8.12, 1 dorosły.
// Skyscanner dostaje tylko dorosłych, bo format wieku dzieci w adresie nie jest potwierdzony.
// Dzień i miesiąc bierzemy z tekstu daty, żeby lot po północy nie wypadał dzień wcześniej.
export function buildAviasalesUrl(
  originCode: string,
  destCode: string,
  departIso: string,
  returnIso: string,
  marker: string,
  passengers?: FlightPassengers,
): string {
  const iata = (code: string) => /^[a-z]{3}$/i.test(code) ? code.toUpperCase() : "";
  const origin = iata(originCode);
  const dest = iata(destCode);
  const valid = (iso: string) => {
    if (!/^\d{4}-\d{2}-\d{2}/.test(iso) || !Number.isFinite(Date.parse(iso))) return false;
    const date = iso.slice(0, 10);
    const parsed = new Date(`${date}T12:00:00Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
  };
  const ddmm = (iso: string) => `${iso.slice(8, 10)}${iso.slice(5, 7)}`;
  if (!origin || !dest || !valid(departIso) || (returnIso && !valid(returnIso))) {
    const params = new URLSearchParams({ params: `${origin}${dest}${passengerCode(passengers)}` });
    if (marker) params.set("marker", marker);
    return `https://www.aviasales.com/?${params}`;
  }
  const path = `${origin}${ddmm(departIso)}${dest}${returnIso ? ddmm(returnIso) : ""}${passengerCode(passengers)}`;
  const query = marker ? `?marker=${encodeURIComponent(marker)}` : "";
  return `https://www.aviasales.com/search/${path}${query}`;
}
