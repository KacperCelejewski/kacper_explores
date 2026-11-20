import { describe, expect, it } from "vitest";
import { filterByRegions, matchesRegions, regionPromptLine, regionRetryLine, regionsOfCountry } from "./regionFilter";
import { highBudgetAvailable, HIGH_BUDGET_REGIONS, REGION_VALUES } from "./quizOptions";
import { FORBIDDEN_COPY } from "./homeCopy";

describe("regionsOfCountry", () => {
  it("rozdziela Ameryki na Południową i Północną", () => {
    for (const c of ["Brazylia", "Argentyna", "Peru", "Chile", "Kolumbia", "Boliwia", "Ekwador", "Urugwaj", "Colombia"]) {
      expect(regionsOfCountry(c)).toEqual(["ameryka_poludniowa"]);
    }
    for (const c of ["USA", "Kanada", "Meksyk", "Kuba", "Kostaryka", "Panama", "Dominikana", "Jamajka", "Bahamy"]) {
      expect(regionsOfCountry(c)).toEqual(["ameryka_polnocna"]);
    }
  });

  it("mapuje pozostałe kontynenty, a wielkość liter i dopisek w nawiasie nie przeszkadzają", () => {
    expect(regionsOfCountry("Japonia")).toEqual(["azja"]);
    expect(regionsOfCountry("maroko")).toEqual(["afryka"]);
    expect(regionsOfCountry("Australia")).toEqual(["oceania"]);
    expect(regionsOfCountry("Izrael")).toEqual(["bliski_wschod"]);
    expect(regionsOfCountry("Portugalia (Madera)")).toEqual(["europa"]);
  });

  it("Turcja liczy się do Europy i Bliskiego Wschodu; nieznany kraj nie ma regionu", () => {
    expect(regionsOfCountry("Turcja").sort()).toEqual(["bliski_wschod", "europa"]);
    expect(regionsOfCountry("Atlantyda")).toEqual([]);
    expect(regionsOfCountry("")).toEqual([]);
  });

  it("każdy region z quizu ma co najmniej jeden kraj w tabeli", () => {
    const sample: Record<string, string> = {
      europa: "Portugalia", ameryka_poludniowa: "Brazylia", ameryka_polnocna: "Meksyk",
      azja: "Tajlandia", afryka: "Kenia", bliski_wschod: "Jordania", oceania: "Nowa Zelandia",
    };
    for (const r of REGION_VALUES) expect(regionsOfCountry(sample[r])).toContain(r);
  });
});

describe("matchesRegions / filterByRegions", () => {
  const items = [
    { city: "Buenos Aires", country: "Argentyna" },
    { city: "Lima", country: "Peru" },
    { city: "Porto", country: "Portugalia" },
    { city: "Nowy Jork", country: "USA" },
    { city: "Narnia", country: "Narnia" },
  ];

  it("brak regionów znaczy obojętnie: nic nie jest odrzucane, także kraj spoza tabeli", () => {
    expect(matchesRegions("Narnia", [])).toBe(true);
    expect(filterByRegions(items, [])).toEqual({ kept: items, rejected: [] });
  });

  it("Ameryka Południowa zostawia wyłącznie kierunki z tego regionu", () => {
    const { kept, rejected } = filterByRegions(items, ["ameryka_poludniowa"]);
    expect(kept.map((d) => d.city)).toEqual(["Buenos Aires", "Lima"]);
    expect(rejected.map((d) => d.city)).toEqual(["Porto", "Nowy Jork", "Narnia"]);
  });

  it("kilka regionów to suma, a kraju spoza tabeli nie da się potwierdzić, więc odpada", () => {
    const { kept } = filterByRegions(items, ["ameryka_poludniowa", "europa"]);
    expect(kept.map((d) => d.city)).toEqual(["Buenos Aires", "Lima", "Porto"]);
  });

  it("miasto wybrane w galerii nie jest odrzucane przez region", () => {
    const { kept } = filterByRegions(items, ["ameryka_poludniowa"], "porto");
    expect(kept.map((d) => d.city)).toEqual(["Buenos Aires", "Lima", "Porto"]);
  });
});

describe("prompt regionu", () => {
  it("brak regionu nie dopisuje nic, więc prompt starego quizu się nie zmienia", () => {
    expect(regionPromptLine([])).toBe("");
  });

  it("region jest twardym ograniczeniem z nazwą regionu, bez wykrzykników ani emoji", () => {
    const line = regionPromptLine(["ameryka_poludniowa", "azja"]);
    expect(line).toContain("TWARDE OGRANICZENIE");
    expect(line).toContain("Ameryka Południowa");
    expect(line).toContain("Azja");
    expect(line).not.toContain("Europa");
    expect(regionRetryLine(["azja"], ["Paryż"], ["Tokio"])).toContain("Paryż");
    expect(regionRetryLine(["azja"], ["Paryż"], ["Tokio"])).toContain("Tokio");
  });
});

describe("wyższy przedział budżetu", () => {
  it("pojawia się tylko po wyborze dalekiego regionu", () => {
    expect(highBudgetAvailable(undefined)).toBe(false);
    expect(highBudgetAvailable([])).toBe(false);
    expect(highBudgetAvailable(["europa"])).toBe(false);
    expect(highBudgetAvailable(["bliski_wschod"])).toBe(false);
    expect(highBudgetAvailable(["europa", "ameryka_poludniowa"])).toBe(true);
    for (const r of HIGH_BUDGET_REGIONS) expect(highBudgetAvailable([r])).toBe(true);
  });

  it("teksty regionu trzymają głos marki", () => {
    for (const s of [regionPromptLine(["oceania"])]) for (const re of FORBIDDEN_COPY.filter((r) => String(r) !== String(/!/))) expect(s).not.toMatch(re);
  });
});
