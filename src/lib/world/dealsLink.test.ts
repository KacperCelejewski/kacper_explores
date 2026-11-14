import { describe, expect, it } from "vitest";
import { dealsLinkFor } from "./dealsLink";

const UTM = "utm_source=swiat&utm_medium=web&utm_campaign=world";

describe("dealsLinkFor", () => {
  it("points at the deals page of a Polish airport, whatever the case", () => {
    expect(dealsLinkFor("KRK")).toBe(`/okazje/krk?${UTM}`);
    expect(dealsLinkFor("krk")).toBe(`/okazje/krk?${UTM}`);
  });

  it("falls back to Wrocław for a missing or unusable airport", () => {
    for (const origin of [null, undefined, "", "BER", "xyz", "wro; drop table"]) {
      expect(dealsLinkFor(origin)).toBe(`/okazje/wro?${UTM}`);
    }
  });
});
