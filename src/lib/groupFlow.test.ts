import { describe, expect, it } from "vitest";
import { FORBIDDEN_COPY } from "./homeCopy";
import {
  CREW_COPY,
  companionTrailLabel,
  crewBudgetNote,
  crewSummary,
  crewTotalBudget,
  sharedCrewFromQuiz,
  flightTotalNote,
  isCrewTrip,
  quizCompanionHint,
  sendPlanTitle,
  shareUrl,
} from "./groupFlow";

const FOUR = { adults: 4, childrenAges: [] };

describe("companionTrailLabel", () => {
  it("dla znajomych ze składem pokazuje ekipę i liczbę osób", () => {
    expect(companionTrailLabel("friends", FOUR, "Znajomi")).toBe("Ekipa · 4 osoby");
    expect(companionTrailLabel("friends", { adults: 3, childrenAges: [] }, "Znajomi")).toBe("Ekipa · 3 osoby");
    expect(companionTrailLabel("friends", { adults: 5, childrenAges: [] }, "Znajomi")).toBe("Ekipa · 5 osób");
  });

  it("dla rodziny podaje dorosłych i dzieci", () => {
    expect(companionTrailLabel("family", { adults: 2, childrenAges: [5] }, "Rodzina")).toBe(
      "Rodzina · 2 dorosłych, dziecko: 5 lat",
    );
  });

  it("bez składu albo dla solo i pary zostaje zwykła etykieta", () => {
    expect(companionTrailLabel("friends", undefined, "Znajomi")).toBe("Znajomi");
    expect(companionTrailLabel("solo", undefined, "Sam/a")).toBe("Sam/a");
    expect(companionTrailLabel("couple", FOUR, "Para")).toBe("Para");
  });
});

describe("crewSummary", () => {
  it("składa tytuł i opis składu dla ekipy i rodziny", () => {
    expect(crewSummary("friends", FOUR)).toEqual({ title: "Wasza ekipa", detail: "4 osoby" });
    expect(crewSummary("family", { adults: 2, childrenAges: [3, 8] })).toEqual({
      title: "Wasza rodzina",
      detail: "2 dorosłych, dzieci: 3 i 8 lat",
    });
  });

  it("zwraca null dla solo, pary i braku składu", () => {
    expect(crewSummary("solo", undefined)).toBeNull();
    expect(crewSummary("couple", FOUR)).toBeNull();
    expect(crewSummary("friends", undefined)).toBeNull();
    expect(crewSummary(null, null)).toBeNull();
    expect(isCrewTrip("friends", FOUR)).toBe(true);
  });
});

describe("crewBudgetNote", () => {
  it("mnoży budżet na osobę przez liczbę miejsc", () => {
    expect(crewBudgetNote("low", "friends", FOUR)).toBe("do 1 500 zł na osobę, razem do 6 000 zł");
    expect(crewBudgetNote("medium", "friends", { adults: 3, childrenAges: [] })).toBe(
      "1 500–3 000 zł na osobę, razem 4 500–9 000 zł",
    );
  });

  it("niemowlę nie zwiększa mnożnika, bo nie zajmuje miejsca", () => {
    expect(crewBudgetNote("low", "family", { adults: 2, childrenAges: [1] })).toBe(
      "do 1 500 zł na osobę, razem do 3 000 zł",
    );
  });

  it("nie pokazuje nic dla jednej osoby, solo i braku budżetu", () => {
    expect(crewBudgetNote("low", "solo", undefined)).toBeNull();
    expect(crewBudgetNote(null, "friends", FOUR)).toBeNull();
    expect(crewBudgetNote("low", "family", { adults: 1, childrenAges: [] })).toBeNull();
  });
});

describe("flightTotalNote", () => {
  it("podaje sumę lotów dla całej ekipy", () => {
    const note = flightTotalNote(450, "friends", FOUR);
    expect(note).toContain("razem ok.");
    expect(note?.replace(/ /g, " ")).toBe("razem ok. 1800 zł (4 osoby)");
  });

  it("zwraca null dla jednej osoby i niepoprawnej ceny", () => {
    expect(flightTotalNote(450, "solo", undefined)).toBeNull();
    expect(flightTotalNote(0, "friends", FOUR)).toBeNull();
    expect(flightTotalNote(Number.NaN, "friends", FOUR)).toBeNull();
  });
});

describe("quizCompanionHint", () => {
  it("dla znajomych mówi, co dostanie ekipa", () => {
    const hint = quizCompanionHint("friends");
    expect(hint).toContain("ilu Was jedzie");
    expect(hint).toContain("koszt na osobę i razem");
    expect(hint).toContain("plan do wysłania ekipie");
  });

  it("dla pozostałych jest ogólny albo rodzinny", () => {
    expect(quizCompanionHint("family")).toContain("rodziny");
    expect(quizCompanionHint("solo")).toBe(quizCompanionHint(null));
  });
});

describe("wysyłanie planu", () => {
  it("tytuł zależy od składu", () => {
    expect(sendPlanTitle("friends", FOUR)).toBe("Wyślij plan ekipie");
    expect(sendPlanTitle("solo", undefined)).toBe("Wyślij plan");
  });

  it("buduje publiczny adres bez podwójnego ukośnika", () => {
    expect(shareUrl("https://wloczykij.me/", "budapeszt-1")).toBe("https://wloczykij.me/share/budapeszt-1");
  });
});

describe("CREW_COPY", () => {
  const strings = Object.values(CREW_COPY) as string[];

  it("nie łamie reguł głosu marki", () => {
    for (const s of strings) for (const re of FORBIDDEN_COPY) expect(s, `"${s}" vs ${re}`).not.toMatch(re);
  });

  it("nie obiecuje zaproszeń, głosowania, wspólnych lotów ani rozliczeń", () => {
    const re = /zaproś|zaproszen|głosow|rozlicz|podział kosztów|wspólne loty|wspólny lot/i;
    for (const s of strings) expect(s, s).not.toMatch(re);
  });

  it("używa spójnej nazwy ekipy i nie mówi 'grupa'", () => {
    for (const s of strings) expect(s, s).not.toMatch(/grup[aąyęie]/i);
  });
});

describe("sharedCrewFromQuiz", () => {
  it("zwraca tylko skład ekipy, bez reszty odpowiedzi", () => {
    const crew = sharedCrewFromQuiz({ companion: "friends", group: FOUR, budget: "low", airports: ["WRO"] });
    expect(crew).toEqual({ companion: "friends", group: FOUR });
    expect(Object.keys(crew ?? {})).toEqual(["companion", "group"]);
  });

  it("odrzuca solo, parę, brak składu i niepoprawny skład", () => {
    expect(sharedCrewFromQuiz({ companion: "solo" })).toBeNull();
    expect(sharedCrewFromQuiz({ companion: "couple", group: FOUR })).toBeNull();
    // wiek dzieci nie trafia do publicznego widoku
    expect(sharedCrewFromQuiz({ companion: "family", group: { adults: 2, childrenAges: [4] } })).toBeNull();
    expect(sharedCrewFromQuiz({ companion: "friends" })).toBeNull();
    expect(sharedCrewFromQuiz({ companion: "friends", group: { adults: 99, childrenAges: [] } })).toBeNull();
    expect(sharedCrewFromQuiz(null)).toBeNull();
    expect(sharedCrewFromQuiz("x")).toBeNull();
  });
});

describe("crewTotalBudget", () => {
  const crew = { companion: "friends" as const, group: FOUR };

  it("mnoży szacunek na osobę przez liczbę osób", () => {
    expect(crewTotalBudget("1200–1500 PLN", crew)).toBe("4 800–6 000 PLN");
  });

  it("nie liczy nic bez ekipy ani dla jednej osoby", () => {
    expect(crewTotalBudget("1200 PLN", null)).toBeNull();
    expect(crewTotalBudget("1200 PLN", { companion: "friends", group: { adults: 1, childrenAges: [] } })).toBeNull();
    expect(crewTotalBudget("", crew)).toBeNull();
  });
});
