import { getCityPhotoUrl } from "./cityPhotos";

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

  // 1. Try Unsplash API (best quality, requires key)
  if (accessKey) {
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(city + " city landmark")}&per_page=1&orientation=landscape&content_filter=high`,
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
  const wiki = await fetchWikipediaPhoto(city);
  if (wiki) return wiki;

  // 4. Final fallback — generic travel photo
  return hardcoded;
}
