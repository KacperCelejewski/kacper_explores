// Curated Unsplash photo IDs for popular European destinations.
// CDN IDs verified by fetching each photo page — NOT the URL slug IDs.
// URL format: https://images.unsplash.com/photo-{ID}?w={w}&q=75&auto=format&fit=crop
const CITY_PHOTOS: Record<string, string> = {
  // Iberian Peninsula
  "barcelona": "1578095172812-dcc191c5aed8",  // Sagrada Familia golden hour
  "lizbona": "1744580162134-b9b64645f7c8",    // Alfama district under blue sky
  "lisbon": "1744580162134-b9b64645f7c8",
  "porto": "1569959595862-1c84553361c1",      // Aerial — Dom Luís bridge
  "madryt": "1681311869080-8609bc510c29",     // fallback — Paris-style cityscape
  "madrid": "1681311869080-8609bc510c29",
  "sewilla": "1681311869080-8609bc510c29",
  "seville": "1681311869080-8609bc510c29",
  // Italy
  "rzym": "1514896856000-91cb6de818e0",       // Colosseum daytime
  "rome": "1514896856000-91cb6de818e0",
  "florencja": "1514896856000-91cb6de818e0",
  "florence": "1514896856000-91cb6de818e0",
  "wenecja": "1569959595862-1c84553361c1",    // canal/bridge — closest verified
  "venice": "1569959595862-1c84553361c1",
  "mediolan": "1514896856000-91cb6de818e0",
  "milan": "1514896856000-91cb6de818e0",
  "neapol": "1514896856000-91cb6de818e0",
  "naples": "1514896856000-91cb6de818e0",
  // Greece
  "ateny": "1754069620359-dc54d97591ce",      // Acropolis from above
  "athens": "1754069620359-dc54d97591ce",
  "santorini": "1536253253742-6c8195fd0c1e",  // Iconic white & blue domes
  "mykonos": "1536253253742-6c8195fd0c1e",
  "thessaloniki": "1754069620359-dc54d97591ce",
  // France
  "paryż": "1681311869080-8609bc510c29",      // Eiffel tower over Paris
  "paris": "1681311869080-8609bc510c29",
  "nicea": "1681311869080-8609bc510c29",
  "nice": "1681311869080-8609bc510c29",
  // Germany & Austria
  "berlin": "1564613655657-7f7a7df91177",    // Reichstag building
  "monachium": "1564613655657-7f7a7df91177",
  "munich": "1564613655657-7f7a7df91177",
  "wiedeń": "1662119431157-40e08341aff5",     // Schönbrunn Palace
  "vienna": "1662119431157-40e08341aff5",
  "hamburg": "1564613655657-7f7a7df91177",
  // Netherlands & Belgium
  "amsterdam": "1753810809056-4d5ddb6eeca2", // Canal with buildings and bikes
  "bruksela": "1536880756060-98a6a140f0a7",  // Amsterdam canal daytime (fallback)
  "brussels": "1536880756060-98a6a140f0a7",
  "brugia": "1536880756060-98a6a140f0a7",
  "bruges": "1536880756060-98a6a140f0a7",
  // Central Europe
  "praga": "1747466402645-b9776499efb7",      // Prague castle and colorful buildings
  "prague": "1747466402645-b9776499efb7",
  "budapeszt": "1756413664903-159797c47477",  // Parliament + Chain Bridge at sunset
  "budapest": "1756413664903-159797c47477",
  "bratysława": "1747466402645-b9776499efb7",
  "bratislava": "1747466402645-b9776499efb7",
  "warszawa": "1747466402645-b9776499efb7",
  "warsaw": "1747466402645-b9776499efb7",
  "kraków": "1747466402645-b9776499efb7",
  "krakow": "1747466402645-b9776499efb7",
  "gdańsk": "1747466402645-b9776499efb7",
  "gdansk": "1747466402645-b9776499efb7",
  "wrocław": "1747466402645-b9776499efb7",
  "wroclaw": "1747466402645-b9776499efb7",
  // Croatia & Balkans
  "dubrownik": "1750624580601-38c1f151d0e5", // Old town on Adriatic
  "dubrovnik": "1750624580601-38c1f151d0e5",
  "split": "1629997865848-f4353a9296c9",      // Aerial city near sea
  "zadar": "1629997865848-f4353a9296c9",
  "zagreb": "1629997865848-f4353a9296c9",
  // Nordics
  "kopenhaga": "1536880756060-98a6a140f0a7",
  "copenhagen": "1536880756060-98a6a140f0a7",
  "sztokholm": "1536880756060-98a6a140f0a7",
  "stockholm": "1536880756060-98a6a140f0a7",
  "oslo": "1536880756060-98a6a140f0a7",
  "helsinki": "1536880756060-98a6a140f0a7",
  "reykjavik": "1536880756060-98a6a140f0a7",
  // UK & Ireland
  "londyn": "1681311869080-8609bc510c29",
  "london": "1681311869080-8609bc510c29",
  "edinburgh": "1681311869080-8609bc510c29",
  "edynburg": "1681311869080-8609bc510c29",
  "dublin": "1681311869080-8609bc510c29",
  // Baltics & Eastern
  "tallinn": "1747466402645-b9776499efb7",
  "ryga": "1747466402645-b9776499efb7",
  "riga": "1747466402645-b9776499efb7",
  "wilno": "1747466402645-b9776499efb7",
  "vilnius": "1747466402645-b9776499efb7",
  // Mediterranean islands
  "valletta": "1536253253742-6c8195fd0c1e",
  "palma": "1536253253742-6c8195fd0c1e",
  "ibiza": "1536253253742-6c8195fd0c1e",
};

const DEFAULT_ID = "1681311869080-8609bc510c29"; // Eiffel tower — recognizable fallback

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
