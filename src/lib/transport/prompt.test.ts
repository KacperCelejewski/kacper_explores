import { describe, expect, it } from "vitest";
import { buildPlanPrompt } from "@/lib/gemini";
import { calcTripSchedule, formatScheduleForPrompt } from "@/lib/tripSchedule";
import type { DestinationRecommendation, FlightDetails, QuizAnswers } from "@/types";

const quiz = (over: Partial<QuizAnswers> = {}): QuizAnswers => ({
  budget: "low", vibe: "chill", styles: ["food"], placeType: null, month: 6, duration: 3,
  airports: ["WRO"], companion: "solo", ...over,
});
const praga: DestinationRecommendation = {
  city: "Praga", country: "Czechy", countryFlag: "🇨🇿", tags: ["history"], budgetLevel: "low", coverImage: "🏰", description: "x",
};
const details = (arrivalTime?: string, returnTime?: string): FlightDetails => ({
  arrivalDate: "2026-12-04", returnDate: "2026-12-06", ...(arrivalTime ? { arrivalTime } : {}), ...(returnTime ? { returnTime } : {}),
});

describe("prompt planu: samolot (zgodność wsteczna)", () => {
  it("brak transportu i transport: samolot dają ten sam prompt, z lotem i bez dojazdu lądowego", () => {
    const legacy = buildPlanPrompt(praga, quiz(), details("10:00", "18:00"));
    expect(buildPlanPrompt(praga, quiz({ transport: ["samolot"] }), details("10:00", "18:00"))).toBe(legacy);
    expect(legacy).toContain("DANE LOTU: przylot 2026-12-04 o 10:00");
    expect(legacy).toContain("Cena lotu jest NIEZNANA");
    expect(legacy).toContain('"flights":"Sprawdź w wyszukiwarce"');
    expect(legacy).not.toMatch(/ŚRODEK TRANSPORTU|DANE DOJAZDU|Własny samochód|parking/);
  });
  it("samolot z innymi środkami planuje lot (jak dziś), dopóki nie wskazano jednego", () => {
    const p = buildPlanPrompt(praga, quiz({ transport: ["auto", "samolot"] }), details("10:00", "18:00"));
    expect(p).toContain("DANE LOTU");
    expect(p).not.toContain("ŚRODEK TRANSPORTU");
  });
});

describe("prompt planu: dojazd lądowy", () => {
  it("auto: środek, szacunek drogi, parking, zamiast lotu", () => {
    const p = buildPlanPrompt(praga, quiz({ transport: ["auto"] }), details("14:00", "16:00"));
    expect(p).toContain("ŚRODEK TRANSPORTU: własny samochód, start: Wrocław");
    expect(p).toMatch(/Droga w jedną stronę: ok\. \d+ km, ok\. [\d,]+ h \(szacunek/);
    expect(p).toContain("DANE DOJAZDU: przyjazd 2026-12-04 o 14:00");
    expect(p).toMatch(/parking/i);
    expect(p).not.toMatch(/DANE LOTU|Cena lotu|lotnisk|przylot|PRZYLOT/);
    expect(p).toMatch(/"flights":"Auto: paliwo ok\. \d+–\d+ zł za auto w obie strony \(szacunek\)"/);
  });
  it("pociąg lub bus: dojście z dworca, bez auta", () => {
    const p = buildPlanPrompt(praga, quiz({ transport: ["pociag_bus"] }), details());
    expect(p).toContain("pociąg lub bus");
    expect(p).toMatch(/z dworca lub przystanku/);
    expect(p).toContain("Brakujących godzin nie zgaduj");
    expect(p).not.toMatch(/parking/i);
  });
  it("rower: trasy i noclegi dla rowerzystów, dni w siodle przy dłuższym dojeździe", () => {
    const kłodzko = { ...praga, city: "Kłodzko", country: "Polska" };
    const p = buildPlanPrompt(kłodzko, quiz({ transport: ["rower"] }), details("12:00", "15:00"));
    expect(p).toMatch(/trasy rowerowe/);
    expect(p).toMatch(/przechowalnia/);
    expect(p).toMatch(/"flights":"Rower: bez opłat za przejazd"/);
  });
  it("miasta spoza naszej listy: bez zmyślonych liczb", () => {
    const p = buildPlanPrompt({ ...praga, city: "Miasto Którego Nie Znamy" }, quiz({ transport: ["auto"] }), details());
    expect(p).toContain("Czas i koszt drogi nieznane: nie zgaduj ich");
    expect(p).not.toMatch(/Droga w jedną stronę: ok\./);
  });
  it("plan dnia 1 i ostatniego: przyjazd i wyjazd liczone od miejsca, bez dojazdu z lotniska", () => {
    const g = { mode: "auto" as const, hours: 4 };
    const flight = formatScheduleForPrompt(calcTripSchedule(3, details("10:00", "18:00")));
    const ground = formatScheduleForPrompt(calcTripSchedule(3, details("10:00", "18:00"), g));
    expect(flight).toContain("PRZYLOT");
    expect(ground).not.toMatch(/PRZYLOT|LOT O|lotu|1,5h/);
    expect(ground).toContain("PRZYJAZD o 10:00");
    expect(ground).toContain("Droga autem zajmuje ok. 4 h");
    expect(ground).toMatch(/parking/i);
    const [arrival] = calcTripSchedule(3, details("10:00", "18:00"), g).days;
    expect(arrival.availableFrom).toBe("10:30");
    expect(calcTripSchedule(3, details("10:00", "18:00"), g).days.at(-1)?.availableTo).toBe("17:00");
  });
  it("jednodniowy wyjazd lądowy i brak godzin też nie wspominają lotu", () => {
    expect(formatScheduleForPrompt(calcTripSchedule(1, details("09:00", "20:00"), { mode: "rower", hours: 3 }))).not.toMatch(/PRZYLOT|lot/i);
    expect(formatScheduleForPrompt(calcTripSchedule(3, null, { mode: "pociag_bus", hours: null }))).not.toMatch(/PRZYLOT|lot/i);
  });
});
