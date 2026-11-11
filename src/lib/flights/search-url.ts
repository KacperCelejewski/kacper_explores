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
  returnDate?: string | null
): string {
  const origin = toSkyId(originCode);
  const dest = toSkyId(destCode);

  const datePart = (departDate && returnDate)
    ? `${toSkyDate(departDate)}/${toSkyDate(returnDate)}/`
    : "";

  return `https://www.skyscanner.pl/transport/loty/${origin}/${dest}/${datePart}?adultsv2=1&cabin_class=economy`;
}

// Format wyszukiwania Aviasales: WRO0512BCN08121 = z WRO 5.12, powrót 8.12, 1 dorosły.
// Dzień i miesiąc bierzemy z tekstu daty, żeby lot po północy nie wypadał dzień wcześniej.
export function buildAviasalesUrl(
  originCode: string,
  destCode: string,
  departIso: string,
  returnIso: string,
  marker: string
): string {
  const ddmm = (iso: string) => `${iso.slice(8, 10)}${iso.slice(5, 7)}`;
  const path = `${originCode.toUpperCase()}${ddmm(departIso)}${destCode.toUpperCase()}${ddmm(returnIso)}1`;
  const query = marker ? `?marker=${encodeURIComponent(marker)}` : "";
  return `https://www.aviasales.com/search/${path}${query}`;
}
