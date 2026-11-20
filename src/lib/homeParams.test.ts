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

import {
  HOME_DREAM_CITIES, dreamBudgetLevel, homeDreamAnswers, homeDreamHref, parseHomeDream,
} from "./homeParams";
import { entryFromUrl } from "./entryAttribution";
import { getDreamPreview } from "@/app/components/HomeDreams";
import { firstIncompleteQuizStep, QUIZ_STEPS } from "./quizSteps";
import { isValidGroup } from "./group";
import type { QuizAnswers } from "@/types";

const hrefParams = (href: string) => new URLSearchParams(href.split("?")[1]);

describe("dreamBudgetLevel", () => {
  it("zgadza się z progami quizu: do 1 500 zł niski, wyżej średni", () => {
    expect(dreamBudgetLevel(400)).toBe("low");
    expect(dreamBudgetLevel(1100)).toBe("low");
    expect(dreamBudgetLevel(1500)).toBe("low");
    expect(dreamBudgetLevel(1550)).toBe("medium");
    expect(dreamBudgetLevel(2000)).toBe("medium");
  });
});

describe("homeDreamHref", () => {
  it("buduje adres do quizu z miastem, liczbą osób, budżetem i src", () => {
    expect(homeDreamHref({ city: "Lizbona", people: 4, budgetPerPerson: 1100 }))
      .toBe("/quiz?src=home-dream&city=Lizbona&people=4&budget=low");
    expect(homeDreamHref({ city: "Porto", people: 6, budgetPerPerson: 1800 }))
      .toBe("/quiz?src=home-dream&city=Porto&people=6&budget=medium");
  });

  it("dokleja utm z bieżącej strony (zachowanie atrybucji)", () => {
    const href = homeDreamHref({ city: "Porto", people: 2, budgetPerPerson: 1400, utmQuery: "?utm_source=instagram&utm_campaign=bio" });
    expect(href).toBe("/quiz?src=home-dream&city=Porto&people=2&budget=low&utm_source=instagram&utm_campaign=bio");
    expect(entryFromUrl(hrefParams(href))).toEqual({ channel: "ig", material: "ig:bio" });
  });

  it("bez utm atrybucja wejścia to home:home-dream", () => {
    const href = homeDreamHref({ city: "Lizbona", people: 3, budgetPerPerson: 900 });
    expect(entryFromUrl(hrefParams(href))).toEqual({ channel: "home", material: "home:home-dream" });
  });

  it("znaki specjalne w mieście są kodowane", () => {
    expect(homeDreamHref({ city: "A&b c", people: 2, budgetPerPerson: 500 })).toContain("city=A%26b%20c");
  });
});

describe("parseHomeDream", () => {
  const d = (q: string) => parseHomeDream(new URLSearchParams(q));

  it("odczytuje poprawny adres z karty", () => {
    expect(d("src=home-dream&city=Lizbona&people=4&budget=low")).toEqual({ city: "Lizbona", people: 4, budget: "low" });
    expect(d("src=home-dream&city=Porto&people=9&budget=medium")).toEqual({ city: "Porto", people: 9, budget: "medium" });
  });

  it("wymaga src=home-dream i miasta z listy", () => {
    expect(d("city=Lizbona&people=4&budget=low")).toBeNull();
    expect(d("src=home-ekipa&city=Lizbona&people=4&budget=low")).toBeNull();
    expect(d("src=home-dream&city=Paryz&people=4&budget=low")).toBeNull();
    expect(d("src=home-dream&city=" + encodeURIComponent("<script>") + "&people=4&budget=low")).toBeNull();
    expect(d("src=home-dream&people=4&budget=low")).toBeNull();
  });

  it("odrzuca niepoprawną liczbę osób i budżet", () => {
    for (const people of ["", "1", "10", "4.5", "abc", "-2", "0x4"]) {
      expect(d(`src=home-dream&city=Lizbona&people=${people}&budget=low`)).toBeNull();
    }
    for (const budget of ["", "high", "LOW", "1100"]) {
      expect(d(`src=home-dream&city=Lizbona&people=4&budget=${budget}`)).toBeNull();
    }
  });
});

describe("homeDreamAnswers", () => {
  const empty: QuizAnswers = { budget: null, vibe: null, styles: [], placeType: null, month: null, duration: null, airports: [], companion: null };

  it("ustawia ekipę, budżet i miasto, a quiz wznawia od pierwszego brakującego pytania", () => {
    const answers = homeDreamAnswers({ city: "Lizbona", people: 5, budget: "medium" });
    expect(answers).toEqual({ preferredCity: "Lizbona", companion: "friends", group: { adults: 5, childrenAges: [] }, budget: "medium" });
    expect(isValidGroup(answers.group)).toBe(true);
    expect(firstIncompleteQuizStep({ ...empty, ...answers }, QUIZ_STEPS)).toBe("vibe");
  });
});

describe("karty HomeDreams prowadzą do quizu", () => {
  const cards = getDreamPreview(2000, 2).cards;

  it("każde miasto z karty jest na liście dozwolonych i daje poprawny adres dla wszystkich ustawień", () => {
    expect(cards.map((c) => c.city).sort()).toEqual([...HOME_DREAM_CITIES].sort());
    for (const { city } of cards) {
      for (const people of [2, 3, 4, 5, 6, 7, 8, 9]) {
        for (const budgetPerPerson of [400, 1100, 1500, 1550, 2000]) {
          const href = homeDreamHref({ city, people, budgetPerPerson });
          expect(href.startsWith("/quiz?")).toBe(true);
          const parsed = parseHomeDream(hrefParams(href));
          expect(parsed).toEqual({ city, people, budget: dreamBudgetLevel(budgetPerPerson) });
        }
      }
    }
  });
});
