import { describe, expect, it } from "vitest";
import { cityAfterLogin, quizLoginNext } from "./quizLogin";

describe("quizLoginNext", () => {
  it("returns to the quiz after login without a city", () => {
    expect(quizLoginNext()).toBe("/quiz?afterLogin=1");
  });

  it("carries the chosen city through the login round trip", () => {
    expect(quizLoginNext("Porto")).toBe("/quiz?afterLogin=1&city=Porto");
  });

  it("encodes the city, diacritics and spaces included", () => {
    expect(quizLoginNext("San Sebastián")).toBe("/quiz?afterLogin=1&city=San%20Sebasti%C3%A1n");
  });

  it("survives the double encoding done by the login page", () => {
    const next = quizLoginNext("Kraków & okolice");
    const params = new URLSearchParams(`next=${encodeURIComponent(next)}`);
    const back = new URL(params.get("next") as string, "https://wloczykij.me");
    expect(back.searchParams.get("afterLogin")).toBe("1");
    expect(back.searchParams.get("city")).toBe("Kraków & okolice");
  });
});

describe("quizLoginNext z wejściem", () => {
  it("niesie kanał i materiał przez logowanie, a direct pomija", () => {
    const next = quizLoginNext("Porto", { channel: "blog", material: "blog:lot-w-grupie" });
    expect(next).toBe("/quiz?afterLogin=1&city=Porto&entry_channel=blog&entry_material=blog%3Alot-w-grupie");
    expect(quizLoginNext("Porto", { channel: "direct", material: "direct" })).toBe("/quiz?afterLogin=1&city=Porto");
  });
});

describe("cityAfterLogin", () => {
  it("prefers the city from the URL", () => {
    expect(cityAfterLogin("Porto", "Rzym")).toBe("Porto");
  });
  it("falls back to the city kept in the store", () => {
    expect(cityAfterLogin(null, "Rzym")).toBe("Rzym");
  });
  it("is undefined when neither is known or the value is blank", () => {
    expect(cityAfterLogin(null, undefined)).toBeUndefined();
    expect(cityAfterLogin("  ", undefined)).toBeUndefined();
  });
});
