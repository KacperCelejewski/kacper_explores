import { describe, it, expect } from "vitest";
import { renderDropEmail, formatCheckedAt, ORIGIN_GENITIVE } from "./email";
import { FORBIDDEN_COPY } from "@/lib/homeCopy";
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
    expect(subject).toBe("Mediolan: lot za 201 zł na ten weekend");
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
    expect(html).toContain("lot w obie strony, cena sprawdzona śr 11.11, 22:00, może się zmienić");
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
    expect(html).not.toContain("To będzie w Pro");
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

describe("renderDropEmail: czas na miejscu i bagaż", () => {
  it("pokazuje godziny na miejscu, gdy znamy czas lotu", () => {
    const { html } = renderDropEmail({
      ...base, deals: [deal("MIL", "Mediolan", 201, { duration_to: 110 })], teasers: new Map(),
    });
    // wylot pt 19:05 CET + 110 min = 20:55 CET, powrót nd 21:40 CET: 48,75 h, czyli 49
    expect(html).toContain("ok. 49 h na miejscu");
  });

  it("nie zgaduje godzin bez czasu lotu", () => {
    const { html } = renderDropEmail({ ...base, deals: [deal("MIL", "Mediolan", 201)], teasers: new Map() });
    expect(html).not.toContain("h na miejscu");
  });

  it("ostrzega o bagażu u Ryanaira i nie robi tego u LOT-u", () => {
    const fr = renderDropEmail({ ...base, deals: [deal("MIL", "Mediolan", 201)], teasers: new Map() }).html;
    const lo = renderDropEmail({ ...base, deals: [deal("MIL", "Mediolan", 201, { airline: "LO" })], teasers: new Map() }).html;
    expect(fr).toContain("Bagaż:");
    expect(lo).not.toContain("Bagaż:");
  });
});

describe("renderDropEmail: wersja tekstowa, preheader, dostępność", () => {
  const d = deal("MIL", "Mediolan", 201, { duration_to: 110 });
  const out = () => renderDropEmail({ ...base, deals: [d], teasers: new Map([["MIL", teaser("MIL")]]) });

  it("ma wersję tekstową z cenami, datą sprawdzenia i linkami", () => {
    const { text } = out();
    expect(text).toContain("Mediolan: 201 zł");
    expect(text).toContain("cena sprawdzona śr 11.11, 22:00");
    expect(text).toContain("Sprawdź cenę: https://www.aviasales.com/search/KRK1311MIL15111?t=abc&marker=12345");
    expect(text).toContain("Wypisz się ze zrzutu: https://wloczykij.me/api/drop/unsubscribe?token=tok123");
    expect(text).not.toContain("<");
    expect(text).not.toContain("&amp;");
  });

  it("ma preheader w HTML-u i jako pole", () => {
    const { html, preheader } = out();
    expect(preheader).toContain("pt 13.11, 19:05");
    expect(html).toContain(preheader);
  });

  it("deklaruje język, tryb ciemny i tytuł", () => {
    const { html } = out();
    expect(html).toContain('lang="pl"');
    expect(html).toContain('name="color-scheme" content="light dark"');
    expect(html).toContain("prefers-color-scheme:dark");
    expect(html).toContain("<title>Mediolan: lot za 201 zł na ten weekend</title>");
  });

  it("ujawnia linki partnerskie tylko przy markerze", () => {
    expect(out().html).toContain("Linki „Sprawdź cenę” są partnerskie");
    const none = renderDropEmail({ ...base, marker: "", deals: [d], teasers: new Map() });
    expect(none.html).not.toContain("partnerskie");
    expect(none.text).not.toContain("partnerskie");
  });

  it("ma dane nadawcy w stopce i nie łamie zasad głosu marki", () => {
    const { html, text } = out();
    expect(html).toContain("hej@wloczykij.me");
    expect(text).toContain("hej@wloczykij.me");
    for (const re of FORBIDDEN_COPY) {
      expect(text, String(re)).not.toMatch(re);
    }
  });

  it("nie robi z linków obietnic funkcji, których nie ma", () => {
    const { html } = out();
    expect(html.toLowerCase()).not.toContain("zaproś");
    expect(html.toLowerCase()).not.toContain("głosowan");
  });
});

describe("formatCheckedAt", () => {
  it("podaje czas polski", () => {
    expect(formatCheckedAt("2026-11-11T21:00:00Z")).toBe("śr 11.11, 22:00");
    expect(formatCheckedAt("2026-07-01T20:00:00Z")).toBe("śr 01.07, 22:00");
  });
  it("bez daty albo z błędną zwraca null", () => {
    expect(formatCheckedAt(undefined)).toBeNull();
    expect(formatCheckedAt("nie-data")).toBeNull();
  });
});
