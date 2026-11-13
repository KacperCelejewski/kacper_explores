import { CATALOG, type CatalogEntry } from "@/lib/destinations/catalog";
import { slugify } from "./slug";

// Kierunki, na które nie jedzie się na weekend z Polski; nie dostają stron SEO
const FAR = new Set(["Bali", "Bangkok", "Dubai", "Nowy Jork", "Tokio", "Singapur", "Kair", "Tel Awiw", "Marrakesz", "Antalya"]);

// Nazwy, pod którymi Travelpayouts podaje miasto, gdy różnią się od katalogu
const DEAL_NAME_ALIASES: Record<string, string> = { Tallin: "Tallinn", Reykjavik: "Reykjavík" };

// Nazwa miasta w danych o lotach (drop_deals.city_name)
export const dealCityName = (c: CatalogEntry): string => DEAL_NAME_ALIASES[c.city] ?? c.city;

export const citySlug = (c: CatalogEntry): string => slugify(c.city);

export function weekendCities(): CatalogEntry[] {
  return CATALOG.filter((c) => !FAR.has(c.city));
}

// Miasto z katalogu po nazwie z danych o lotach; null, gdy miasta nie ma na liście weekendowej
export function cityFromDealName(name: string): CatalogEntry | null {
  return weekendCities().find((c) => dealCityName(c) === name) ?? null;
}

export function cityFromSlug(slug: string): CatalogEntry | null {
  return weekendCities().find((c) => citySlug(c) === slug) ?? null;
}

const TAG_TEXT: Record<string, string> = {
  history: "zabytków i historii",
  architecture: "architektury",
  food: "lokalnego jedzenia",
  nature: "przyrody i spacerów",
  beach: "plaży i morza",
  nightlife: "wieczornego życia",
};
const VIBE_SENTENCE: Record<string, string> = {
  chill: "Sprawdzi się przy spokojnym tempie: kawa, spacer, bez pośpiechu.",
  intense: "Da się tu zmieścić mocno wypełniony plan.",
  social: "Łatwo tu o poznawanie ludzi i wieczory w barach.",
  active: "Jest tu co robić na własnych nogach.",
};
const PLACE_TEXT: Record<string, string> = {
  big_city: "duże miasto z metrem i muzeami",
  charming: "kameralne uliczki i spokój",
  beach_sun: "słońce i woda",
};

const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} oraz ${xs[xs.length - 1]}`);

// Zdania „dla kogo” składane wyłącznie z pól katalogu, bez dopowiadania faktów
export function cityAudience(c: CatalogEntry): string[] {
  const out: string[] = [];
  const tags = c.tags.map((t) => TAG_TEXT[t]).filter(Boolean).slice(0, 3);
  if (tags.length) out.push(`Dla osób, które szukają ${list(tags)}.`);
  out.push(...c.vibes.map((v) => VIBE_SENTENCE[v]).filter(Boolean));
  const places = c.placeTypes.map((p) => PLACE_TEXT[p]).filter(Boolean);
  if (places.length) out.push(`Charakter miejsca: ${list(places)}.`);
  return out;
}

// Slugi miast z listy weekendowej, dla których w danych są okazje (nazwy z Travelpayouts); do sitemap
export function slugsWithDeals(cityNames: string[]): string[] {
  const have = new Set(cityNames);
  return weekendCities().filter((c) => have.has(dealCityName(c))).map(citySlug);
}
