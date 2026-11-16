import { getCityPhoto, unsplashReferralUrl, type CityPhoto } from "./cityPhotos";

function isUrl(value: unknown, hostname: string): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === hostname;
  } catch {
    return false;
  }
}

export async function fetchCityPhoto(city: string): Promise<CityPhoto> {
  const curated = getCityPhoto(city);
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (curated.source !== "unsplash" || !accessKey) return curated;

  // A search ranking cannot verify a place. Fetch only the reviewed photograph.
  try {
    const res = await fetch(`https://api.unsplash.com/photos/${curated.photoId}`, {
      headers: { Authorization: `Client-ID ${accessKey}`, "Accept-Version": "v1" },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return curated;
    const data = await res.json();
    if (data.id !== curated.photoId || !isUrl(data.urls?.regular, "images.unsplash.com") ||
        !isUrl(data.links?.html, "unsplash.com") || !isUrl(data.user?.links?.html, "unsplash.com") ||
        typeof data.user?.name !== "string" || !data.user.name.trim()) return curated;
    return {
      ...curated,
      url: data.urls.regular, // Preserve the API URL, including its ixid tracking parameter.
      authorName: data.user.name,
      authorUrl: unsplashReferralUrl(data.user.links.html),
      photoUrl: unsplashReferralUrl(data.links.html),
    };
  } catch {
    return curated;
  }
}
