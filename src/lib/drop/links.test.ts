import { describe, it, expect } from "vitest";
import {
  buildAffiliateUrl, buildFlightLink, buildPlanUrl, buildUnsubscribeUrl, buildSettingsUrl,
} from "./links";
import type { DropDeal } from "./types";

const deal: DropDeal = {
  week: "2026-W46", origin: "WRO", city_code: "BCN", city_name: "Barcelona",
  price: 201, departure_at: "2026-11-13T19:05:00+01:00",
  return_at: "2026-11-15T20:00:00+01:00", airline: "FR", transfers: 0,
  link: "/search/WRO1311BCN15111?t=abc", fetched_at: "2026-11-11T21:00:00Z",
};

describe("buildAffiliateUrl", () => {
  it("dokleja marker i UTM do linku z zapytaniem", () => {
    const u = buildAffiliateUrl(deal, "12345", "2026-W46");
    expect(u.startsWith("https://www.aviasales.com/search/WRO1311BCN15111?t=abc&marker=12345")).toBe(true);
    expect(u).toContain("utm_source=drop");
    expect(u).toContain("utm_campaign=2026-W46");
    expect(u).toContain("utm_content=BCN");
  });

  it("łączy parametry przez ? gdy link go nie ma", () => {
    const u = buildAffiliateUrl({ ...deal, link: "/search/X" }, "12345", "2026-W46");
    expect(u.startsWith("https://www.aviasales.com/search/X?marker=12345")).toBe(true);
  });
});

describe("buildPlanUrl", () => {
  it("zwraca absolutny link do quizu z polską nazwą miasta", () => {
    const u = buildPlanUrl(deal, "https://wloczykij.me", "2026-W46");
    expect(
      u.startsWith(
        "https://wloczykij.me/quiz?city=Barcelona&from=WRO&depart=2026-11-13&return=2026-11-15&src=drop&utm_",
      ),
    ).toBe(true);
    expect(u).toContain("utm_source=drop");
    expect(u).toContain("utm_medium=email");
    expect(u).toContain("utm_campaign=2026-W46");
    expect(u).toContain("utm_content=BCN");
  });

  it("koduje nazwę miasta", () => {
    expect(buildPlanUrl({ ...deal, city_name: "Mediolan" }, "https://x.pl", "2026-W46")).toContain("city=Mediolan&");
    expect(buildPlanUrl({ ...deal, city_name: "Saloniki" }, "https://x.pl", "2026-W46")).toContain("city=Saloniki&");
    expect(buildPlanUrl({ ...deal, city_name: "Zielona Góra" }, "https://x.pl", "2026-W46")).toContain(
      "city=Zielona%20G%C3%B3ra&",
    );
  });
});

describe("unsubscribe / settings", () => {
  it("buduje linki z tokenem", () => {
    expect(buildUnsubscribeUrl("https://x.pl", "a b")).toBe("https://x.pl/api/drop/unsubscribe?token=a%20b");
    expect(buildSettingsUrl("https://x.pl", "tok")).toBe("https://x.pl/zrzut/ustawienia?token=tok");
  });
});

describe("kanał linku (email albo strona)", () => {
  it("domyślnie oznacza ruch jako email", () => {
    expect(buildAffiliateUrl(deal, "12345", "2026-W46")).toContain("utm_medium=email");
    expect(buildPlanUrl(deal, "https://wloczykij.me", "2026-W46")).toContain("utm_medium=email");
  });

  it("pozwala oznaczyć ruch ze strony, bez ruszania markera", () => {
    const u = buildAffiliateUrl(deal, "12345", "2026-W46", "web");
    expect(u).toContain("utm_medium=web");
    expect(u).toContain("marker=12345&");
    expect(u).not.toContain("marker=12345.");
    expect(buildPlanUrl(deal, "https://wloczykij.me", "2026-W46", "web")).toContain("utm_medium=web");
  });
});

describe("buildFlightLink", () => {
  it("z markerem daje link partnerski i oznacza go jako płatny", () => {
    const l = buildFlightLink(deal, "12345", "2026-W46", "web");
    expect(l.paid).toBe(true);
    expect(l.partner).toBe("aviasales");
    expect(l.href).toContain("marker=12345");
    expect(l.href).toContain("utm_medium=web");
  });

  it("bez markera daje zwykły link do wyszukiwarki, bez prowizji i bez pustego markera", () => {
    const l = buildFlightLink(deal, undefined, "2026-W46", "web");
    expect(l.paid).toBe(false);
    expect(l.href).toBe("https://www.aviasales.com/search/WRO1311BCN15111?t=abc");
    expect(l.href).not.toContain("marker");
  });

  it("zostawia pełny adres bez zmian", () => {
    const l = buildFlightLink({ ...deal, link: "https://www.aviasales.com/search/X?t=1" }, "", "2026-W46", "web");
    expect(l.href).toBe("https://www.aviasales.com/search/X?t=1");
  });
});
