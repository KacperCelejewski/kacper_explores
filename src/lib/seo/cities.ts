import { CATALOG, type CatalogEntry } from "@/lib/destinations/catalog";
import { slugify } from "./slug";

// Kierunki, na które nie jedzie się na weekend z Polski; nie dostają stron SEO
const FAR = new Set(["Bali", "Bangkok", "Dubai", "Nowy Jork", "Tokio", "Singapur", "Kair", "Tel Awiw", "Marrakesz", "Antalya"]);

export const citySlug = (c: CatalogEntry): string => slugify(c.city);

export function weekendCities(): CatalogEntry[] {
  return CATALOG.filter((c) => !FAR.has(c.city));
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
const VIBE_TEXT: Record<string, string> = {
  chill: "spokojnym tempie, z kawą i spacerem",
  intense: "mocno wypełnionym planie",
  social: "poznawaniu ludzi i wieczorach w barach",
  active: "aktywnym zwiedzaniu na własnych nogach",
};
const PLACE_TEXT: Record<string, string> = {
  big_city: "duże miasto z metrem i muzeami",
  charming: "kameralne uliczki i spokój",
  beach_sun: "słońce i wodę",
};

const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} oraz ${xs[xs.length - 1]}`);

// Zdania „dla kogo” składane wyłącznie z pól katalogu, bez dopowiadania faktów
export function cityAudience(c: CatalogEntry): string[] {
  const out: string[] = [];
  const tags = c.tags.map((t) => TAG_TEXT[t]).filter(Boolean).slice(0, 3);
  if (tags.length) out.push(`Dla osób, które szukają ${list(tags)}.`);
  const vibes = c.vibes.map((v) => VIBE_TEXT[v]).filter(Boolean);
  if (vibes.length) out.push(`Pasuje do wyjazdu w ${list(vibes)}.`);
  const places = c.placeTypes.map((p) => PLACE_TEXT[p]).filter(Boolean);
  if (places.length) out.push(`Charakter miejsca: ${list(places)}.`);
  return out;
}

// Slugi miast z listy weekendowej, dla których w danych są okazje (nazwy z Travelpayouts); do sitemap
export function slugsWithDeals(cityNames: string[]): string[] {
  const have = new Set(cityNames);
  return weekendCities().filter((c) => have.has(c.city)).map(citySlug);
}
