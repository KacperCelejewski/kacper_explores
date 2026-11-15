import { describe, expect, it } from "vitest";
import { parseHomeParams } from "./homeParams";

const p = (q: string) => parseHomeParams(new URLSearchParams(q));

describe("parseHomeParams", () => {
  it("przyjmuje companion=friends i znane src", () => {
    expect(p("companion=friends&src=home-ekipa")).toEqual({ companion: "friends", src: "home-ekipa" });
    expect(p("src=home-solo")).toEqual({ companion: null, src: "home-solo" });
  });

  it("ignoruje inne wartości companion", () => {
    for (const v of ["family", "solo", "couple", "FRIENDS", "", "<script>alert(1)</script>", "x".repeat(500)]) {
      expect(p(`companion=${encodeURIComponent(v)}`).companion).toBeNull();
    }
  });

  it("ignoruje nieznane lub podrabiane src", () => {
    for (const v of ["x", "home-ekipa<img>", "HOME-EKIPA", "", "home-ekipa home-solo"]) {
      expect(p(`src=${encodeURIComponent(v)}`).src).toBeNull();
    }
  });

  it("brak parametrów daje null i null", () => {
    expect(p("")).toEqual({ companion: null, src: null });
  });

  it("działa też na obiekcie z samym get", () => {
    expect(parseHomeParams({ get: (n) => (n === "companion" ? "friends" : null) })).toEqual({ companion: "friends", src: null });
  });
});
