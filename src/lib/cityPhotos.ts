export type CityPhoto = {
  source: "unsplash";
  url: string;
  photoId: string;
  authorName: string;
  authorUrl: string;
  photoUrl: string;
  verifiedCity: string;
} | {
  source: "illustration";
  url: string;
};

export const CITY_ILLUSTRATION: CityPhoto = {
  source: "illustration",
  url: "/illustrations/journey-poster.svg",
};

export function unsplashReferralUrl(url: string): string {
  const link = new URL(url);
  link.searchParams.set("utm_source", "wloczykij");
  link.searchParams.set("utm_medium", "referral");
  return link.toString();
}

// Only manually verified places, with the photographer and source page.
// Verification and expansion policy: docs/city-photos.md. Never substitute a nearby city.
const VERIFIED_PHOTOS = [
  { city: "Barcelona", aliases: ["barcelona"], id: "b1v7_djQNuk", cdn: "1792766806020-4ef39eaf0e94", author: "Jeffrey Eisen", username: "jeisen" },
  { city: "Lizbona", aliases: ["lizbona", "lisbon", "lisboa"], id: "M0ywxxUOIkE", cdn: "1744580162134-b9b64645f7c8", author: "Get Golden Visa", username: "getgoldenvisa" },
  { city: "Rzym", aliases: ["rzym", "rome", "roma"], id: "VhlLC2eNSuo", cdn: "1526026697130-3f870884a6e3", author: "Cristina Gottardi", username: "cristina_gottardi" },
  { city: "Ateny", aliases: ["ateny", "athens"], id: "oxZwLNRTZ1Q", cdn: "1781545134540-f24f5c169b85", author: "Michal Vrba", username: "mis_hik" },
  { city: "Praga", aliases: ["praga", "prague", "praha"], id: "GxOyvWUWPrY", cdn: "1779111717273-c72882884cfd", author: "Mikheil Kuzmidi", username: "mikkuz" },
  { city: "Dubrownik", aliases: ["dubrownik", "dubrovnik"], id: "odcVzDcfS1s", cdn: "1750624580601-38c1f151d0e5", author: "Hongbin", username: "hbsun2013" },
  { city: "Budapeszt", aliases: ["budapeszt", "budapest"], id: "Jv2wfhVptR0", cdn: "1791128812711-aa103a019ec9", author: "Martin Guido", username: "martinguido" },
  { city: "Porto", aliases: ["porto"], id: "4p_BzPvxm0s", cdn: "1792802140834-3f0cf56572e5", author: "Vincent Yap", username: "chonky_films" },
];

export function getCityPhoto(city: string, width = 800): CityPhoto {
  const key = city.trim().toLocaleLowerCase("pl");
  const photo = VERIFIED_PHOTOS.find((entry) => entry.aliases.includes(key));
  if (!photo) return CITY_ILLUSTRATION;
  return {
    source: "unsplash",
    url: `https://images.unsplash.com/photo-${photo.cdn}?w=${width}&q=85&auto=format&fit=crop&crop=center`,
    photoId: photo.id,
    authorName: photo.author,
    authorUrl: unsplashReferralUrl(`https://unsplash.com/@${photo.username}`),
    photoUrl: unsplashReferralUrl(`https://unsplash.com/photos/${photo.id}`),
    verifiedCity: photo.city,
  };
}

// Inspiration, not flight offers. Prices belong to dated data from the flight cache.
export const FEATURED_DESTINATIONS = [
  { city: "Barcelona", country: "Hiszpania", flag: "🇪🇸", tag: "Gorący" },
  { city: "Lizbona", country: "Portugalia", flag: "🇵🇹", tag: "Nad oceanem" },
  { city: "Rzym", country: "Włochy", flag: "🇮🇹", tag: "Klasyk" },
  { city: "Ateny", country: "Grecja", flag: "🇬🇷", tag: "Słońce" },
  { city: "Praga", country: "Czechy", flag: "🇨🇿", tag: "Blisko" },
  { city: "Dubrownik", country: "Chorwacja", flag: "🇭🇷", tag: "Lato" },
  { city: "Budapeszt", country: "Węgry", flag: "🇭🇺", tag: "Blisko" },
  { city: "Porto", country: "Portugalia", flag: "🇵🇹", tag: "Nad oceanem" },
];
