import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  FLIGHT_UNKNOWN_LINE, ON_SITE_TOTAL_LABEL, WITH_FLIGHT_TOTAL_LABEL,
  buildPlanCostModel, costAssumptions, nightsFor, usableFlight, type FlightQuote, type PlanCostInput,
} from "./costModel";
import { FORBIDDEN_COPY } from "./homeCopy";

const now = Date.parse("2026-11-20T12:00:00Z");
const quote = (over: Partial<FlightQuote> = {}): FlightQuote => ({
  pricePerPerson: 320, checkedAt: now - 2 * 86400000, multiplyByGroup: true, ...over,
});
const base: PlanCostInput = {
  breakdown: { flights: "Sprawdź w wyszukiwarce", accommodation: "300-400 PLN", food: "200-250 PLN", attractions: "100-150 PLN", transport: "50-80 PLN" },
  totalEstimate: "650-880 PLN",
  duration: 3, people: 1, group: false, standard: "low", now,
};
const key = (m: ReturnType<typeof buildPlanCostModel>, k: string) => m.components.find((c) => c.key === k)!;

describe("sumy: lot znany, nieznany, brak szacunku", () => {
  it("bez ceny lotu: tylko suma na miejscu i 'sprawdź w wyszukiwarce', nigdy 'Razem z lotem'", () => {
    const m = buildPlanCostModel(base);
    expect(m.onSite.label).toBe(ON_SITE_TOTAL_LABEL);
    expect(ON_SITE_TOTAL_LABEL).toBe("Razem na miejscu (bez lotu)");
    expect(m.onSite.perPerson).toBe("650-880 PLN");
    expect(m.withFlight).toBeNull();
    expect(m.flightLine).toBe(FLIGHT_UNKNOWN_LINE);
    expect(key(m, "flight").value).toBeNull();
    expect(key(m, "flight").display).toBe("sprawdź w wyszukiwarce");
    expect(key(m, "flight").status).toBe("unknown");
    expect(JSON.stringify(m)).not.toContain(WITH_FLIGHT_TOTAL_LABEL);
  });

  it("z prawdziwą świeżą ceną lotu: 'Razem z lotem' z datą i jawnym rozdziałem lot / szacunek", () => {
    const m = buildPlanCostModel({ ...base, flight: quote() });
    expect(m.withFlight?.label).toBe("Razem z lotem");
    expect(m.withFlight?.perPerson).toBe("970–1 200 PLN");
    expect(m.withFlight?.note).toContain("cena z 18.11");
    expect(m.withFlight?.note).toMatch(/Reszta: szacunek modelu AI/);
    expect(m.flightLine).toBe("Lot: 320 zł za osobę, w obie strony, cena z 18.11");
    expect(key(m, "flight")).toMatchObject({ value: "320 zł", status: "verified", statusLabel: "cena z 18.11", inOnSiteTotal: false });
  });

  it("suma na miejscu nie zmienia się po dodaniu lotu (lot jest poza nią)", () => {
    expect(buildPlanCostModel({ ...base, flight: quote() }).onSite).toEqual(buildPlanCostModel(base).onSite);
  });

  it("stara, przyszła albo błędna cena lotu nie wchodzi do żadnej sumy", () => {
    for (const bad of [quote({ checkedAt: now - 9 * 86400000 }), quote({ checkedAt: now + 86400000 }), quote({ pricePerPerson: 0 }), quote({ pricePerPerson: NaN }), quote({ checkedAt: NaN })]) {
      const m = buildPlanCostModel({ ...base, flight: bad });
      expect(m.withFlight).toBeNull();
      expect(m.flightLine).toBe(FLIGHT_UNKNOWN_LINE);
      expect(usableFlight(bad, now)).toBeNull();
    }
  });

  it("brak szacunku modelu: nie ma sumy ani 'z lotem', nawet przy prawdziwej cenie lotu", () => {
    for (const totalEstimate of ["", "Sprawdź w wyszukiwarce", "brak"]) {
      const m = buildPlanCostModel({ ...base, totalEstimate, flight: quote() });
      expect(m.onSite.perPerson).toBeNull();
      expect(m.onSite.groupTotal).toBeNull();
      expect(m.withFlight).toBeNull(); // prawdziwego lotu nie sumujemy z niczym, czego nie ma
      expect(m.flightLine).toContain("320 zł"); // sam lot nadal pokazujemy jako lot
    }
  });
});

describe("grupa i solo", () => {
  it("solo: bez 'razem'", () => {
    const m = buildPlanCostModel({ ...base, flight: quote() });
    expect(m.onSite.groupTotal).toBeNull();
    expect(m.withFlight?.groupTotal).toBeNull();
  });

  it("grupa: na osobę i razem, razem = na osobę x liczba osób", () => {
    const m = buildPlanCostModel({ ...base, people: 4, group: true });
    expect(m.onSite.perPerson).toBe("650-880 PLN");
    expect(m.onSite.groupTotal).toBe("2 600–3 520 PLN");
    expect(m.withFlight).toBeNull();
  });

  it("grupa z ceną lotu z cache: razem z lotem dla wszystkich", () => {
    const m = buildPlanCostModel({ ...base, people: 4, group: true, flight: quote() });
    expect(m.withFlight?.perPerson).toBe("970–1 200 PLN");
    expect(m.withFlight?.groupTotal).toBe("3 880–4 800 PLN");
  });

  it("grupa z ceną z okazji (1 dorosły): nie mnożymy lotu przez grupę, więc nie ma sumy 'razem z lotem'", () => {
    const m = buildPlanCostModel({ ...base, people: 4, group: true, flight: quote({ multiplyByGroup: false }) });
    expect(m.withFlight?.perPerson).toBe("970–1 200 PLN");
    expect(m.withFlight?.groupTotal).toBeNull();
    expect(m.onSite.groupTotal).toBe("2 600–3 520 PLN");
  });

  it("jedna osoba oznaczona jako grupa nie pokazuje 'razem'", () => {
    expect(buildPlanCostModel({ ...base, people: 1, group: true }).onSite.groupTotal).toBeNull();
  });
});

describe("składniki", () => {
  it("nocleg, jedzenie, atrakcje i transport są szacunkiem wliczonym w sumę na miejscu", () => {
    const m = buildPlanCostModel(base);
    for (const k of ["accommodation", "food", "attractions", "localTransport"]) {
      expect(key(m, k)).toMatchObject({ status: "estimate", statusLabel: "szacunek", inOnSiteTotal: true });
    }
    expect(key(m, "accommodation").value).toBe("300-400 PLN");
  });

  it("starszy plan bez osobnej kwoty transportu: mówi to wprost, nie zmyśla kwoty", () => {
    const breakdown = { ...base.breakdown, transport: undefined };
    const t = key(buildPlanCostModel({ ...base, breakdown }), "localTransport");
    expect(t.value).toBeNull();
    expect(t.inOnSiteTotal).toBe(true);
    expect(t.statusLabel).toBe("bez osobnej kwoty");
    expect(t.display).toBe("wliczony");
  });

  it("tekst modelu w polu 'flights' nigdy nie jest kwotą lotu", () => {
    const m = buildPlanCostModel({ ...base, breakdown: { ...base.breakdown, flights: "300-400 PLN" } });
    expect(key(m, "flight").value).toBeNull();
    expect(m.flightLine).toBe(FLIGHT_UNKNOWN_LINE);
  });

  it("brakująca kwota składnika to 'brak szacunku', nie zero", () => {
    const m = buildPlanCostModel({ ...base, breakdown: { ...base.breakdown, food: "" } });
    expect(key(m, "food")).toMatchObject({ value: null, status: "unknown", statusLabel: "brak szacunku" });
  });

  it("miejsce na dojazd (P9): orientacyjnie i poza sumą na miejscu; bez dojazdu nie ma pozycji", () => {
    expect(buildPlanCostModel(base).components.some((c) => c.key === "access")).toBe(false);
    const m = buildPlanCostModel({ ...base, access: { label: "Dojazd autem", value: "ok. 120-180 PLN" } });
    expect(key(m, "access")).toMatchObject({ label: "Dojazd autem", status: "estimate", statusLabel: "orientacyjnie", inOnSiteTotal: false });
    expect(m.onSite).toEqual(buildPlanCostModel(base).onSite);
  });
});

describe("starszy plan z kwotą lotu w polu flights", () => {
  const legacy: PlanCostInput = { ...base, breakdown: { ...base.breakdown, flights: "350-550 PLN" } };
  it("nie nazywa sumy 'bez lotu' i nie dokłada do niej lotu", () => {
    const m = buildPlanCostModel({ ...legacy, flight: quote() });
    expect(m.onSite.label).toBe("Szacunek planu (starszy plan, może zawierać lot)");
    expect(m.onSite.label).not.toMatch(/bez lotu/);
    expect(m.onSite.note).toMatch(/mógł wliczyć do niej lot/);
    expect(m.withFlight).toBeNull();
    expect(m.legacy).toBe(true);
    expect(buildPlanCostModel(base).legacy).toBe(false);
    expect(key(m, "flight").value).toBe("320 zł"); // sam lot z wyszukiwania nadal widać jako lot
  });
  it("kwota lotu od modelu nadal nie jest pokazywana jako cena lotu", () => {
    const m = buildPlanCostModel(legacy);
    expect(key(m, "flight").value).toBeNull();
    expect(m.flightLine).toBe(FLIGHT_UNKNOWN_LINE);
  });
  it("nowy plan (flights bez kwoty) dostaje zwykłą etykietę", () => {
    expect(buildPlanCostModel(base).onSite.label).toBe(ON_SITE_TOTAL_LABEL);
  });
});

describe("założenia noclegu", () => {
  it("para (nie grupa) liczy się jak jedna osoba, tak jak w prompcie", () => {
    expect(buildPlanCostModel({ ...base, people: 2, group: false }).assumptions).toContain("2 noce, 1 osoba, standard budżetowy");
  });
  it("grupa: liczba osób i jawne 'kwoty na osobę'", () => {
    expect(buildPlanCostModel({ ...base, people: 4, group: true }).assumptions).toContain("4 osoby, standard budżetowy, kwoty na osobę");
  });
  it("noce, osoby i standard w polskiej odmianie", () => {
    expect(nightsFor(3)).toBe(2);
    expect(nightsFor(1)).toBe(1);
    expect(nightsFor(6)).toBe(5);
    expect(costAssumptions(3, 1, "low")).toContain("2 noce, 1 osoba, standard budżetowy");
    expect(costAssumptions(6, 4, "medium")).toContain("5 nocy, 4 osoby, standard komfortowy");
    expect(costAssumptions(2, 5, null)).toContain("1 noc, 5 osób");
    expect(costAssumptions(2, 5, null)).not.toContain("standard");
  });
  it("mówi, że to szacunek modelu, nie rezerwacja", () => {
    expect(costAssumptions(3, 1)).toMatch(/szacunek modelu AI/);
    expect(costAssumptions(3, 1)).toMatch(/nie rezerwacja ani oferta/);
  });
  it("model zawiera założenia zgodne z wejściem", () => {
    expect(buildPlanCostModel({ ...base, people: 4, group: true, duration: 4, standard: "medium" }).assumptions)
      .toContain("3 noce, 4 osoby, standard komfortowy");
  });
});

describe("teksty", () => {
  it("bez wykrzykników, emoji i form zakazanych; z polskimi diakrytykami", () => {
    const models = [
      buildPlanCostModel(base),
      buildPlanCostModel({ ...base, people: 4, group: true, flight: quote(), access: { value: "100-150 PLN" } }),
      buildPlanCostModel({ ...base, totalEstimate: "" }),
    ];
    for (const m of models) {
      const text = [
        ...m.components.flatMap((c) => [c.label, c.statusLabel, c.note]),
        m.onSite.label, m.onSite.note, m.flightLine, m.assumptions,
        ...(m.withFlight ? [m.withFlight.label, m.withFlight.note] : []),
      ].join(" ");
      for (const re of FORBIDDEN_COPY) expect(text, String(re)).not.toMatch(re);
    }
    const all = JSON.stringify(buildPlanCostModel({ ...base, flight: quote() }));
    expect(all).toMatch(/Założenia/);
    expect(all).toMatch(/sumę/);
  });

  it("strona planu i podglądu używają wspólnego komponentu zamiast własnych etykiet kosztu", () => {
    for (const file of ["src/app/plan/[tripId]/page.tsx", "src/app/share/[tripId]/ShareClient.tsx"]) {
      const src = readFileSync(file, "utf8");
      expect(src).toContain("CostBreakdown");
      expect(src).not.toMatch(/label="Loty"/);
      expect(src).not.toContain('label: "Loty"');
    }
  });
});
