import { describe, expect, it } from "vitest";
import { pickDefaultMaxPrice, resolveOrigin } from "./defaults";

describe("pickDefaultMaxPrice", () => {
  it("bez danych daje najwyższy próg, żeby zapis coś zwracał", () => {
    expect(pickDefaultMaxPrice(null)).toBe(500);
  });
  it("najtańszy lot ponad 300 zł daje 500", () => {
    expect(pickDefaultMaxPrice(348)).toBe(500);
  });
  it("tani lot mieści się w najniższym progu", () => {
    expect(pickDefaultMaxPrice(180)).toBe(200);
    expect(pickDefaultMaxPrice(250)).toBe(300);
  });
  it("powyżej 500 zostaje 500", () => {
    expect(pickDefaultMaxPrice(500)).toBe(500);
    expect(pickDefaultMaxPrice(501)).toBe(500);
  });
});

describe("resolveOrigin", () => {
  it("zna polskie lotniska, także małymi literami", () => {
    expect(resolveOrigin("KRK")).toBe("KRK");
    expect(resolveOrigin("wro")).toBe("WRO");
  });
  it("nieznany kod albo brak wraca do WRO", () => {
    expect(resolveOrigin("xyz")).toBe("WRO");
    expect(resolveOrigin(null)).toBe("WRO");
    expect(resolveOrigin(undefined)).toBe("WRO");
  });
});
