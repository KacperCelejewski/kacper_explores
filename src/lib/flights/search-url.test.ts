import { describe, expect, it } from "vitest";
import { buildAviasalesUrl, buildSkyscannerUrl } from "./search-url";

describe("buildSkyscannerUrl", () => {
  it("maps airports to Skyscanner ids and formats dates as YYMMDD", () => {
    expect(buildSkyscannerUrl("WRO", "WAW", "2026-06-12", "2026-06-15")).toBe(
      "https://www.skyscanner.pl/transport/loty/wro/wars/260612/260615/?adultsv2=1&cabin_class=economy",
    );
  });

  it("falls back to the IATA code for airports without a mapping", () => {
    expect(buildSkyscannerUrl("WRO", "XYZ")).toContain("/wro/xyz/");
  });

  it("omits the date segment unless both dates are given", () => {
    expect(buildSkyscannerUrl("WRO", "KRK", "2026-06-12", null)).toBe(
      "https://www.skyscanner.pl/transport/loty/wro/krk/?adultsv2=1&cabin_class=economy",
    );
  });
});

describe("buildAviasalesUrl", () => {
  it("builds ORIGIN+DDMM+DEST+DDMM+1 with the marker", () => {
    expect(
      buildAviasalesUrl("wro", "bcn", "2026-12-05T06:30:00+01:00", "2026-12-08T21:10:00+01:00", "abc123"),
    ).toBe("https://www.aviasales.com/search/WRO0512BCN08121?marker=abc123");
  });

  it("takes day and month from the date text, not from UTC", () => {
    expect(
      buildAviasalesUrl("WRO", "BCN", "2026-12-05T00:30:00+01:00", "2026-12-08T23:50:00+01:00", "m"),
    ).toContain("/search/WRO0512BCN08121");
  });

  it("omits the query without a marker", () => {
    expect(buildAviasalesUrl("WRO", "BCN", "2026-12-05", "2026-12-08", "")).toBe(
      "https://www.aviasales.com/search/WRO0512BCN08121",
    );
  });

  it("encodes the marker", () => {
    expect(buildAviasalesUrl("WRO", "BCN", "2026-12-05", "2026-12-08", "a b&c")).toContain("?marker=a%20b%26c");
  });
});

describe("linki dla grupy", () => {
  const solo = { adults: 1, children: 0, infants: 0 };

  it("solo daje te same adresy co bez pasażerów", () => {
    expect(buildSkyscannerUrl("WRO", "WAW", "2026-06-12", "2026-06-15", solo)).toBe(
      buildSkyscannerUrl("WRO", "WAW", "2026-06-12", "2026-06-15"),
    );
    expect(buildAviasalesUrl("WRO", "BCN", "2026-12-05", "2026-12-08", "m", solo)).toBe(
      buildAviasalesUrl("WRO", "BCN", "2026-12-05", "2026-12-08", "m"),
    );
  });

  it("Skyscanner przekazuje tylko dorosłych (format wieku dzieci nie jest potwierdzony)", () => {
    const url = buildSkyscannerUrl("WRO", "WAW", "2026-06-12", "2026-06-15", { adults: 2, children: 1, infants: 1 });
    expect(url).toContain("adultsv2=2&");
    expect(url).not.toContain("childrenv2");
    expect(url).not.toContain("infants");
  });

  it("Aviasales dopisuje do ścieżki dorosłych, dzieci i niemowlęta", () => {
    const path = (p: { adults: number; children: number; infants: number }) =>
      buildAviasalesUrl("WRO", "BCN", "2026-12-05", "2026-12-08", "", p);
    expect(path({ adults: 2, children: 0, infants: 0 })).toBe("https://www.aviasales.com/search/WRO0512BCN08122");
    expect(path({ adults: 2, children: 1, infants: 0 })).toBe("https://www.aviasales.com/search/WRO0512BCN081221");
    expect(path({ adults: 2, children: 0, infants: 1 })).toBe("https://www.aviasales.com/search/WRO0512BCN0812201");
    expect(path({ adults: 2, children: 2, infants: 1 })).toBe("https://www.aviasales.com/search/WRO0512BCN0812221");
  });
});
