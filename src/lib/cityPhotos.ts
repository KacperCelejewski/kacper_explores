// Curated Unsplash photo IDs for popular European destinations.
// URL format: https://images.unsplash.com/photo-{ID}?w={w}&q=75&auto=format&fit=crop
const CITY_PHOTOS: Record<string, string> = {
  // Iberian Peninsula
  "barcelona": "1539037116277-4db20889f2d4",
  "lizbona": "1558618666-fcd25c85cd64",
  "lisbon": "1558618666-fcd25c85cd64",
  "porto": "1555881400-74d7acaacd8b",
  "madryt": "1543783207-ec64e4d95325",
  "madrid": "1543783207-ec64e4d95325",
  "sewilla": "1543783207-ec64e4d95325",
  "seville": "1543783207-ec64e4d95325",
  // Italy
  "rzym": "1552832230-c0197dd311b5",
  "rome": "1552832230-c0197dd311b5",
  "florencja": "1541370976299-4d24be63e9d3",
  "florence": "1541370976299-4d24be63e9d3",
  "wenecja": "1514890547357-a9ee288728e0",
  "venice": "1514890547357-a9ee288728e0",
  "mediolan": "1610016302534-6f67f1c968d8",
  "milan": "1610016302534-6f67f1c968d8",
  "neapol": "1552832230-c0197dd311b5",
  "naples": "1552832230-c0197dd311b5",
  // Greece
  "ateny": "1603565816030-6b389eeb23cb",
  "athens": "1603565816030-6b389eeb23cb",
  "santorini": "1570077188670-e3a8d69ac5ff",
  "mykonos": "1570077188670-e3a8d69ac5ff",
  "thessaloniki": "1603565816030-6b389eeb23cb",
  // France
  "paryż": "1499856871958-5b9627545d1a",
  "paris": "1499856871958-5b9627545d1a",
  "nicea": "1499856871958-5b9627545d1a",
  "nice": "1499856871958-5b9627545d1a",
  // Germany & Austria
  "berlin": "1560969184-10fe8719e047",
  "monachium": "1560969184-10fe8719e047",
  "munich": "1560969184-10fe8719e047",
  "wiedeń": "1609347744403-2306babf171e",
  "vienna": "1609347744403-2306babf171e",
  "hamburg": "1560969184-10fe8719e047",
  // Netherlands & Belgium
  "amsterdam": "1534351590666-13e3e96b5702",
  "bruksela": "1559113202-c916b8e44373",
  "brussels": "1559113202-c916b8e44373",
  "brugia": "1559113202-c916b8e44373",
  "bruges": "1559113202-c916b8e44373",
  // Central Europe
  "praga": "1541849546-216549ae216d",
  "prague": "1541849546-216549ae216d",
  "budapeszt": "1538332576228-eb5b4c4de6f5",
  "budapest": "1538332576228-eb5b4c4de6f5",
  "bratysława": "1541849546-216549ae216d",
  "bratislava": "1541849546-216549ae216d",
  "warszawa": "1576618148400-f54bed99fcfd",
  "warsaw": "1576618148400-f54bed99fcfd",
  "kraków": "1576618148400-f54bed99fcfd",
  "krakow": "1576618148400-f54bed99fcfd",
  "gdańsk": "1576618148400-f54bed99fcfd",
  "gdansk": "1576618148400-f54bed99fcfd",
  "wrocław": "1576618148400-f54bed99fcfd",
  "wroclaw": "1576618148400-f54bed99fcfd",
  // Croatia & Balkans
  "dubrownik": "1555990538-c4c4ce01d064",
  "dubrovnik": "1555990538-c4c4ce01d064",
  "split": "1555993539-1732b0258235",
  "zadar": "1555993539-1732b0258235",
  "zagreb": "1555993539-1732b0258235",
  // Nordics
  "kopenhaga": "1513622470522-26c3c8a854bc",
  "copenhagen": "1513622470522-26c3c8a854bc",
  "sztokholm": "1509356843151-3e7d96241e11",
  "stockholm": "1509356843151-3e7d96241e11",
  "oslo": "1509356843151-3e7d96241e11",
  "helsinki": "1509356843151-3e7d96241e11",
  "reykjavik": "1509356843151-3e7d96241e11",
  // UK & Ireland
  "londyn": "1513635269975-59663e0ac1ad",
  "london": "1513635269975-59663e0ac1ad",
  "edinburgh": "1513635269975-59663e0ac1ad",
  "edynburg": "1513635269975-59663e0ac1ad",
  "dublin": "1513635269975-59663e0ac1ad",
  // Baltics & Eastern
  "tallinn": "1552484459-28f1da4c7f08",
  "ryga": "1552484459-28f1da4c7f08",
  "riga": "1552484459-28f1da4c7f08",
  "wilno": "1552484459-28f1da4c7f08",
  "vilnius": "1552484459-28f1da4c7f08",
  // Mediterranean islands
  "valletta": "1558618047-3c8c76ca7d13",
  "palma": "1570077188670-e3a8d69ac5ff",
  "ibiza": "1570077188670-e3a8d69ac5ff",
};

const DEFAULT_ID = "1488085061387-422e29b40080"; // generic travel landscape

export function getCityPhotoUrl(city: string, width = 800): string {
  const key = city
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  const keyWithDiacritics = city.toLowerCase();
  const id =
    CITY_PHOTOS[keyWithDiacritics] ??
    CITY_PHOTOS[key] ??
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
