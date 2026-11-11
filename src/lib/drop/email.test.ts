import { describe, it, expect } from "vitest";
import { renderDropEmail, ORIGIN_GENITIVE } from "./email";
import { POLISH_AIRPORTS } from "@/lib/airports";
import type { CityTeaser, DropDeal } from "./types";

function deal(code: string, name: string, price: number, over: Partial<DropDeal> = {}): DropDeal {
  return {
    week: "2026-W46", origin: "KRK", city_code: code, city_name: name, price,
    departure_at: "2026-11-13T19:05:00+01:00", return_at: "2026-11-15T21:40:00+01:00",
    airline: "FR", transfers: 0, link: `/search/KRK1311${code}15111?t=abc`,
    fetched_at: "2026-11-11T21:00:00Z", ...over,
  };
}

const base = {
  originCity: "Krakowa", week: "2026-W46", appUrl: "https://wloczykij.me",
  marker: "12345", unsubscribeToken: "tok123",
};

const teaser = (code: string): CityTeaser => ({
  week: "2026-W46", city_code: code, teaser: "Rynek, kawa i zachód słońca.", local_budget: "Kolacja ok. 90 zł",
});

describe("ORIGIN_GENITIVE", () => {
  it("pokrywa wszystkie polskie lotniska", () => {
    for (const a of POLISH_AIRPORTS) expect(ORIGIN_GENITIVE[a.code]).toBeTruthy();
    expect(ORIGIN_GENITIVE.WRO).toBe("Wrocławia");
    expect(ORIGIN_GENITIVE.KTW).toBe("Katowic");
  });
});

describe("renderDropEmail", () => {
  it("temat dla jednej okazji", () => {
    const { subject } = renderDropEmail({
      ...base, deals: [deal("MIL", "Mediolan", 201)], teasers: new Map(),
    });
    expect(subject).toBe("Mediolan za 201 zł w ten weekend");
  });

  it("temat dla wielu okazji", () => {
    const { subject } = renderDropEmail({
      ...base,
      deals: [deal("MIL", "Mediolan", 201), deal("BCN", "Barcelona", 220), deal("ROM", "Rzym", 250)],
      teasers: new Map(),
    });
    expect(subject).toBe("3 wyjazdy z Krakowa na ten weekend");
    expect(subject).not.toContain("!");
  });

  it("kilka lotnisk: temat i nagłówek bez miasta, karty z lotniskiem", () => {
    const { subject, html } = renderDropEmail({
      ...base,
      deals: [deal("MIL", "Mediolan", 201), deal("BCN", "Barcelona", 220, { origin: "WRO" })],
      teasers: new Map(),
    });
    expect(subject).toBe("2 wyjazdy na ten weekend");
    expect(html).not.toContain("Weekend z Krakowa");
    expect(html).toContain("z Krakowa");
    expect(html).toContain("z Wrocławia");
  });

  it("jedno lotnisko: nagłówek z miastem, karta z lotniskiem", () => {
    const { html } = renderDropEmail({ ...base, deals: [deal("MIL", "Mediolan", 201)], teasers: new Map() });
    expect(html).toContain("Weekend z Krakowa");
    expect(html).toContain("z Krakowa · Ryanair");
  });

  it("html zawiera dane okazji, linki i stopkę", () => {
    const d = deal("MIL", "Mediolan", 201);
    const { html } = renderDropEmail({
      ...base, deals: [d], teasers: new Map([["MIL", teaser("MIL")]]),
    });
    expect(html).toContain("Mediolan");
    expect(html).toContain("201 zł");
    expect(html).toContain("cena ze środy 22:00, może się zmienić");
    expect(html).toContain("pt 13.11, 19:05");
    expect(html).toContain("nd 15.11, 21:40");
    expect(html).toContain("Ryanair");
    expect(html).toContain("bez przesiadek");
    expect(html).toContain("Rynek, kawa i zachód słońca.");
    expect(html).toContain("Kolacja ok. 90 zł");
    expect(html).toContain("https://www.aviasales.com/search/KRK1311MIL15111?t=abc&amp;marker=12345");
    expect(html).toContain("https://wloczykij.me/quiz?city=Mediolan&amp;from=KRK");
    expect(html).toContain("https://wloczykij.me/api/drop/unsubscribe?token=tok123");
    expect(html).toContain("https://wloczykij.me/zrzut/ustawienia?token=tok123");
    expect(html).toContain("To będzie w Pro.");
  });

  it("bez zajawki nie ma undefined", () => {
    const { html } = renderDropEmail({ ...base, deals: [deal("MIL", "Mediolan", 201)], teasers: new Map() });
    expect(html).not.toContain("undefined");
  });

  it("nieznany przewoźnik to surowy kod, przesiadka jest opisana", () => {
    const { html } = renderDropEmail({
      ...base, deals: [deal("MIL", "Mediolan", 201, { airline: "ZZ", transfers: 1 })], teasers: new Map(),
    });
    expect(html).toContain("ZZ");
    expect(html).toContain("1 przesiadka");
  });

  it("escapuje wartości z danych", () => {
    const { html } = renderDropEmail({
      ...base,
      deals: [deal("MIL", "<b>x</b>", 201)],
      teasers: new Map([["MIL", { ...teaser("MIL"), teaser: `a "b" <i>c</i> & 'd'` }]]),
    });
    expect(html).not.toContain("<b>x</b>");
    expect(html).toContain("&lt;b&gt;x&lt;/b&gt;");
    expect(html).not.toContain("<i>c</i>");
    expect(html).toContain("&quot;b&quot; &lt;i&gt;c&lt;/i&gt; &amp; &#39;d&#39;");
  });
});
