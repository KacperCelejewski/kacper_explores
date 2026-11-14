import { countryName } from "./countries";

export interface ShapeProperties {
  iso: string | null;
  sovereign: boolean;
  name: string | null;
}

// Terytoria spoza listy 195 państw też mają kod regionu, więc nazwę po polsku dajemy z Intl, nie z listy
function regionName(iso: string): string | null {
  try {
    const name = new Intl.DisplayNames(["pl"], { type: "region" }).of(iso);
    return name && name !== iso ? name : null;
  } catch {
    return null;
  }
}

export function shapeLabel({ iso, sovereign, name }: ShapeProperties): string {
  if (sovereign && iso) return countryName(iso);
  const label = (iso && regionName(iso)) || name || iso || "";
  return `${label} (terytorium zależne)`;
}
