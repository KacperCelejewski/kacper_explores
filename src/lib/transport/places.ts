import type { BudgetLevel, TravelStyle } from "@/types";

// Własne dane o odległościach (współrzędne miast, publiczna wiedza geograficzna, dokładność ok. 5 km).
// Nie pochodzą z zewnętrznego API: dystans liczymy sami (patrz `index.ts`). Lista celów dla auta,
// pociągu lub busa i roweru jest zamknięta: model poleca tylko z niej, więc nie zmyśla odległości.

export type Coords = readonly [lat: number, lng: number];

/** Miasto startu według kodu lotniska z quizu (quiz pyta o miasto, kod to jego identyfikator). */
export const ORIGIN_COORDS: Readonly<Record<string, Coords>> = {
  WRO: [51.1079, 17.0385],
  KTW: [50.2649, 19.0238],
  KRK: [50.0647, 19.945],
  WAW: [52.2297, 21.0122],
  WMI: [52.2297, 21.0122],
  POZ: [52.4064, 16.9252],
  GDN: [54.352, 18.6466],
};

export interface GroundPlace {
  city: string;
  country: string;
  countryFlag: string;
  coords: Coords;
  tags: TravelStyle[];
  budgetLevel: BudgetLevel;
  coverImage: string;
  description: string;
}

type Row = [city: string, country: string, flag: string, lat: number, lng: number, tags: TravelStyle[], budget: BudgetLevel, emoji: string, description: string];

const PL = "Polska";
const CZ = "Czechy";
const SK = "Słowacja";
const DE = "Niemcy";
const AT = "Austria";
const HU = "Węgry";

const ROWS: Row[] = [
  // ── Polska ────────────────────────────────────────────────────────────────
  ["Kraków", PL, "🇵🇱", 50.0647, 19.945, ["history", "architecture", "food", "nightlife"], "medium", "🏰", "Stare Miasto, Kazimierz i zapiekanki o każdej porze."],
  ["Wrocław", PL, "🇵🇱", 51.1079, 17.0385, ["architecture", "history", "nightlife"], "medium", "🌉", "Rynek, wyspy na Odrze i krasnale na każdym rogu."],
  ["Poznań", PL, "🇵🇱", 52.4064, 16.9252, ["history", "food", "architecture"], "medium", "🐐", "Stary Rynek, koziołki w południe i rogale świętomarcińskie."],
  ["Gdańsk", PL, "🇵🇱", 54.352, 18.6466, ["history", "architecture", "beach", "food"], "medium", "⚓", "Długi Targ, nabrzeże Motławy i morze pod ręką."],
  ["Warszawa", PL, "🇵🇱", 52.2297, 21.0122, ["history", "nightlife", "food"], "medium", "🏙️", "Muzea, Wisła i Praga: wystarczy na kilka dni."],
  ["Katowice", PL, "🇵🇱", 50.2649, 19.0238, ["architecture", "nightlife", "food"], "low", "🏭", "Nikiszowiec, Spodek i klimat poprzemysłowych dzielnic."],
  ["Łódź", PL, "🇵🇱", 51.7592, 19.456, ["architecture", "nightlife", "history"], "low", "🧵", "Piotrkowska, fabryki włókiennicze i murale."],
  ["Lublin", PL, "🇵🇱", 51.2465, 22.5684, ["history", "food", "nightlife"], "low", "🕯️", "Stare Miasto, Zamek i dużo studenckich knajp."],
  ["Toruń", PL, "🇵🇱", 53.0138, 18.5984, ["history", "architecture", "food"], "low", "🥨", "Gotyckie Stare Miasto i pierniki, oczywiście."],
  ["Bydgoszcz", PL, "🇵🇱", 53.1235, 18.0084, ["architecture", "nature"], "low", "🚣", "Wyspa Młyńska, Brda i spokojne tempo."],
  ["Szczecin", PL, "🇵🇱", 53.4285, 14.5528, ["architecture", "history", "nature"], "low", "⚓", "Wały Chrobrego, port i Puszcza Bukowa za miastem."],
  ["Gdynia", PL, "🇵🇱", 54.5189, 18.5305, ["beach", "architecture", "food"], "low", "🌊", "Modernizm, Skwer Kościuszki i bulwar nad morzem."],
  ["Sopot", PL, "🇵🇱", 54.4418, 18.5601, ["beach", "nightlife", "food"], "medium", "🏖️", "Molo, plaża i Monciak."],
  ["Hel", PL, "🇵🇱", 54.6083, 18.8, ["beach", "nature"], "low", "🌬️", "Wąski cypel, kitesurfing i foki w fokarium."],
  ["Kołobrzeg", PL, "🇵🇱", 54.1757, 15.5834, ["beach", "nature"], "low", "🌅", "Szeroka plaża, latarnia morska i spacer po molo."],
  ["Świnoujście", PL, "🇵🇱", 53.91, 14.2472, ["beach", "nature"], "low", "⛴️", "Promenada, szeroka plaża i prom przez Świnę."],
  ["Malbork", PL, "🇵🇱", 54.0357, 19.0289, ["history", "architecture"], "low", "🏯", "Gotycki zamek z cegły, jeden z największych na świecie, dobry na jeden dzień."],
  ["Olsztyn", PL, "🇵🇱", 53.7784, 20.4801, ["nature", "history"], "low", "🌲", "Gotycki zamek i jeziora tuż za miastem."],
  ["Mikołajki", PL, "🇵🇱", 53.7997, 21.5731, ["nature", "beach"], "medium", "⛵", "Stolica polskich żeglarzy, mazurskie jeziora i rejsy."],
  ["Augustów", PL, "🇵🇱", 53.8447, 22.9797, ["nature", "beach"], "low", "🛶", "Kajaki na Czarnej Hańczy i Puszcza Augustowska."],
  ["Białystok", PL, "🇵🇱", 53.1325, 23.1688, ["nature", "history", "food"], "low", "🦬", "Pałac Branickich i blisko do Puszczy Białowieskiej."],
  ["Kazimierz Dolny", PL, "🇵🇱", 51.322, 21.9532, ["nature", "history", "food"], "medium", "🎨", "Rynek nad Wisłą, wąwozy i koguty z ciasta."],
  ["Sandomierz", PL, "🇵🇱", 50.6826, 21.7489, ["history", "food", "nature"], "low", "🍎", "Podziemna trasa pod rynkiem i widok na Wisłę."],
  ["Zamość", PL, "🇵🇱", 50.7231, 23.2519, ["history", "architecture"], "low", "🏛️", "Renesansowe miasto idealne, wpisane na listę UNESCO."],
  ["Przemyśl", PL, "🇵🇱", 49.7838, 22.7678, ["history", "nature"], "low", "🚂", "Twierdza, wzgórza nad Sanem i blisko do Bieszczad."],
  ["Rzeszów", PL, "🇵🇱", 50.0412, 21.9991, ["history", "food"], "low", "🥐", "Podziemna trasa turystyczna i dobra baza do Bieszczad."],
  ["Sanok", PL, "🇵🇱", 49.5557, 22.2052, ["nature", "history"], "low", "🌄", "Skansen, galeria Beksińskiego i brama w Bieszczady."],
  ["Zakopane", PL, "🇵🇱", 49.2992, 19.9496, ["nature", "food"], "medium", "⛰️", "Tatry, oscypki i Krupówki, jeśli ktoś lubi tłum."],
  ["Wieliczka", PL, "🇵🇱", 49.9871, 20.0646, ["history", "architecture"], "low", "🧂", "Kopalnia soli z kaplicą wyrzeźbioną w soli."],
  ["Tarnów", PL, "🇵🇱", 50.0121, 20.9858, ["history", "architecture"], "low", "🏘️", "Rynek z ratuszem i miasto na trasie w Beskidy."],
  ["Nowy Sącz", PL, "🇵🇱", 49.6218, 20.697, ["history", "nature"], "low", "🌳", "Zamek, skansen i start do Beskidu Sądeckiego."],
  ["Bielsko-Biała", PL, "🇵🇱", 49.8224, 19.0584, ["nature", "architecture"], "low", "🎭", "Dwa miasta w jednym i Beskidy za oknem."],
  ["Wisła", PL, "🇵🇱", 49.6527, 18.8588, ["nature"], "medium", "🎿", "Źródła Wisły, szlaki Beskidu Śląskiego i skocznia w Malince."],
  ["Cieszyn", PL, "🇵🇱", 49.7491, 18.6322, ["history", "food"], "low", "🌉", "Dwa kraje przez most na Olzie, kawa z drugiej strony."],
  ["Pszczyna", PL, "🇵🇱", 50.0186, 18.954, ["history", "nature"], "low", "🏰", "Zamek, park i żubry w pobliskiej zagrodzie."],
  ["Częstochowa", PL, "🇵🇱", 50.8118, 19.1203, ["history"], "low", "⛪", "Jasna Góra i Jura Krakowsko-Częstochowska za miastem."],
  ["Kielce", PL, "🇵🇱", 50.8661, 20.6286, ["nature", "history"], "low", "🪨", "Góry Świętokrzyskie, Jaskinia Raj i klasztor na Świętym Krzyżu."],
  ["Opole", PL, "🇵🇱", 50.6751, 17.9213, ["history", "food"], "low", "🎤", "Wyspa Pasieka, Odra i amfiteatr."],
  ["Kłodzko", PL, "🇵🇱", 50.4343, 16.6613, ["history", "nature"], "low", "🏰", "Podziemna trasa pod miastem i Kotlina Kłodzka w zasięgu ręki."],
  ["Kudowa-Zdrój", PL, "🇵🇱", 50.44, 16.2406, ["nature"], "low", "💧", "Uzdrowisko przy czeskiej granicy i Góry Stołowe."],
  ["Świdnica", PL, "🇵🇱", 50.8427, 16.4881, ["history", "architecture"], "low", "⛪", "Kościół Pokoju z listy UNESCO i spokojne starówki."],
  ["Jelenia Góra", PL, "🇵🇱", 50.9044, 15.7194, ["nature", "history"], "low", "🏔️", "Karkonosze, Cieplice i pałace Kotliny."],
  ["Karpacz", PL, "🇵🇱", 50.7787, 15.7502, ["nature"], "medium", "⛰️", "Śnieżka, wodospady i drewniana Świątynia Wang."],
  ["Szklarska Poręba", PL, "🇵🇱", 50.8283, 15.523, ["nature"], "medium", "🌲", "Wodospad Szklarki, Szrenica i szlaki Karkonoszy."],
  ["Gniezno", PL, "🇵🇱", 52.5348, 17.5826, ["history"], "low", "👑", "Pierwsza stolica Polski i katedra z Drzwiami Gnieźnieńskimi."],
  // ── Czechy ────────────────────────────────────────────────────────────────
  ["Praga", CZ, "🇨🇿", 50.0755, 14.4378, ["history", "architecture", "nightlife", "food"], "medium", "🏰", "Most Karola, piwo i wąskie uliczki Starego Miasta."],
  ["Brno", CZ, "🇨🇿", 49.1951, 16.6068, ["architecture", "food", "nightlife"], "low", "🍺", "Spokojniejsze od Pragi, z dobrymi kawiarniami i piwem."],
  ["Ołomuniec", CZ, "🇨🇿", 49.5938, 17.2509, ["history", "architecture"], "low", "⛲", "Barokowe fontanny i kolumna Trójcy Przenajświętszej."],
  ["Ostrawa", CZ, "🇨🇿", 49.8209, 18.2625, ["architecture", "nightlife"], "low", "🏭", "Dolní Vítkovice i poprzemysłowy design."],
  ["Kutná Hora", CZ, "🇨🇿", 49.9484, 15.2682, ["history", "architecture"], "low", "⛪", "Katedra św. Barbary i kaplica kostnicy w Sedlcu."],
  ["Czeski Krumlow", CZ, "🇨🇿", 48.8127, 14.3175, ["history", "architecture", "nature"], "medium", "🏰", "Zamek nad zakolem Wełtawy i kolorowa starówka."],
  ["Pilzno", CZ, "🇨🇿", 49.7384, 13.3736, ["food", "history"], "low", "🍻", "Browar Pilsner Urquell i podziemne lochy piwne."],
  ["Karlowe Wary", CZ, "🇨🇿", 50.2319, 12.872, ["nature", "architecture"], "medium", "♨️", "Kolonady, źródła i spacer z kubeczkiem uzdrowiskowym."],
  ["Liberec", CZ, "🇨🇿", 50.7663, 15.0543, ["nature", "architecture"], "low", "⛰️", "Góry Izerskie i wieża Ještěd z hotelem na szczycie."],
  // ── Słowacja ──────────────────────────────────────────────────────────────
  ["Bratysława", SK, "🇸🇰", 48.1486, 17.1077, ["history", "food", "nightlife"], "low", "🏰", "Zamek nad Dunajem i zwarte stare miasto, łatwo zwiedzić pieszo."],
  ["Koszyce", SK, "🇸🇰", 48.7164, 21.2611, ["architecture", "history"], "low", "⛪", "Katedra św. Elżbiety i długa, pieszowa aleja starego miasta."],
  ["Poprad", SK, "🇸🇰", 49.0614, 20.298, ["nature"], "medium", "🏔️", "Brama do Tatr Wysokich, trasy po słowackiej stronie."],
  ["Bańska Bystrzyca", SK, "🇸🇰", 48.7363, 19.1462, ["history", "nature"], "low", "⛰️", "Zabytkowy rynek i Niżne Tatry w zasięgu jednego dnia."],
  ["Żylina", SK, "🇸🇰", 49.2231, 18.7394, ["nature", "history"], "low", "🏞️", "Rynek, zamek Orawski i Mała Fatra niedaleko."],
  ["Trenczyn", SK, "🇸🇰", 48.8945, 18.0444, ["history", "architecture"], "low", "🏰", "Zamek nad miastem i rzymski napis na skale."],
  // ── Niemcy ────────────────────────────────────────────────────────────────
  ["Berlin", DE, "🇩🇪", 52.52, 13.405, ["history", "nightlife", "food"], "medium", "🐻", "Mur, wyspa muzeów i kluby, które nie śpią."],
  ["Drezno", DE, "🇩🇪", 51.0504, 13.7373, ["architecture", "history"], "medium", "🏛️", "Odbudowana starówka i Zwinger nad Łabą."],
  ["Lipsk", DE, "🇩🇪", 51.3397, 12.3731, ["history", "nightlife"], "low", "🎼", "Miasto Bacha, Spinnerei i kawiarnie w pasażach."],
  ["Görlitz", DE, "🇩🇪", 51.1527, 14.9872, ["architecture", "history"], "low", "🌉", "Plan filmowy Grand Budapest Hotel i most na Nysie do Zgorzelca."],
  ["Poczdam", DE, "🇩🇪", 52.3906, 13.0645, ["history", "nature", "architecture"], "medium", "🏰", "Pałac Sanssouci i parki pod Berlinem."],
  ["Norymberga", DE, "🇩🇪", 49.4521, 11.0767, ["history", "food"], "medium", "🥨", "Zamek cesarski, pieczone kiełbaski i jarmark bożonarodzeniowy."],
  ["Monachium", DE, "🇩🇪", 48.1351, 11.582, ["food", "architecture", "nature"], "medium", "🍺", "Marienplatz, piwiarnie i Alpy na horyzoncie."],
  ["Hamburg", DE, "🇩🇪", 53.5511, 9.9937, ["architecture", "nightlife", "food"], "medium", "⚓", "Speicherstadt, Elbphilharmonie i Reeperbahn."],
  // ── Austria ───────────────────────────────────────────────────────────────
  ["Wiedeń", AT, "🇦🇹", 48.2082, 16.3738, ["architecture", "history", "food"], "medium", "🎻", "Kawiarnie, pałace i opera za stojące bilety."],
  ["Salzburg", AT, "🇦🇹", 47.8095, 13.055, ["history", "architecture", "nature"], "medium", "🎶", "Miasto Mozarta, twierdza nad starówką i Alpy w tle."],
  ["Graz", AT, "🇦🇹", 47.0707, 15.4395, ["architecture", "food"], "medium", "🏰", "Zamkowe wzgórze Schlossberg i dobre kuchnie styryjskie."],
  ["Innsbruck", AT, "🇦🇹", 47.2692, 11.4041, ["nature", "architecture"], "medium", "🚠", "Kolejki w góry z centrum miasta i Złoty Dach."],
  // ── Węgry ─────────────────────────────────────────────────────────────────
  ["Budapeszt", HU, "🇭🇺", 47.4979, 19.0402, ["architecture", "nightlife", "food"], "medium", "♨️", "Łaźnie termalne, ruin bary i widok na parlament znad Dunaju."],
  ["Eger", HU, "🇭🇺", 47.9025, 20.3772, ["history", "food"], "low", "🍷", "Zamek, Dolina Pięknej Pani i wino w piwnicach."],
  ["Győr", HU, "🇭🇺", 47.6875, 17.6504, ["architecture", "history"], "low", "🏘️", "Barokowa starówka na trasie Budapeszt – Wiedeń."],
  // ── Kraje bałtyckie ───────────────────────────────────────────────────────
  ["Wilno", "Litwa", "🇱🇹", 54.6872, 25.2797, ["history", "architecture", "food"], "low", "⛪", "Barokowa starówka, Zarzecze i cepeliny."],
  ["Kowno", "Litwa", "🇱🇹", 54.8985, 23.9036, ["history", "architecture"], "low", "🏙️", "Modernizm okresu międzywojennego i długi deptak Laisvės."],
  ["Ryga", "Łotwa", "🇱🇻", 56.9496, 24.1052, ["architecture", "nightlife", "food"], "low", "🕍", "Secesja, Stare Miasto i targ w dawnych hangarach zeppelinów."],
  // ── Bałkany i Adriatyk ────────────────────────────────────────────────────
  ["Zagrzeb", "Chorwacja", "🇭🇷", 45.815, 15.9819, ["architecture", "food", "nightlife"], "medium", "☕", "Kawiarnie Górnego Miasta i Muzeum Złamanych Związków."],
  ["Lublana", "Słowenia", "🇸🇮", 46.0569, 14.5058, ["nature", "food", "architecture"], "medium", "🐉", "Smoczy Most, nadrzeczne kawiarnie i jezioro Bled niedaleko."],
  ["Triest", "Włochy", "🇮🇹", 45.6495, 13.7768, ["history", "food"], "medium", "☕", "Zatoka, miejskie kawiarnie i pałac Miramare."],
  ["Wenecja", "Włochy", "🇮🇹", 45.4408, 12.3155, ["history", "architecture", "food"], "medium", "🛶", "Kanały, bacari i uliczki bez samochodów."],
  ["Werona", "Włochy", "🇮🇹", 45.4384, 10.9916, ["history", "architecture", "food"], "medium", "🎭", "Arena, balkon Julii i miasto bliżej jeziora Garda."],
  ["Split", "Chorwacja", "🇭🇷", 43.5081, 16.4402, ["history", "beach", "nightlife"], "medium", "🏖️", "Pałac Dioklecjana w środku miasta i plaże Bačvice."],
  ["Zadar", "Chorwacja", "🇭🇷", 44.1194, 15.2314, ["history", "beach", "nature"], "medium", "🌅", "Organy morskie i zachody słońca, o których pisał Hitchcock."],
  ["Dubrownik", "Chorwacja", "🇭🇷", 42.6507, 18.0944, ["history", "beach", "architecture"], "medium", "🏰", "Mury miejskie i widok na Adriatyk z góry Srđ."],
  ["Belgrad", "Serbia", "🇷🇸", 44.7866, 20.4489, ["nightlife", "history", "food"], "low", "🌃", "Kalemegdan, kafany i kluby na barkach nad Sawą."],
  ["Sarajewo", "Bośnia i Hercegowina", "🇧🇦", 43.8563, 18.4131, ["history", "food"], "low", "☕", "Baščaršija, kawa po bośniacku i most Łaciński."],
  ["Sofia", "Bułgaria", "🇧🇬", 42.6977, 23.3219, ["history", "food", "nature"], "low", "⛰️", "Cerkiew Aleksandra Newskiego i Witosza w tle miasta."],
];

const norm = (value: string): string =>
  value.toLowerCase().replace(/ł/g, "l").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z ]/g, "").trim();

// Inne zapisy tych samych miast (model potrafi odpowiedzieć po angielsku lub niemiecku).
const ALIASES: Record<string, string[]> = {
  praga: ["prague", "praha"], wieden: ["vienna", "wien"], budapeszt: ["budapest"], bratyslawa: ["bratislava"],
  norymberga: ["nuremberg", "nurnberg"], monachium: ["munich", "munchen"], drezno: ["dresden"], lipsk: ["leipzig"],
  ryga: ["riga"], wilno: ["vilnius"], kowno: ["kaunas"], zagrzeb: ["zagreb"], lublana: ["ljubljana"],
  wenecja: ["venice", "venezia"], belgrad: ["belgrade"], sarajewo: ["sarajevo"], triest: ["trieste"],
  dubrownik: ["dubrovnik"], ostrawa: ["ostrava"], olomuniec: ["olomouc"], pilzno: ["plzen", "pilsen"],
  koszyce: ["kosice"], trenczyn: ["trencin"], werona: ["verona"], wroclaw: ["breslau"], krakow: ["cracow"],
  warszawa: ["warsaw"], gdansk: ["danzig"], poznan: ["posen"], szczecin: ["stettin"], torun: ["thorn"],
  czeskikrumlow: ["cesky krumlov", "krumlov"], karlowewary: ["karlovy vary", "karlsbad"], poczdam: ["potsdam"],
};

export const GROUND_PLACES: readonly GroundPlace[] = ROWS.map(([city, country, countryFlag, lat, lng, tags, budgetLevel, coverImage, description]) => ({
  city, country, countryFlag, coords: [lat, lng] as const, tags, budgetLevel, coverImage, description,
}));

const BY_KEY = new Map<string, GroundPlace>();
for (const place of GROUND_PLACES) {
  const key = norm(place.city);
  BY_KEY.set(key, place);
  for (const alias of ALIASES[key.replace(/ /g, "")] ?? []) BY_KEY.set(norm(alias), place);
}

/** Miejsce z naszej listy po nazwie miasta (bez polskich znaków i wielkości liter) albo `null`. */
export function findGroundPlace(city: string): GroundPlace | null {
  return BY_KEY.get(norm(city)) ?? null;
}

export const normalizePlaceName = norm;
