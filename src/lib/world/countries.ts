// 195 państw: 193 członków ONZ plus Watykan i Palestyna. Terytoria zależne (Grenlandia, Hongkong…) nie wchodzą na listę.
export type Continent = "africa" | "asia" | "europe" | "north-america" | "south-america" | "oceania";

export interface Country {
  iso: string; // ISO 3166-1 alfa-2
  continent: Continent;
}

export const CONTINENTS: readonly Continent[] = ["africa", "asia", "europe", "north-america", "south-america", "oceania"];

export const CONTINENT_LABELS: Record<Continent, string> = {
  africa: "Afryka",
  asia: "Azja",
  europe: "Europa",
  "north-america": "Ameryka Północna",
  "south-america": "Ameryka Południowa",
  oceania: "Oceania",
};

// Kraje na dwóch kontynentach przypisane jednemu: Rosja i Cypr do Europy; Turcja, Gruzja, Armenia,
// Azerbejdżan i Kazachstan do Azji; Egipt do Afryki; Meksyk, Ameryka Środkowa i Karaiby do Ameryki Północnej.
const BY_CONTINENT: Record<Continent, string> = {
  africa:
    "DZ AO BJ BW BF BI CV CM CF TD KM CG CD CI DJ EG GQ ER SZ ET GA GM GH GN GW KE LS LR LY MG MW ML MR MU MA MZ NA NE NG RW ST SN SC SL SO ZA SS SD TZ TG TN UG ZM ZW",
  asia:
    "AF AM AZ BH BD BT BN KH CN GE IN ID IR IQ IL JP JO KZ KW KG LA LB MY MV MN MM NP KP OM PK PH QA SA SG KR LK SY TJ TH TL TR TM AE UZ VN YE PS",
  europe:
    "AL AD AT BY BE BA BG HR CY CZ DK EE FI FR DE GR HU IS IE IT LV LI LT LU MT MD MC ME NL MK NO PL PT RO RU SM RS SK SI ES SE CH UA GB VA",
  "north-america": "AG BS BB BZ CA CR CU DM DO SV GD GT HT HN JM MX NI PA KN LC VC TT US",
  "south-america": "AR BO BR CL CO EC GY PY PE SR UY VE",
  oceania: "AU FJ KI MH FM NR NZ PW PG WS SB TO TV VU",
};

export const COUNTRIES: readonly Country[] = CONTINENTS.flatMap((continent) =>
  BY_CONTINENT[continent].split(" ").map((iso) => ({ iso, continent })),
).sort((a, b) => a.iso.localeCompare(b.iso));

const KNOWN = new Set(COUNTRIES.map((c) => c.iso));

// Polska nazwa kraju z wbudowanego w przeglądarkę Intl.DisplayNames; bez niego (albo dla kodu spoza listy) sam kod
export function countryName(iso: string, locale = "pl"): string {
  if (!KNOWN.has(iso)) return iso;
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(iso) ?? iso;
  } catch {
    return iso;
  }
}
