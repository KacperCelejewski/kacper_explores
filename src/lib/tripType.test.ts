import { describe, expect, it } from "vitest";
import type { DayPlan, DayActivity, TripType } from "@/types";
import { TRIP_TYPE_VALUES } from "@/lib/quizOptions";
import {
  activeTripType, checkPlanTripType, destinationMatchesTripType, destinationTripTypePrompt,
  filterDestinationsForTripType, planTripTypePrompt, tripTypeSeason,
} from "./tripType";

const act = (title: string, description = "", type: DayActivity["type"] = "attraction"): DayActivity =>
  ({ time: "10:00", title, description, type, cost: "Free", emoji: "x" });
const day = (n: number, theme: string, ...activities: DayActivity[]): DayPlan => ({ day: n, date: `Dzień ${n}`, theme, activities });

// Plan, który właściciel dostał w teście: narty, a program to Krupówki i zwiedzanie.
const krupowkiPlan = {
  days: [
    day(1, "Zakopane i Krupówki", act("Spacer po Krupówkach"), act("Muzeum Tatrzańskie"), act("Stare Miasto i rynek")),
    day(2, "Zabytki Podhala", act("Zwiedzanie Zamku w Niedzicy"), act("Galeria sztuki"), act("Oscypek na deptaku", "", "food")),
    day(3, "Pożegnanie z miastem", act("Kościół w Zakopanem"), act("Ratusz")),
  ],
};

const skiPlan = {
  tripType: "narty",
  days: [
    day(1, "Przyjazd, wypożyczalnia i karnet", act("Wypożyczalnia sprzętu narciarskiego"), act("Karnet na wyciąg Nosal"), act("Spacer po Krupówkach", "krótki wieczór po nartach")),
    day(2, "Cały dzień na stoku", act("Kasprowy Wierch: jazda od otwarcia wyciągu"), act("Obiad w schronisku przy stoku", "", "food"), act("Sauna w hotelu", "regeneracja", "tip")),
    day(3, "Ostatnie zjazdy", act("Poranne zjazdy na Harendzie"), act("Powrót", "", "transport")),
  ],
};

describe("activeTripType", () => {
  it("brak odpowiedzi, null i zwiedzanie nie zmieniają zachowania", () => {
    for (const v of [undefined, null, "zwiedzanie" as const]) expect(activeTripType(v)).toBeNull();
    for (const v of TRIP_TYPE_VALUES.filter((t) => t !== "zwiedzanie")) expect(activeTripType(v)).toBe(v);
    expect(activeTripType("kosmos" as TripType)).toBeNull();
  });
});

describe("tripTypeSeason", () => {
  it("narty: zima pasuje, listopad i kwiecień są graniczne, reszta roku odpada", () => {
    for (const m of [12, 1, 2, 3]) expect(tripTypeSeason("narty", m)).toEqual({ fit: "ok", message: null });
    for (const m of [11, 4]) expect(tripTypeSeason("narty", m).fit).toBe("marginal");
    for (const m of [5, 6, 7, 8, 9, 10]) {
      const s = tripTypeSeason("narty", m);
      expect(s.fit).toBe("off");
      expect(s.message).toMatch(/grudzień–marzec/);
    }
  });
  it("plaża: lato pasuje, styczeń w Polsce odpada z uczciwym komunikatem", () => {
    expect(tripTypeSeason("plaza", 7).fit).toBe("ok");
    expect(tripTypeSeason("plaza", 5).fit).toBe("marginal");
    const jan = tripTypeSeason("plaza", 1);
    expect(jan.fit).toBe("off");
    expect(jan.message).toMatch(/Polsce/);
    expect(jan.message).toMatch(/nie gwarantuje/);
  });
  it("góry: wiosenne i jesienne przejścia są graniczne, reszta pasuje", () => {
    expect(tripTypeSeason("gory", 4).fit).toBe("marginal");
    expect(tripTypeSeason("gory", 8).fit).toBe("ok");
    expect(tripTypeSeason("gory", 1).fit).toBe("ok");
  });
  it("pozostałe rodzaje, brak rodzaju i brak miesiąca zawsze pasują", () => {
    for (const t of ["zwiedzanie", "wypoczynek", "aktywny", "wieczory", undefined] as const) expect(tripTypeSeason(t, 7).fit).toBe("ok");
    expect(tripTypeSeason("narty", null).fit).toBe("ok");
    expect(tripTypeSeason("narty", 0).fit).toBe("ok");
  });
  it("komunikaty: głos bezosobowy, bez wykrzykników", () => {
    for (const t of ["narty", "plaza", "gory"] as const) {
      for (let m = 1; m <= 12; m++) {
        const msg = tripTypeSeason(t, m).message;
        if (msg) expect(msg).not.toMatch(/!/);
      }
    }
  });
});

describe("prompt kierunków", () => {
  it("zwiedzanie i brak rodzaju: pusty blok (prompt bez zmian)", () => {
    expect(destinationTripTypePrompt(undefined, 1)).toBe("");
    expect(destinationTripTypePrompt("zwiedzanie", 1)).toBe("");
  });
  it("narty: tylko ośrodki z wyciągami, nie miasta do zwiedzania, bez cen karnetów", () => {
    const p = destinationTripTypePrompt("narty", 1);
    expect(p).toMatch(/RODZAJ WYJAZDU: Narty/);
    expect(p).toMatch(/WYŁĄCZNIE miejscowości z ośrodkiem narciarskim/);
    expect(p).toMatch(/Nie proponuj "miast do zwiedzania"/);
    expect(p).toMatch(/Nie podawaj cen karnetów/);
    expect(p).not.toMatch(/UWAGA, termin/);
  });
  it("narty poza sezonem: ostrzeżenie w prompcie i zgoda na krótszą listę", () => {
    const p = destinationTripTypePrompt("narty", 7);
    expect(p).toMatch(/UWAGA, termin nie pasuje/);
    expect(p).toMatch(/mniej niż 6, zwróć mniej/);
  });
  it("plaża w styczniu: tylko miejsca z plażą realną w tym miesiącu", () => {
    const p = destinationTripTypePrompt("plaza", 1);
    expect(p).toMatch(/plaża i morze/);
    expect(p).toMatch(/UWAGA, termin nie pasuje/);
  });
  it("każdy rodzaj poza zwiedzaniem ma własny blok z celem wyjazdu", () => {
    for (const t of TRIP_TYPE_VALUES.filter((v) => v !== "zwiedzanie")) {
      const p = destinationTripTypePrompt(t, 7);
      expect(p, t).toMatch(/Cel wyjazdu:/);
      expect(p, t).toMatch(/pierwszeństwo przed zainteresowaniami/);
    }
  });
});

describe("prompt planu (klucze każdego rodzaju)", () => {
  const phrases: Record<string, RegExp[]> = {
    narty: [/jeździe na nartach/, /wypożyczalnia/, /karnet/, /otwarcia wyciągów/, /zamknięcia wyciągów/, /odpoczynek \(sauna/, /NIE układaj programu dnia ze zwiedzania/, /Krótki wieczorny spacer/],
    gory: [/chodzeniu po górach/, /szlak/, /Pogoda i bezpieczeństwo/, /NIE układaj programu dnia ze zwiedzania miasta/],
    plaza: [/plażowaniu/, /plaże i zatoki/, /nie obiecuj kąpieli/],
    wypoczynek: [/niskie tempo/, /Najwyżej dwie aktywności/, /przed 9:00/],
    aktywny: [/aktywności ruchowej/, /wypożyczalnie/, /NIE układaj programu dnia ze zwiedzania muzeów/],
    wieczory: [/wokół wieczorów/, /bary, muzyka na żywo, kluby/, /bezpiecznie wrócić na nocleg/],
  };
  it("zwiedzanie i brak rodzaju: pusty blok", () => {
    expect(planTripTypePrompt(undefined)).toBe("");
    expect(planTripTypePrompt("zwiedzanie")).toBe("");
  });
  for (const [type, regs] of Object.entries(phrases)) {
    it(`${type}: struktura dnia pod rodzaj i pole tripType`, () => {
      const p = planTripTypePrompt(type as TripType);
      expect(p).toContain(`"tripType": "${type}"`);
      expect(p).toMatch(/pierwszeństwo przed STYLEM PLANOWANIA/);
      for (const r of regs) expect(p).toMatch(r);
    });
  }
  it("narty: żadnych wymyślonych cen karnetu, tylko cennik ośrodka albo zakres orientacyjny", () => {
    const p = planTripTypePrompt("narty");
    expect(p).toMatch(/nie podawaj cen karnetu ani wypożyczenia jako faktu/);
    expect(p).toMatch(/sprawdź cennik ośrodka/);
    expect(p).toMatch(/orientacyjnie/);
    expect(p).not.toMatch(/\d\s*(zł|PLN)/i);
    expect(p).toMatch(/godziny wyciągów: sprawdź w ośrodku/);
  });
});

describe("filtr kierunków dla nart", () => {
  const zakopane = { city: "Zakopane", description: "Ośrodek narciarski pod Tatrami: wyciągi na Kasprowy i Nosal.", highlights: ["Trasy zjazdowe na Harendzie", "Karnet łączony", "Schroniska przy stoku"] };
  const praga = { city: "Praga", description: "Stare Miasto, mosty i piwo.", highlights: ["Most Karola", "Zamek Praski", "Rynek Staromiejski"] };
  const livigno = { city: "Livigno", description: "Duty-free i szerokie stoki.", highlights: ["Wyciągi do 2800 m", "Szkoły narciarskie", "Strefa bez podatku"] };

  it("zostawia miejsca z infrastrukturą narciarską, odrzuca miasta do zwiedzania", () => {
    expect(filterDestinationsForTripType([zakopane, praga, livigno], "narty").map((d) => d.city)).toEqual(["Zakopane", "Livigno"]);
    expect(destinationMatchesTripType(praga, "narty")).toBe(false);
  });
  it("bez rodzaju i dla zwiedzania nic nie odrzuca (zgodność wsteczna)", () => {
    expect(filterDestinationsForTripType([zakopane, praga], undefined)).toHaveLength(2);
    expect(filterDestinationsForTripType([zakopane, praga], "zwiedzanie")).toHaveLength(2);
  });
  it("plaża i góry też wymagają śladu rodzaju w opisie; rodzaje bez filtra przepuszczają", () => {
    expect(destinationMatchesTripType({ city: "Lizbona", description: "Tramwaje i muzea." }, "plaza")).toBe(false);
    expect(destinationMatchesTripType({ city: "Algarve", description: "Złote plaże i klify." }, "plaza")).toBe(true);
    expect(destinationMatchesTripType({ city: "Tbilisi", description: "Stare miasto." }, "gory")).toBe(false);
    expect(destinationMatchesTripType({ city: "Praga", description: "Bary i kluby." }, "wieczory")).toBe(true);
  });
  it("słowo 'narty' dopasowane jako całe słowo, 'bar' nie łapie Barcelony", () => {
    expect(destinationMatchesTripType({ city: "Wisła", description: "Skocznie i narty biegowe." }, "narty")).toBe(true);
    expect(destinationMatchesTripType({ city: "Barcelona", description: "Gaudí i plaża." }, "narty")).toBe(false);
  });
});

describe("zgodność planu z rodzajem wyjazdu", () => {
  it("narty: plan z Krupówkami jako osią programu nie przechodzi", () => {
    const r = checkPlanTripType(krupowkiPlan, "narty");
    expect(r.ok).toBe(false);
    expect(r.onTopicDays).toBe(0);
    expect(r.issues.join(" ")).toMatch(/zwiedzanie miasta/);
  });
  it("narty: plan zbudowany wokół stoku przechodzi, nawet z jednym wieczornym spacerem po Krupówkach", () => {
    const r = checkPlanTripType(skiPlan, "narty");
    expect(r.ok).toBe(true);
    expect(r.onTopicDays).toBe(3);
  });
  it("narty: nieuczciwy motyw dnia nie ratuje planu, gdy aktywności to zwiedzanie", () => {
    const plan = { days: [day(1, "Dzień na stoku", act("Zwiedzanie zamku"), act("Muzeum"), act("Starówka")), day(2, "Dzień na stoku", act("Katedra"), act("Ratusz"))] };
    const r = checkPlanTripType(plan, "narty");
    expect(r.issues.join(" ")).toMatch(/zwiedzanie miasta/);
    expect(r.ok).toBe(false);
  });
  it("narty: kolejka na Gubałówkę i Muzeum Tatrzańskie to nadal zwiedzanie, nie stok", () => {
    const plan = { days: [
      day(1, "Zakopane", act("Kolejka na Gubałówkę"), act("Muzeum Tatrzańskie"), act("Krupówki"), act("Informacja turystyczna")),
      day(2, "Zakopane", act("Zjazd kolejką z Gubałówki"), act("Katedra")),
    ] };
    const r = checkPlanTripType(plan, "narty");
    expect(r.ok).toBe(false);
    expect(r.onTopicDays).toBe(0);
  });
  it("góry: wejście do muzeum i punkt informacji turystycznej nie są szlakiem", () => {
    const plan = { days: [day(1, "Miasto", act("Wejście do muzeum"), act("Informacja turystyczna")), day(2, "Miasto", act("Ratusz"))] };
    expect(checkPlanTripType(plan, "gory").ok).toBe(false);
  });
  it("narty: jedna wzmianka o stoku w dniu zwiedzania nie wystarcza (udział aktywności w temacie)", () => {
    const plan = { days: [
      day(1, "Dzień w Zakopanem", act("Karnet na wyciąg"), act("Muzeum Tatrzańskie"), act("Galeria sztuki"), act("Kościół"), act("Ratusz")),
      day(2, "Dzień w Zakopanem", act("Jazda na nartach"), act("Zamek"), act("Rynek"), act("Pomnik")),
    ] };
    const r = checkPlanTripType(plan, "narty");
    expect(r.ok).toBe(false);
    expect(r.issues.join(" ")).toMatch(/aktywności programu/);
  });
  it("pole tripType w odpowiedzi musi się zgadzać; jego brak nie jest błędem", () => {
    expect(checkPlanTripType({ ...skiPlan, tripType: "plaza" }, "narty").ok).toBe(false);
    expect(checkPlanTripType({ days: skiPlan.days }, "narty").ok).toBe(true);
  });
  it("zwiedzanie i brak rodzaju: każdy plan jest zgodny (zachowanie jak dotąd)", () => {
    expect(checkPlanTripType(krupowkiPlan, undefined).ok).toBe(true);
    expect(checkPlanTripType(krupowkiPlan, "zwiedzanie").ok).toBe(true);
  });
  it("dwudniowy wyjazd wymaga co najmniej jednego dnia w temacie", () => {
    const two = { days: [day(1, "Dojazd", act("Jazda na nartach, wyciąg")), day(2, "Powrót", act("Śniadanie", "", "food"))] };
    expect(checkPlanTripType(two, "narty").ok).toBe(true);
  });
  it("plaża z programem zabytków nie przechodzi, plaża z plażą przechodzi", () => {
    const bad = { days: [day(1, "Miasto", act("Muzeum"), act("Katedra")), day(2, "Miasto", act("Zamek"))] };
    const good = { days: [day(1, "Plaża", act("Plaża Praia da Rocha"), act("Kąpiel w zatoce")), day(2, "Klify", act("Spacer wybrzeżem"))] };
    expect(checkPlanTripType(bad, "plaza").ok).toBe(false);
    expect(checkPlanTripType(good, "plaza").ok).toBe(true);
  });
  it("wypoczynek i wieczory: kontrola tylko tematu dnia, bez zakazu zwiedzania", () => {
    const spa = { days: [day(1, "Termy i leniwe śniadanie", act("Termy Bukowina")), day(2, "Spacer nad jeziorem", act("Jezioro"))] };
    expect(checkPlanTripType(spa, "wypoczynek").ok).toBe(true);
    const night = { days: [day(1, "Bary", act("Bar Nowy Świat")), day(2, "Koncert", act("Klub Alchemia"))] };
    expect(checkPlanTripType(night, "wieczory").ok).toBe(true);
  });
});
