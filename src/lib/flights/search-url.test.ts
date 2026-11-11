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
