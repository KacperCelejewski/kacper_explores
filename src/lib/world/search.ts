import { COUNTRIES, countryName, type Country } from "./countries";

// Małe litery, bez znaków diakrytycznych i spacji z brzegów; ł nie rozkłada się w NFD, więc osobno
export function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/ł/g, "l").normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Kraje, których polska nazwa zawiera zapytanie; puste zapytanie zwraca wszystkie, alfabetycznie po nazwie
export function filterCountries(query: string, locale = "pl"): Country[] {
  const q = normalize(query);
  return COUNTRIES.map((c) => ({ c, name: countryName(c.iso, locale) }))
    .filter(({ name }) => q === "" || normalize(name).includes(q))
    .sort((a, b) => a.name.localeCompare(b.name, locale))
    .map(({ c }) => c);
}
