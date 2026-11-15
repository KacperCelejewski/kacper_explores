import { AIRPORT_BY_CODE } from "./airports";

// Inne zapisy tych samych miast (AI potrafi odpowiedzieć po angielsku lub niemiecku).
const ALIASES: Record<string, string[]> = {
  wroclaw: ["breslau"],
  krakow: ["cracow"],
  warszawa: ["warsaw", "modlin"],
  modlin: ["warszawa", "warsaw"],
  gdansk: ["danzig"],
  poznan: ["posen"],
  wieden: ["vienna", "wien"],
  budapeszt: ["budapest"],
  londyn: ["london"],
  stambul: ["istanbul"],
};

function norm(value: string): string {
  return value
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z ]/g, "")
    .trim();
}

/** Display names of the cities of the selected departure airports. */
export function originCityNames(airports: string[]): string[] {
  return airports.flatMap((code) => {
    const airport = AIRPORT_BY_CODE.get(code);
    return airport ? [airport.city] : [];
  });
}

function originKeys(airports: string[]): Set<string> {
  const keys = new Set<string>();
  for (const name of originCityNames(airports)) {
    const key = norm(name);
    keys.add(key);
    for (const alias of ALIASES[key] ?? []) keys.add(alias);
  }
  return keys;
}

/** Removes suggestions that are the traveller's own departure city. */
export function excludeOriginCities<T extends { city: string }>(destinations: T[], airports: string[]): T[] {
  const keys = originKeys(airports);
  if (keys.size === 0) return destinations;
  return destinations.filter((d) => !keys.has(norm(d.city)));
}

/** Prompt line telling the model not to suggest the departure cities. Empty when none are known. */
export function originExclusionPrompt(airports: string[]): string {
  const names = originCityNames(airports);
  if (names.length === 0) return "";
  return `- NIE proponuj jako celu miast wylotu: ${names.join(", ")}. Użytkownik już tam jest, szukamy dokąd polecieć.`;
}
