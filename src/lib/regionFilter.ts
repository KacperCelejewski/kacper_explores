import type { Region } from "@/types";
import { getContinent, type Continent } from "@/lib/continents";
import { regionLabel } from "@/lib/quizOptions";

// Filtr kierunków po regionie z quizu. Serwer nie ufa Gemini: prompt prosi o region, a odpowiedź
// i tak jest sprawdzana względem `continents.ts` (kraj → kontynent) z rozdziałem Ameryk na dwie części.

const CONTINENT_TO_REGION: Record<Exclude<Continent, "Ameryki">, Region> = {
  "Europa": "europa",
  "Azja": "azja",
  "Bliski Wschód": "bliski_wschod",
  "Afryka": "afryka",
  "Oceania": "oceania",
};

// Ameryka Południowa; reszta Ameryk (USA, Kanada, Meksyk, Ameryka Środkowa, Karaiby) to Północna.
const SOUTH_AMERICA = new Set([
  "kolumbia", "peru", "brazylia", "argentyna", "chile", "boliwia", "ekwador", "wenezuela",
  "urugwaj", "paragwaj", "gujana", "surinam",
  "colombia", "brazil", "argentina", "bolivia", "ecuador", "venezuela", "uruguay", "paraguay",
]);

// Kraje, które uczciwie pasują do dwóch regionów: Stambuł jest w Europie, reszta kraju w Azji;
// w tabeli kontynentów Turcja jest na Bliskim Wschodzie, więc dla "Europa" dopuszczamy ją osobno.
const ALSO_IN: Record<string, Region[]> = { turcja: ["europa"], turkey: ["europa"] };

/** "Portugalia (Madera)" -> "Portugalia" */
const cleanCountry = (country: string) => country.replace(/\s*\(.*\)\s*$/, "").trim();

/** Regiony kraju; pusta lista = kraju nie ma w tabeli (nie da się go potwierdzić). */
export function regionsOfCountry(country: string): Region[] {
  const name = cleanCountry(country);
  const continent = getContinent(name);
  if (!continent) return [];
  const base: Region = continent === "Ameryki"
    ? (SOUTH_AMERICA.has(name.toLowerCase()) ? "ameryka_poludniowa" : "ameryka_polnocna")
    : CONTINENT_TO_REGION[continent];
  return [base, ...(ALSO_IN[name.toLowerCase()] ?? [])];
}

/** Pusta lista regionów = obojętnie (wszystko pasuje, także kraje spoza tabeli). */
export function matchesRegions(country: string, regions: readonly Region[]): boolean {
  if (regions.length === 0) return true;
  return regionsOfCountry(country).some((r) => regions.includes(r));
}

/** Dzieli propozycje na pasujące do regionów i odrzucone (kolejność zostaje). */
export function filterByRegions<T extends { country: string }>(
  items: T[],
  regions: readonly Region[],
): { kept: T[]; rejected: T[] } {
  if (regions.length === 0) return { kept: items, rejected: [] };
  const kept: T[] = [];
  const rejected: T[] = [];
  for (const item of items) (matchesRegions(item.country, regions) ? kept : rejected).push(item);
  return { kept, rejected };
}

const REGION_SCOPE: Record<Region, string> = {
  europa: "Europa (także Turcja z Stambułem)",
  ameryka_poludniowa: "Ameryka Południowa (np. Brazylia, Argentyna, Chile, Peru, Kolumbia)",
  ameryka_polnocna: "Ameryka Północna (USA, Kanada, Meksyk, Ameryka Środkowa i Karaiby)",
  azja: "Azja (bez Bliskiego Wschodu)",
  afryka: "Afryka",
  bliski_wschod: "Bliski Wschód (np. Turcja, Izrael, Jordania, Emiraty, Oman)",
  oceania: "Oceania (Australia, Nowa Zelandia, wyspy Pacyfiku)",
};

/** Linia profilu dla promptu; pusta, gdy region jest obojętny, więc stary prompt zostaje bez zmian. */
export function regionPromptLine(regions: readonly Region[]): string {
  if (regions.length === 0) return "";
  const scope = regions.map((r) => REGION_SCOPE[r]).join("; ");
  return `- Region (TWARDE OGRANICZENIE): wszystkie 6 destynacji MUSI leżeć w: ${scope}. Żadna nie może być z innego regionu, nawet jeśli lepiej pasuje do reszty profilu. W dalekich regionach wybieraj miasta z realnymi lotami z Polski i najtańsze sensowne opcje.`;
}

/** Dopisek do powtórnego zapytania, gdy poprzednia odpowiedź zawierała kierunki spoza regionu. */
export function regionRetryLine(regions: readonly Region[], rejectedCities: readonly string[], keptCities: readonly string[]): string {
  const names = regions.map(regionLabel).join(", ");
  const avoid = [...rejectedCities, ...keptCities];
  return `\nPOPRAWKA: poprzednia odpowiedź zawierała kierunki spoza regionu (${names}). Zwróć 6 NOWYCH destynacji wyłącznie z tego regionu${avoid.length ? `, bez powtarzania: ${avoid.join(", ")}` : ""}.\n`;
}
