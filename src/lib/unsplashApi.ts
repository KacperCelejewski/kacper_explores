import { getCityPhotoUrl } from "./cityPhotos";

const PL_TO_EN: Record<string, string> = {
  "bukareszt": "bucharest", "belgrad": "belgrade", "wiedeń": "vienna",
  "paryż": "paris", "monachium": "munich", "rzym": "rome",
  "lizbona": "lisbon", "madryt": "madrid", "sewilla": "seville",
  "mediolan": "milan", "wenecja": "venice", "florencja": "florence",
  "neapol": "naples", "ateny": "athens", "kopenhaga": "copenhagen",
  "sztokholm": "stockholm", "londyn": "london", "edynburg": "edinburgh",
  "bruksela": "brussels", "brugia": "bruges", "praga": "prague",
  "budapeszt": "budapest", "bratysława": "bratislava", "warszawa": "warsaw",
  "kraków": "krakow", "gdańsk": "gdansk", "wrocław": "wroclaw",
  "dubrownik": "dubrovnik", "ryga": "riga", "wilno": "vilnius",
  "nicea": "nice", "lyon": "lyon", "marsylia": "marseille",
  "porto": "porto", "saloniki": "thessaloniki",
};

function toEnglishCityName(city: string): string {
  const key = city.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const plKey = city.toLowerCase();
  return PL_TO_EN[plKey] ?? PL_TO_EN[key] ?? city;
}

async function fetchWikipediaPhoto(city: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(city)}&prop=pageimages&format=json&pithumbsize=1200&origin=*`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const pages = data.query?.pages as Record<string, { thumbnail?: { source: string } }> | undefined;
    if (!pages) return null;
    const page = Object.values(pages)[0];
    return page?.thumbnail?.source ?? null;
  } catch {
    return null;
  }
}

export async function fetchCityPhotoUrl(city: string): Promise<string> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  const englishCity = toEnglishCityName(city);

  // 1. Try Unsplash API (best quality, requires key)
  if (accessKey) {
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(englishCity + " city")}&per_page=1&orientation=landscape&content_filter=high`,
        {
          headers: { Authorization: `Client-ID ${accessKey}` },
          next: { revalidate: 86400 },
        }
      );
      if (res.ok) {
        const data = await res.json();
        const url: string | undefined = data.results?.[0]?.urls?.regular;
        if (url) return url;
      }
    } catch { /* fall through */ }
  }

  // 2. Try hardcoded list (instant, no network)
  const hardcoded = getCityPhotoUrl(city, 800);
  const isDefault = hardcoded.includes("1681311869080"); // DEFAULT_ID = Eiffel Tower
  if (!isDefault) return hardcoded;

  // 3. Wikipedia API — free, no key, covers any city
  const wiki = await fetchWikipediaPhoto(englishCity);
  if (wiki) return wiki;

  // 4. Final fallback — generic travel photo
  return hardcoded;
}
