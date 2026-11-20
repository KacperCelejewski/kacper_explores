import { describe, expect, it } from "vitest";
import { parseHomeParams, keepUtmQuery, parseFoundationParams, foundationQuery } from "./homeParams";

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

describe("src z Instagrama i bloga", () => {
  it("przyjmuje ig-ekipa, ig-solo i blog-ekipa", () => {
    expect(p("companion=friends&src=ig-ekipa")).toEqual({ companion: "friends", src: "ig-ekipa" });
    expect(p("src=ig-solo").src).toBe("ig-solo");
    expect(p("companion=friends&src=blog-ekipa").src).toBe("blog-ekipa");
  });

  it("nazwy zdarzeń nie mają myślników", () => {
    expect(srcEventName("ig-ekipa")).toBe("from_ig_ekipa");
    expect(srcEventName("ig-solo")).toBe("from_ig_solo");
    expect(srcEventName("blog-ekipa")).toBe("from_blog_ekipa");
  });

  it("dalej odrzuca nieznane wartości", () => {
    for (const v of ["ig", "ig-ekipa2", "IG-EKIPA", "blog", "ig-ekipa&x=1"]) expect(p(`src=${encodeURIComponent(v)}`).src).toBeNull();
  });
});

describe("keepUtmQuery", () => {
  const k = (q: string) => keepUtmQuery(new URLSearchParams(q));

  it("zostawia utm_source/medium/campaign/content", () => {
    expect(k("companion=friends&src=ig-ekipa&utm_source=instagram&utm_medium=social&utm_campaign=bio&utm_content=ekipa"))
      .toBe("?utm_source=instagram&utm_medium=social&utm_campaign=bio&utm_content=ekipa");
  });

  it("pomija inne parametry i puste wartości", () => {
    expect(k("companion=friends&city=Rzym&utm_source=")).toBe("");
    expect(k("")).toBe("");
  });

  it("odrzuca wartości z dziwnymi znakami albo zbyt długie", () => {
    expect(k("utm_source=" + encodeURIComponent("<script>"))).toBe("");
    expect(k("utm_campaign=" + "a".repeat(101))).toBe("");
    expect(k("utm_medium=social&utm_campaign=" + encodeURIComponent("x y"))).toBe("?utm_medium=social");
  });
});

describe("parseFoundationParams / foundationQuery", () => {
  const f = (q: string) => parseFoundationParams(new URLSearchParams(q));

  it("czyta region, rodzaj wyjazdu i transport", () => {
    expect(f("region=europa,azja&trip=narty&transport=auto,pociag_bus")).toEqual({
      regions: ["europa", "azja"], tripType: "narty", transport: ["auto", "pociag_bus"],
    });
  });

  it("brak parametrów daje pusty wynik, stare adresy działają jak dotąd", () => {
    expect(f("")).toEqual({});
    expect(f("companion=friends&src=home-ekipa&utm_source=ig")).toEqual({});
  });

  it("ignoruje nieznane, podrabiane i zbyt długie wartości", () => {
    expect(f("region=atlantyda,europa&trip=kosmos&transport=rakieta")).toEqual({ regions: ["europa"] });
    expect(f("trip=NARTY")).toEqual({});
    expect(f(`region=${encodeURIComponent("<script>alert(1)</script>")}`)).toEqual({});
    expect(f(`region=${"europa,".repeat(100)}`)).toEqual({});
    expect(f("region=europa,europa,europa")).toEqual({ regions: ["europa"] });
    expect(f("trip=constructor&region=__proto__")).toEqual({});
  });

  it("serializacja i parsowanie są wzajemnie odwrotne", () => {
    const answers = { regions: ["afryka" as const, "oceania" as const], tripType: "plaza" as const, transport: ["samolot" as const, "rower" as const] };
    const q = foundationQuery(answers);
    expect(q).toBe("region=afryka%2Coceania&trip=plaza&transport=samolot%2Crower");
    expect(f(q)).toEqual(answers);
  });

  it("pusta odpowiedź nie dopisuje nic do adresu", () => {
    expect(foundationQuery({})).toBe("");
    expect(foundationQuery({ regions: [], transport: [] })).toBe("");
  });

  it("nie zmienia parseHomeParams ani keepUtmQuery", () => {
    expect(parseHomeParams(new URLSearchParams("region=europa&trip=narty&companion=friends"))).toEqual({ companion: "friends", src: null });
    expect(keepUtmQuery(new URLSearchParams("region=europa&utm_source=ig"))).toBe("?utm_source=ig");
  });
});
