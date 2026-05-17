export type Continent = "Europa" | "Azja" | "Ameryki" | "Afryka" | "Oceania" | "Bliski Wschód";

const COUNTRY_TO_CONTINENT: Record<string, Continent> = {
  // Europa
  "Polska": "Europa", "Niemcy": "Europa", "Francja": "Europa", "Włochy": "Europa",
  "Hiszpania": "Europa", "Portugalia": "Europa", "Grecja": "Europa", "Chorwacja": "Europa",
  "Czechy": "Europa", "Austria": "Europa", "Szwajcaria": "Europa", "Holandia": "Europa",
  "Belgia": "Europa", "Dania": "Europa", "Szwecja": "Europa", "Norwegia": "Europa",
  "Finlandia": "Europa", "Islandia": "Europa", "Irlandia": "Europa", "Szkocja": "Europa",
  "Wielka Brytania": "Europa", "UK": "Europa", "England": "Europa", "Scotland": "Europa",
  "Węgry": "Europa", "Słowacja": "Europa", "Rumunia": "Europa", "Bułgaria": "Europa",
  "Serbia": "Europa", "Albania": "Europa", "Macedonia": "Europa", "Czarnogóra": "Europa",
  "Słowenia": "Europa", "Bośnia i Hercegowina": "Europa", "Łotwa": "Europa",
  "Litwa": "Europa", "Estonia": "Europa", "Ukraina": "Europa", "Mołdawia": "Europa",
  "Białoruś": "Europa", "Rosja": "Europa", "Cypr": "Europa", "Malta": "Europa",
  "Luksemburg": "Europa", "Liechtenstein": "Europa", "Monako": "Europa",
  "San Marino": "Europa", "Andora": "Europa", "Kosowo": "Europa",
  "Poland": "Europa", "Germany": "Europa", "France": "Europa", "Italy": "Europa",
  "Spain": "Europa", "Portugal": "Europa", "Greece": "Europa", "Croatia": "Europa",
  "Czech Republic": "Europa", "Czechia": "Europa", "Netherlands": "Europa",
  "Belgium": "Europa", "Denmark": "Europa", "Sweden": "Europa", "Norway": "Europa",
  "Finland": "Europa", "Iceland": "Europa", "Ireland": "Europa", "Hungary": "Europa",
  "Slovakia": "Europa", "Romania": "Europa", "Bulgaria": "Europa", "Slovenia": "Europa",

  // Azja
  "Japonia": "Azja", "Tajlandia": "Azja", "Bali": "Azja", "Indonezja": "Azja",
  "Wietnam": "Azja", "Kambodża": "Azja", "Laos": "Azja", "Myanmar": "Azja",
  "Malezja": "Azja", "Singapur": "Azja", "Filipiny": "Azja", "Korea Południowa": "Azja",
  "Chiny": "Azja", "Indie": "Azja", "Nepal": "Azja", "Sri Lanka": "Azja",
  "Maldywy": "Azja", "Mongolia": "Azja", "Kazachstan": "Azja", "Uzbekistan": "Azja",
  "Gruzja": "Azja", "Armenia": "Azja", "Azerbejdżan": "Azja", "Tajwan": "Azja",
  "Hongkong": "Azja", "Makao": "Azja",
  "Japan": "Azja", "Thailand": "Azja", "Indonesia": "Azja", "Vietnam": "Azja",
  "Cambodia": "Azja", "Malaysia": "Azja", "Singapore": "Azja", "Philippines": "Azja",
  "South Korea": "Azja", "China": "Azja", "India": "Azja",
  "Maldives": "Azja", "Georgia": "Azja", "Taiwan": "Azja",
  "Hong Kong": "Azja",

  // Bliski Wschód
  "Turcja": "Bliski Wschód", "Izrael": "Bliski Wschód", "Jordania": "Bliski Wschód",
  "Zjednoczone Emiraty Arabskie": "Bliski Wschód", "ZEA": "Bliski Wschód",
  "Arabia Saudyjska": "Bliski Wschód", "Katar": "Bliski Wschód", "Oman": "Bliski Wschód",
  "Bahrajn": "Bliski Wschód", "Kuwejt": "Bliski Wschód", "Iran": "Bliski Wschód",
  "Irak": "Bliski Wschód", "Liban": "Bliski Wschód", "Syria": "Bliski Wschód",
  "Turkey": "Bliski Wschód", "Israel": "Bliski Wschód", "Jordan": "Bliski Wschód",
  "UAE": "Bliski Wschód", "Dubai": "Bliski Wschód", "Saudi Arabia": "Bliski Wschód",
  "Qatar": "Bliski Wschód",

  // Ameryki
  "USA": "Ameryki", "Stany Zjednoczone": "Ameryki", "Kanada": "Ameryki",
  "Meksyk": "Ameryki", "Kuba": "Ameryki", "Jamajka": "Ameryki", "Dominikana": "Ameryki",
  "Kostaryka": "Ameryki", "Panama": "Ameryki", "Kolumbia": "Ameryki", "Peru": "Ameryki",
  "Brazylia": "Ameryki", "Argentyna": "Ameryki", "Chile": "Ameryki", "Boliwia": "Ameryki",
  "Ekwador": "Ameryki", "Wenezuela": "Ameryki", "Urugwaj": "Ameryki", "Paragwaj": "Ameryki",
  "Gwatemala": "Ameryki", "Honduras": "Ameryki", "Nikaragua": "Ameryki", "Salwador": "Ameryki",
  "United States": "Ameryki", "Canada": "Ameryki", "Mexico": "Ameryki", "Cuba": "Ameryki",
  "Jamaica": "Ameryki", "Costa Rica": "Ameryki", "Colombia": "Ameryki", "Brazil": "Ameryki",
  "Argentina": "Ameryki", "Bolivia": "Ameryki", "Ecuador": "Ameryki",
  "Uruguay": "Ameryki",

  // Afryka
  "Maroko": "Afryka", "Egipt": "Afryka", "Tunezja": "Afryka", "Kenia": "Afryka",
  "Tanzania": "Afryka", "Republika Południowej Afryki": "Afryka", "RPA": "Afryka",
  "Zanzibar": "Afryka", "Madagaskar": "Afryka", "Etiopia": "Afryka", "Ghana": "Afryka",
  "Nigeria": "Afryka", "Senegal": "Afryka", "Mozambik": "Afryka", "Namibia": "Afryka",
  "Botswana": "Afryka", "Zimbabwe": "Afryka", "Uganda": "Afryka", "Rwanda": "Afryka",
  "Morocco": "Afryka", "Egypt": "Afryka", "Tunisia": "Afryka", "Kenya": "Afryka",
  "South Africa": "Afryka", "Ethiopia": "Afryka",

  // Oceania
  "Australia": "Oceania", "Nowa Zelandia": "Oceania", "Fidżi": "Oceania",
  "Papua Nowa Gwinea": "Oceania", "New Zealand": "Oceania", "Fiji": "Oceania",
};

export const CONTINENTS: Continent[] = ["Europa", "Azja", "Bliski Wschód", "Ameryki", "Afryka", "Oceania"];

export function getContinent(country: string): Continent | null {
  if (!country) return null;
  const direct = COUNTRY_TO_CONTINENT[country];
  if (direct) return direct;
  // case-insensitive fallback
  const lower = country.toLowerCase();
  const entry = Object.entries(COUNTRY_TO_CONTINENT).find(
    ([k]) => k.toLowerCase() === lower
  );
  return entry ? entry[1] : null;
}
