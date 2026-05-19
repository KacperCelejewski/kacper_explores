import { getCityPhotoUrl } from "./cityPhotos";

export async function fetchCityPhotoUrl(city: string): Promise<string> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) return getCityPhotoUrl(city, 800);

  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(city + " city landmark")}&per_page=1&orientation=landscape&content_filter=high`,
      {
        headers: { Authorization: `Client-ID ${accessKey}` },
        next: { revalidate: 86400 },
      }
    );
    if (!res.ok) return getCityPhotoUrl(city, 800);
    const data = await res.json();
    const url: string | undefined = data.results?.[0]?.urls?.regular;
    return url ?? getCityPhotoUrl(city, 800);
  } catch {
    return getCityPhotoUrl(city, 800);
  }
}
