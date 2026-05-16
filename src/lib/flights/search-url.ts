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

  let datePart = "";
  if (departDate && returnDate) {
    datePart = `${toSkyDate(departDate)}/${toSkyDate(returnDate)}/`;
  } else if (departDate) {
    const d = new Date(departDate);
    const yy = String(d.getUTCFullYear()).slice(2);
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    datePart = `${yy}${mm}/`;
  }

  return `https://www.skyscanner.pl/transport/loty/${origin}/${dest}/${datePart}?adultsv2=1&cabin_class=economy`;
}
