import { describe, expect, it } from "vitest";
import { buildSkyscannerUrl } from "./search-url";

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
