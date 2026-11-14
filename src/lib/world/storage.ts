import { COUNTRIES } from "./countries";

export const VISITED_KEY = "visited_countries";

export type KeyValueStorage = Pick<Storage, "getItem" | "setItem">;

const KNOWN = new Set(COUNTRIES.map((c) => c.iso));

// Domyślnie localStorage przeglądarki; gdy go nie ma albo jest zablokowany, null
function defaultStorage(): KeyValueStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

// Z zapisanych danych zostają tylko znane kody bez duplikatów; wszystko inne daje pustą listę, nic nie rzuca
export function loadVisited(storage: KeyValueStorage | null = defaultStorage()): string[] {
  try {
    const raw = storage?.getItem(VISITED_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.filter((v): v is string => typeof v === "string" && KNOWN.has(v)))];
  } catch {
    return [];
  }
}

export function saveVisited(codes: readonly string[], storage: KeyValueStorage | null = defaultStorage()): boolean {
  try {
    if (!storage) return false;
    storage.setItem(VISITED_KEY, JSON.stringify(codes));
    return true;
  } catch {
    return false;
  }
}

// Dodaje albo usuwa kraj; kod spoza listy (np. terytorium zależne) nic nie zmienia
export function toggleVisited(codes: readonly string[], iso: string): string[] {
  if (!KNOWN.has(iso)) return [...codes];
  return codes.includes(iso) ? codes.filter((c) => c !== iso) : [...codes, iso];
}
