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

import { homeFriendsAnswers, srcEventName } from "./homeParams";

describe("srcEventName", () => {
  it("zamienia myślnik na podkreślnik, bo GA4 odrzuca myślniki w nazwach zdarzeń", () => {
    expect(srcEventName("home-ekipa")).toBe("from_home_ekipa");
    expect(srcEventName("home-solo")).toBe("from_home_solo");
  });
});

describe("homeFriendsAnswers", () => {
  const def = { adults: 4, childrenAges: [] as number[] };

  it("ustawia domyślną grupę, gdy quiz nie miał jeszcze Znajomych", () => {
    expect(homeFriendsAnswers({ companion: null, group: undefined })).toEqual({ companion: "friends", group: def });
    expect(homeFriendsAnswers({ companion: "couple", group: undefined })).toEqual({ companion: "friends", group: def });
  });

  it("zachowuje liczbę osób, którą ktoś już ustawił jako Znajomi", () => {
    const g = { adults: 6, childrenAges: [] as number[] };
    expect(homeFriendsAnswers({ companion: "friends", group: g })).toEqual({ companion: "friends", group: g });
  });

  it("dla Znajomych bez zapisanej grupy daje domyślną", () => {
    expect(homeFriendsAnswers({ companion: "friends", group: undefined })).toEqual({ companion: "friends", group: def });
  });
});
