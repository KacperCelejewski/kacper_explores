import { SKY_IDS } from "./sky-ids";

function toSkyId(iataCode: string): string {
  return (SKY_IDS[iataCode]?.skyId ?? iataCode).toLowerCase();
}

export function buildSkyscannerUrl(
  originCode: string,
  destCode: string,
  departDate?: string | null
): string {
  const origin = toSkyId(originCode);
  const dest = toSkyId(destCode);

  let datePart = "";
  if (departDate) {
    const d = new Date(departDate);
    const yy = String(d.getUTCFullYear()).slice(2);
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    datePart = `${yy}${mm}/`;
  }

  return `https://www.skyscanner.pl/transport/loty/${origin}/${dest}/${datePart}?adultsv2=1&rtn=1`;
}
