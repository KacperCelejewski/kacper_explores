// Atrybucja linków partnerskich (R6, 2026-11-19): jeden test, który przechodzi po WSZYSTKICH miejscach
// generowania linków (lot, hotele, bilety, bagaż, strona okazji, e-mail zrzutu) i sprawdza marker, trs,
// kodowanie u=, rel oraz oznaczenie dla użytkownika. Lista miejsc i luk: docs/affiliate-attribution-check.md.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const consent = vi.hoisted(() => ({ value: null as "accepted" | "rejected" | null }));
vi.mock("@/lib/cookieConsent", () => ({
  loadConsent: () => consent.value,
  serverConsent: () => consent.value,
  subscribeConsent: () => () => {},
  resetConsent: () => {},
  saveConsent: () => {},
}));

import {
  AFFILIATE_PROGRAMS, affiliateClickParams, affiliateServerEvent, bookingLink, flightLink, flightSearchLink,
  hostelworldLink, luggageLink, partnerLinkProps, readAffiliateConfig, ticketsLink, travelpayoutsLink,
  withAffiliateConsent, type PartnerConfig, type PartnerLink,
} from "./affiliate";
import { buildAffiliateUrl, buildFlightLink } from "./drop/links";
import { renderDropEmail } from "./drop/email";
import { AffiliateAnchor, AffiliateProvider } from "@/app/components/AffiliateProvider";
import { FlightCard, HotelLinks, LuggageTile, TicketsLink } from "@/app/components/PartnerLinks";
import type { DayActivity, FlightOffer } from "@/types";
import type { DropDeal } from "./drop/types";

const MARKER = "728414";
const TARGET_PROJECT = "601310"; // docelowy projekt wloczykij.me; na produkcji ustawia go właściciel (env)
const config: PartnerConfig = { marker: MARKER, projectId: TARGET_PROJECT };
const PROGRAM_KEYS = Object.keys(AFFILIATE_PROGRAMS) as (keyof typeof AFFILIATE_PROGRAMS)[];

const offer = {
  id: "o1",
  origin: { code: "WRO", city: "Wrocław" },
  destination: { code: "BCN", city: "Barcelona" },
  price: 201, realCost: 201, durationMinutes: 130, airline: "FR",
  departureTime: "06:30", arrivalTime: "08:45",
  departureDate: "2026-12-05", returnDate: "2026-12-08",
  isBerlinAlternative: false, savingsVsWro: null,
} as unknown as FlightOffer;

const activity: DayActivity = { time: "10:00", title: "Sagrada & Família", description: "Zwiedzanie", type: "attraction", cost: "~26 EUR", emoji: "" };

const deal: DropDeal = {
  week: "2026-W49", origin: "WRO", city_code: "BCN", city_name: "Barcelona", price: 201,
  departure_at: "2026-12-04T19:05:00+01:00", return_at: "2026-12-06T20:00:00+01:00",
  airline: "FR", transfers: 0, link: "/search/WRO0412BCN06121?t=abc", fetched_at: "2026-12-01T21:00:00Z",
};

// Wspólny kontrakt płatnego linku: dokładnie te 5 parametrów, właściwy program, u= to dozwolony cel https bez własnej atrybucji.
function expectPaid(link: PartnerLink, program: keyof typeof AFFILIATE_PROGRAMS, cfg: PartnerConfig = config) {
  expect(link.paid).toBe(true);
  expect(link.partner === "radical" ? "radical" : link.partner).toBe(program);
  const url = new URL(link.href);
  expect(url.origin + url.pathname).toBe("https://tp.media/r");
  const keys = [...url.searchParams.keys()].sort();
  expect(keys).toEqual(["campaign_id", "marker", "p", "trs", "u"]); // brak duplikatów i wstrzykniętych parametrów
  expect(url.searchParams.get("marker")).toBe(cfg.marker);
  expect(url.searchParams.get("trs")).toBe(cfg.projectId);
  expect(url.searchParams.get("campaign_id")).toBe(AFFILIATE_PROGRAMS[program].campaignId);
  expect(url.searchParams.get("p")).toBe(AFFILIATE_PROGRAMS[program].promoId);
  const target = new URL(url.searchParams.get("u")!);
  expect(target.protocol).toBe("https:");
  expect((AFFILIATE_PROGRAMS[program].hosts as readonly string[]).includes(target.hostname)).toBe(true);
  expect(target.searchParams.has("marker")).toBe(false);
  expect(target.searchParams.has("trs")).toBe(false);
  expect(link.href).toContain("u=https%3A%2F%2F"); // cel zakodowany jako jedna wartość
  expect(link.directHref).toBe(target.toString());
  return { url, target };
}

function expectDirect(link: PartnerLink) {
  expect(link.paid).toBe(false);
  expect(link.href).not.toContain("tp.media");
  const url = new URL(link.href);
  expect(url.searchParams.has("marker")).toBe(false);
  expect(url.searchParams.has("trs")).toBe(false);
}

function expectPaidAnchor(html: string, count = 1) {
  expect(html.match(/rel="sponsored noopener noreferrer"/g)?.length).toBe(count);
  expect(html.match(/data-paid="true"/g)?.length).toBe(count);
  expect(html).toContain("link partnerski");
  expect(html).toContain('target="_blank"');
}

function expectDirectAnchor(html: string) {
  expect(html).not.toContain("sponsored");
  expect(html).not.toContain("tp.media");
  expect(html).not.toContain("728414");
  expect(html).not.toContain(TARGET_PROJECT);
  expect(html).not.toContain("link partnerski");
  expect(html).toContain('data-paid="false"');
  expect(html).toContain('rel="noopener noreferrer"');
}

const provider = (child: ReturnType<typeof createElement>, cfg: PartnerConfig = config) =>
  renderToStaticMarkup(createElement(AffiliateProvider, { config: cfg }, child));

beforeEach(() => { consent.value = null; });
afterEach(() => vi.unstubAllEnvs());

describe("konfiguracja: marker i projekt", () => {
  it("czyta marker i projekt wyłącznie z TRAVELPAYOUTS_MARKER / TRAVELPAYOUTS_PROJECT_ID", () => {
    vi.stubEnv("TRAVELPAYOUTS_MARKER", MARKER);
    vi.stubEnv("TRAVELPAYOUTS_PROJECT_ID", TARGET_PROJECT);
    vi.stubEnv("NEXT_PUBLIC_AFFILIATE_BOOKING", "aid=1");
    expect(readAffiliateConfig()).toEqual({ marker: MARKER, projectId: TARGET_PROJECT });
  });

  it("w żadnym generatorze nie ma zaszytego starego projektu 528873 ani innego markera niż z konfiguracji", () => {
    const links = [
      flightSearchLink({ origin: "WRO", destination: "BCN", depart: "2026-12-05", returnDate: "2026-12-08" }, config),
      flightLink(offer, config)!,
      ticketsLink({ title: "Sagrada", city: "Barcelona" }, config),
      luggageLink(config),
      buildFlightLink(deal, MARKER, deal.week, "web", TARGET_PROJECT),
    ];
    for (const link of links) {
      expect(link.href).not.toContain("528873");
      expect(new URL(link.href).searchParams.get("trs")).toBe(TARGET_PROJECT);
      expect(new URL(link.href).searchParams.get("marker")).toBe(MARKER);
    }
  });

  it("przycina białe znaki w wartościach env (marker z końcowym \\n nie psuje atrybucji)", () => {
    const link = luggageLink({ marker: " 728414\n", projectId: " 601310 " });
    expect(new URL(link.href).searchParams.get("marker")).toBe(MARKER);
    expect(new URL(link.href).searchParams.get("trs")).toBe(TARGET_PROJECT);
  });

  it.each([
    [{}],
    [{ marker: MARKER }],
    [{ projectId: TARGET_PROJECT }],
    [{ marker: "  ", projectId: TARGET_PROJECT }],
    [{ marker: MARKER, projectId: "\n" }],
  ] as [PartnerConfig][])("niepełna konfiguracja %j daje link bezpośredni we wszystkich generatorach", (cfg) => {
    for (const link of [
      flightSearchLink({ origin: "WRO", destination: "BCN", depart: "2026-12-05", returnDate: "2026-12-08" }, cfg),
      flightLink(offer, cfg)!,
      ticketsLink({ title: "Sagrada", city: "Barcelona" }, cfg),
      luggageLink(cfg),
      buildFlightLink(deal, cfg.marker, deal.week, "web", cfg.projectId),
    ]) expectDirect(link);
  });
});

describe("lot (Aviasales 100/4114)", () => {
  it("wyszukiwanie z datami: marker, trs, program, trasa i daty w u=", () => {
    const { target } = expectPaid(
      flightSearchLink({ origin: "WRO", destination: "BCN", depart: "2026-12-05", returnDate: "2026-12-08", passengers: { adults: 2, children: 1, infants: 0 } }, config),
      "aviasales",
    );
    expect(target.pathname).toBe("/search/WRO0512BCN081221");
    expect(target.search).toBe("");
  });

  it("bez dat: formularz /?params=, nadal z markerem i trs na zewnątrz u=", () => {
    const { target } = expectPaid(flightSearchLink({ origin: "WRO", destination: "BCN" }, config), "aviasales");
    expect(target.searchParams.get("params")).toBe("WROBCN1");
  });

  it("zapisana oferta jest przebudowana z trasy, a nie z zapisanego adresu z cudzym markerem", () => {
    const stale = { ...offer, affiliateUrl: "https://www.aviasales.com/search/WRO0512BCN08121?marker=OLD&trs=528873" } as FlightOffer;
    const { target } = expectPaid(flightLink(stale, config)!, "aviasales");
    expect(target.toString()).not.toMatch(/OLD|528873/);
  });

  it("stary adres bez trasy: stare marker/trs są zdejmowane, a nowe dopisywane raz", () => {
    const legacy = { affiliateUrl: "https://www.aviasales.com/search/WRO0512BCN08121?marker=OLD&trs=528873&t=x" } as FlightOffer;
    const { url, target } = expectPaid(flightLink(legacy, config)!, "aviasales");
    expect(url.searchParams.get("marker")).toBe(MARKER);
    expect(target.searchParams.get("t")).toBe("x");
  });

  it("odrzuca obce hosty i protokoły (brak open redirectu przez tp.media)", () => {
    for (const bad of ["https://evil.example/", "http://www.aviasales.com/x", "https://user:pw@www.aviasales.com/x", "https://www.aviasales.com.evil.example/"]) {
      expect(() => travelpayoutsLink("aviasales", bad, config)).toThrow();
    }
    expect(flightLink({ affiliateUrl: "https://evil.example/?x=1" } as FlightOffer, config)).toBeNull();
  });

  it("strona okazji (buildFlightLink): UTM są wewnątrz u=, marker i trs na zewnątrz, obce marker/trs z linku API zdjęte", () => {
    const dirty = { ...deal, link: "/search/WRO0412BCN06121?t=abc&marker=OLD&trs=528873" };
    const { url, target } = expectPaid(buildFlightLink(dirty, MARKER, deal.week, "web", TARGET_PROJECT), "aviasales");
    expect(url.searchParams.has("utm_source")).toBe(false);
    expect(target.searchParams.get("utm_source")).toBe("drop");
    expect(target.searchParams.get("utm_medium")).toBe("web");
    expect(target.searchParams.get("t")).toBe("abc");
  });

  it("strona okazji bez konfiguracji: link bezpośredni bez UTM i bez markerów", () => {
    const link = buildFlightLink(deal, undefined, deal.week, "web", undefined);
    expectDirect(link);
    expect(link.href).not.toContain("utm_");
  });
});

describe("bilety (Tiqets 89/2074) i bagaż (Radical 209/5867)", () => {
  it("bilety: tytuł z & # ? + % i próbą wstrzyknięcia trs/marker nie rozbija parametrów", () => {
    const title = "Muzeum & Galeria #1 ? 100% +extra&trs=evil&marker=evil";
    const { target } = expectPaid(ticketsLink({ title, city: "Łódź" }, config), "tiqets");
    expect(target.searchParams.get("q")).toBe(`${title} Łódź`);
  });

  it("bagaż: stały cel radicalstorage.com", () => {
    const { target } = expectPaid(luggageLink(config), "radical");
    expect(target.toString()).toBe("https://radicalstorage.com/");
  });
});

describe("hotele: Booking i Hostelworld bez prowizji (nie odblokowane)", () => {
  it("nawet z pełną konfiguracją i starymi ustawieniami są linkami bezpośrednimi", () => {
    const stale = { ...config, booking: "aid=1", hostelworld: "a=1", getyourguide: "partner_id=G", bounce: "ref=B" };
    const booking = bookingLink({ city: "Barcelona", country: "Hiszpania", checkin: "2026-12-05", checkout: "2026-12-08", label: "okazje-wro" }, stale);
    const hostel = hostelworldLink("Barcelona", stale);
    for (const link of [booking, hostel]) {
      expectDirect(link);
      expect(link.href).not.toMatch(/aid=|partner_id|ref=|[?&]a=1/);
    }
    expect(booking.partner).toBe("booking");
    expect(hostel.partner).toBe("hostelworld");
  });

  it.each(["booking", "hostelworld", "getyourguide", "viator", "omio", "constructor", "__proto__"])(
    "travelpayoutsLink odmawia programu %s",
    (partner) => expect(() => travelpayoutsLink(partner as never, "https://www.booking.com/", config)).toThrow(),
  );

  it("lista dopuszczonych programów to dokładnie Aviasales, Tiqets, Radical", () => {
    expect(PROGRAM_KEYS.sort()).toEqual(["aviasales", "radical", "tiqets"]);
  });
});

describe("zgoda na cookies (withAffiliateConsent)", () => {
  it.each(PROGRAM_KEYS)("%s: bez zgody wraca link bezpośredni, zgoda przywraca tp.media", (program) => {
    const target = { aviasales: "https://www.aviasales.com/search/WRO0512BCN08121", tiqets: "https://www.tiqets.com/en/search?q=a", radical: "https://radicalstorage.com/" }[program];
    const paid = travelpayoutsLink(program, target, config);
    for (const c of [null, "rejected"] as const) {
      const direct = withAffiliateConsent(paid, c);
      expect(direct).toEqual({ href: target, partner: paid.partner, paid: false });
      expectDirect(direct);
    }
    expect(withAffiliateConsent(paid, "accepted")).toBe(paid);
  });
});

describe("oznaczenie dla użytkownika i rel (komponenty)", () => {
  const act = () => createElement(TicketsLink, { activity, city: "Barcelona" });

  it("brak zgody: wszystkie linki partnerskie są bezpośrednie, bez sponsored i bez „link partnerski”", () => {
    consent.value = null;
    for (const html of [
      provider(createElement(FlightCard, { offer, city: "Barcelona" })),
      provider(act()),
      provider(createElement(LuggageTile, { city: "Barcelona" })),
    ]) expectDirectAnchor(html);
  });

  it("odrzucona zgoda działa tak samo jak brak zgody", () => {
    consent.value = "rejected";
    expectDirectAnchor(provider(createElement(FlightCard, { offer, city: "Barcelona" })));
  });

  it("po zgodzie: lot, bilety i bagaż mają tp.media, marker, trs, rel=sponsored i widoczne „link partnerski”", () => {
    consent.value = "accepted";
    const cases: [ReturnType<typeof createElement>, string][] = [
      [createElement(FlightCard, { offer, city: "Barcelona" }), "100"],
      [act(), "89"],
      [createElement(LuggageTile, { city: "Barcelona" }), "209"],
    ];
    for (const [child, campaign] of cases) {
      const html = provider(child);
      expectPaidAnchor(html);
      const href = /href="([^"]+)"/.exec(html)![1].replaceAll("&amp;", "&");
      const url = new URL(href);
      expect(url.origin + url.pathname).toBe("https://tp.media/r");
      expect(url.searchParams.get("marker")).toBe(MARKER);
      expect(url.searchParams.get("trs")).toBe(TARGET_PROJECT);
      expect(url.searchParams.get("campaign_id")).toBe(campaign);
    }
  });

  it("po zgodzie, ale bez konfiguracji: nie udajemy linku partnerskiego", () => {
    consent.value = "accepted";
    expectDirectAnchor(provider(createElement(FlightCard, { offer, city: "Barcelona" }), {}));
    expectDirectAnchor(provider(createElement(LuggageTile, { city: "Barcelona" }), {}));
  });

  it("hotele zawsze bez prowizji: bez sponsored, bez „link partnerski”, także po zgodzie", () => {
    for (const c of [null, "accepted"] as const) {
      consent.value = c;
      const html = provider(createElement(HotelLinks, { city: "Barcelona", country: "Hiszpania" }));
      expect(html).not.toContain("sponsored");
      expect(html).not.toContain("tp.media");
      expect(html).not.toContain("link partnerski");
      expect(html.match(/data-paid="false"/g)?.length).toBe(2);
    }
  });

  it("AffiliateAnchor (strona okazji): płatny link po zgodzie, bezpośredni przed zgodą", () => {
    const link = buildFlightLink(deal, MARKER, deal.week, "web", TARGET_PROJECT);
    const anchor = () => createElement(AffiliateAnchor, { link, placement: "flight", city: "Barcelona" }, "Lot");
    consent.value = "accepted";
    expectPaidAnchor(renderToStaticMarkup(anchor()));
    consent.value = null;
    const direct = renderToStaticMarkup(anchor());
    expectDirectAnchor(direct);
    expect(direct).toContain("https://www.aviasales.com/search/WRO0412BCN06121");
  });

  it("partnerLinkProps: płatny ma sponsored+noopener+noreferrer, niepłatny nie ma sponsored; _blank w obu", () => {
    const paid = partnerLinkProps({ href: "https://tp.media/r", partner: "aviasales", paid: true }, "flight", "X");
    const free = partnerLinkProps({ href: "https://www.booking.com/", partner: "booking", paid: false }, "hotel", "X");
    expect(paid.rel.split(" ").sort()).toEqual(["noopener", "noreferrer", "sponsored"]);
    expect(free.rel.split(" ").sort()).toEqual(["noopener", "noreferrer"]);
    expect(paid.target).toBe("_blank");
    expect(free.target).toBe("_blank");
  });
});

describe("kliknięcie nie jest prowizją", () => {
  it("zdarzenie affiliate_click niesie tylko miejsce, partnera, miasto i flagę paid: bez kwoty, waluty i „prowizji”", () => {
    const props = partnerLinkProps(luggageLink(config), "luggage", "Barcelona");
    const params = affiliateClickParams({ affiliate: props["data-affiliate"], partner: props["data-partner"], paid: props["data-paid"], city: props["data-city"] })!;
    expect(Object.keys(params).sort()).toEqual(["city", "paid", "partner", "placement"]);
    expect(JSON.stringify(params)).not.toMatch(/value|currency|revenue|commission|prowizj/i);
  });

  it("licznik serwerowy dopisuje :unpaid dla linków bez prowizji i dla kliknięć bez zgody", () => {
    const withConsent = partnerLinkProps(luggageLink(config), "luggage", "X");
    const noConsent = partnerLinkProps(withAffiliateConsent(luggageLink(config), null), "luggage", "X");
    const name = (p: typeof withConsent) => affiliateServerEvent(affiliateClickParams({ affiliate: p["data-affiliate"], partner: p["data-partner"], paid: p["data-paid"] })!);
    expect(name(withConsent)).toBe("affiliate_click:radical:luggage");
    expect(name(noConsent)).toBe("affiliate_click:radical:luggage:unpaid");
  });
});

describe("e-mail zrzutu (buildAffiliateUrl / renderDropEmail)", () => {
  const input = { deals: [deal], teasers: new Map(), originCity: "Wrocławia", week: "2026-W49", appUrl: "https://wloczykij.me", unsubscribeToken: "tok" };

  it("link „Sprawdź cenę” niesie marker 728414 i UTM; ujawnienie partnerskie jest w HTML i w tekście", () => {
    const { html, text } = renderDropEmail({ ...input, marker: MARKER });
    const url = new URL(buildAffiliateUrl(deal, MARKER, deal.week));
    expect(url.hostname).toBe("www.aviasales.com");
    expect(url.searchParams.getAll("marker")).toEqual([MARKER]);
    expect(url.searchParams.get("utm_medium")).toBe("email");
    expect(html).toContain("Linki „Sprawdź cenę” są partnerskie");
    expect(text).toContain("Linki „Sprawdź cenę” są partnerskie");
  });

  it("marker z białymi znakami jest przycinany, a pusty nie dopisuje pustego markera ani ujawnienia", () => {
    expect(new URL(buildAffiliateUrl(deal, " 728414\n", deal.week)).searchParams.getAll("marker")).toEqual([MARKER]);
    for (const empty of ["", "  ", "\n"]) {
      const url = new URL(buildAffiliateUrl(deal, empty, deal.week));
      expect(url.searchParams.has("marker")).toBe(false);
      const out = renderDropEmail({ ...input, marker: empty });
      expect(out.html).not.toContain("marker=");
      expect(out.html).not.toContain("partnerskie");
      expect(out.text).not.toContain("partnerskie");
    }
  });

  it("obcy marker z linku API nie dubluje się z naszym", () => {
    const url = new URL(buildAffiliateUrl({ ...deal, link: "/search/WRO0412BCN06121?t=abc&marker=OLD" }, MARKER, deal.week));
    expect(url.searchParams.getAll("marker")).toEqual([MARKER]);
    expect(url.searchParams.get("t")).toBe("abc");
  });
  it("zepsuty link z API nie rzuca wyjątkiem, a kodowanie istniejącego zapytania zostaje bez zmian", () => {
    expect(() => buildAffiliateUrl({ ...deal, link: "http://x y" }, MARKER, deal.week)).not.toThrow();
    const u = buildAffiliateUrl({ ...deal, link: "/search/WRO0412BCN06121?t=a%20b,c~!()&marker=OLD&TRS=1#f" }, MARKER, deal.week);
    expect(u).toContain("?t=a%20b,c~!()&marker=728414&utm_source=drop");
    expect(u).not.toMatch(/OLD|TRS=1/);
    expect(u.endsWith("#f")).toBe(true);
  });
});
