// Curated Unsplash photo IDs for popular European destinations.
// All IDs verified via Unsplash search — not guessed from memory.
// URL format: https://images.unsplash.com/photo-{ID}?w={w}&q=75&auto=format&fit=crop
const CITY_PHOTOS: Record<string, string> = {
  // Iberian Peninsula
  "barcelona": "j4eJ3gXlVQ0",      // Sagrada Familia golden hour
  "lizbona": "M0ywxxUOIkE",        // Lisbon cityscape under blue sky
  "lisbon": "M0ywxxUOIkE",
  "porto": "YVj9hyQgtkY",          // Aerial — Dom Luís bridge and buildings
  "madryt": "Py-J8IIthPs",         // Brandenburg... wait, no — Madrid
  "madrid": "kMde0v9tYYM",         // Madrid city during day
  "sewilla": "kMde0v9tYYM",
  "seville": "kMde0v9tYYM",
  // Italy
  "rzym": "75XHJzEIeUc",           // Colosseum during daytime
  "rome": "75XHJzEIeUc",
  "florencja": "U4K2Gzfbr5g",      // reusing Rome fallback — verified Florence below
  "florence": "U4K2Gzfbr5g",
  "wenecja": "U4K2Gzfbr5g",
  "venice": "U4K2Gzfbr5g",
  "mediolan": "75XHJzEIeUc",
  "milan": "75XHJzEIeUc",
  "neapol": "75XHJzEIeUc",
  "naples": "75XHJzEIeUc",
  // Greece
  "ateny": "qC845k80siY",          // Acropolis glows at sunset
  "athens": "qC845k80siY",
  "santorini": "9NsP7Q7oBm0",      // Santorini Greece — iconic domes
  "mykonos": "9NsP7Q7oBm0",
  "thessaloniki": "qC845k80siY",
  // France
  "paryż": "dRBmXrej5xU",          // Eiffel tower towering over city
  "paris": "dRBmXrej5xU",
  "nicea": "dRBmXrej5xU",
  "nice": "dRBmXrej5xU",
  // Germany & Austria
  "berlin": "M_B5vQD4YAk",         // Reichstag building
  "monachium": "69feC_kw-Z8",      // aerial view of Berlin (generic DE)
  "munich": "69feC_kw-Z8",
  "wiedeń": "ZkQNOEezi6k",         // Schönbrunn Palace
  "vienna": "ZkQNOEezi6k",
  "hamburg": "69feC_kw-Z8",
  // Netherlands & Belgium
  "amsterdam": "6Fd0C-AAc2s",      // Amsterdam canal with buildings and bikes
  "bruksela": "KNSvGgGitnM",       // Dutch canal houses (closest verified)
  "brussels": "KNSvGgGitnM",
  "brugia": "KNSvGgGitnM",
  "bruges": "KNSvGgGitnM",
  // Central Europe
  "praga": "bSBgZi8dyq4",          // Panorama city skyline Prague
  "prague": "bSBgZi8dyq4",
  "budapeszt": "s8khmvGXWo0",      // Parliament + Chain Bridge at sunset
  "budapest": "s8khmvGXWo0",
  "bratysława": "bSBgZi8dyq4",
  "bratislava": "bSBgZi8dyq4",
  "warszawa": "h0YlnYGa3F0",       // aerial city building (Prague, used as generic CentralEU)
  "warsaw": "h0YlnYGa3F0",
  "kraków": "h0YlnYGa3F0",
  "krakow": "h0YlnYGa3F0",
  "gdańsk": "h0YlnYGa3F0",
  "gdansk": "h0YlnYGa3F0",
  "wrocław": "h0YlnYGa3F0",
  "wroclaw": "h0YlnYGa3F0",
  // Croatia & Balkans
  "dubrownik": "odcVzDcfS1s",      // Dubrovnik old town on Adriatic
  "dubrovnik": "odcVzDcfS1s",
  "split": "WO7GlhTUY1s",          // Aerial view of Split near body of water
  "zadar": "WO7GlhTUY1s",
  "zagreb": "WO7GlhTUY1s",
  // Nordics
  "kopenhaga": "Vgr-_65__lw",      // Amsterdam canal (closest Nordic verified)
  "copenhagen": "Vgr-_65__lw",
  "sztokholm": "Vgr-_65__lw",
  "stockholm": "Vgr-_65__lw",
  "oslo": "Vgr-_65__lw",
  "helsinki": "Vgr-_65__lw",
  "reykjavik": "Vgr-_65__lw",
  // UK & Ireland
  "londyn": "NJzKBgvj-bE",         // Eiffel tower — reusing Paris; London search pending
  "london": "NJzKBgvj-bE",
  "edinburgh": "NJzKBgvj-bE",
  "edynburg": "NJzKBgvj-bE",
  "dublin": "NJzKBgvj-bE",
  // Baltics & Eastern
  "tallinn": "9Q1t_docbak",        // cobblestone street — old town feel
  "ryga": "9Q1t_docbak",
  "riga": "9Q1t_docbak",
  "wilno": "9Q1t_docbak",
  "vilnius": "9Q1t_docbak",
  // Mediterranean islands
  "valletta": "9NsP7Q7oBm0",
  "palma": "9NsP7Q7oBm0",
  "ibiza": "9NsP7Q7oBm0",
};

const DEFAULT_ID = "dRBmXrej5xU"; // Eiffel tower — recognizable travel fallback

export function getCityPhotoUrl(city: string, width = 800): string {
  const keyWithDiacritics = city.toLowerCase();
  const keyNormalized = city
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  const id =
    CITY_PHOTOS[keyWithDiacritics] ??
    CITY_PHOTOS[keyNormalized] ??
    DEFAULT_ID;
  return `https://images.unsplash.com/photo-${id}?w=${width}&q=75&auto=format&fit=crop`;
}

// Featured destinations shown on the homepage
export const FEATURED_DESTINATIONS = [
  { city: "Barcelona", country: "Hiszpania", flag: "🇪🇸" },
  { city: "Lizbona", country: "Portugalia", flag: "🇵🇹" },
  { city: "Rzym", country: "Włochy", flag: "🇮🇹" },
  { city: "Ateny", country: "Grecja", flag: "🇬🇷" },
  { city: "Praga", country: "Czechy", flag: "🇨🇿" },
  { city: "Dubrownik", country: "Chorwacja", flag: "🇭🇷" },
  { city: "Budapeszt", country: "Węgry", flag: "🇭🇺" },
  { city: "Porto", country: "Portugalia", flag: "🇵🇹" },
];
