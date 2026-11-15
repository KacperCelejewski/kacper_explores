import { afterEach, describe, expect, it, vi } from "vitest";
import { travelpayoutsLink, ticketsLink, luggageLink, bookingLink, hostelworldLink, flightLink, readAffiliateConfig, withAffiliateConsent, flightSearchLink } from "./affiliate";
import type { FlightOffer } from "@/types";

const config = { marker: "728414", projectId: "528873" };
afterEach(() => vi.unstubAllEnvs());

describe("Travelpayouts", () => {
  it.each([
    ["aviasales", "100", "4114", "https://www.aviasales.com/"],
    ["tiqets", "89", "2074", "https://www.tiqets.com/"],
    ["radical", "209", "5867", "https://radicalstorage.com/"],
  ] as const)("uses the verified %s campaign and tool", (partner, campaign, promo, target) => {
    const link = travelpayoutsLink(partner, target, config);
    const url = new URL(link.href);
    expect(url.origin + url.pathname).toBe("https://tp.media/r");
    expect(Object.fromEntries(url.searchParams)).toEqual({ campaign_id: campaign, marker: "728414", p: promo, trs: "528873", u: target });
    expect(link.paid).toBe(true);
  });
  it("preserves Unicode and ampersands in the nested destination", () => {
    const link = ticketsLink({ city: "Rzym", title: "Muzeum & Galeria Łódź" }, config);
    const target = new URL(new URL(link.href).searchParams.get("u")!);
    expect(target.hostname).toBe("www.tiqets.com");
    expect(target.searchParams.get("q")).toBe("Muzeum & Galeria Łódź Rzym");
    expect(link.href).toContain("u=https%3A%2F%2F");
  });
  it.each([{}, { projectId: "528873" }, { marker: "728414" }, { marker: "  ", projectId: "528873" }])("falls back without complete config: %j", (missing) => {
    expect(luggageLink(missing)).toMatchObject({ href: "https://radicalstorage.com/", paid: false });
  });
  it.each(["booking", "hostelworld", "getyourguide", "viator", "omio"])("refuses blocked program %s", (partner) => {
    expect(() => travelpayoutsLink(partner as "tiqets", "https://www.tiqets.com/", config)).toThrow();
  });
  it("never monetizes accommodation with obsolete configuration", () => {
    const obsolete = { booking: "aid=123", hostelworld: "ref=456", ...config };
    expect(bookingLink({ city: "Rzym", country: "Włochy" }, obsolete).paid).toBe(false);
    expect(hostelworldLink("Rzym", obsolete).paid).toBe(false);
  });
  it("refuses off-program destinations", () => {
    expect(() => travelpayoutsLink("tiqets", "https://booking.com/", config)).toThrow();
    expect(() => travelpayoutsLink("tiqets", "https://www.tiqets.com.evil.example/", config)).toThrow();
  });
  it.each([null, "rejected"] as const)("removes attribution when consent is %j", (consent) => {
    expect(withAffiliateConsent(luggageLink(config), consent)).toMatchObject({ href: "https://radicalstorage.com/", paid: false });
  });
  it("keeps attribution after explicit consent", () => {
    expect(new URL(withAffiliateConsent(luggageLink(config), "accepted").href).hostname).toBe("tp.media");
  });
  it("reads the existing env names without hardcoding the project", () => {
    vi.stubEnv("TRAVELPAYOUTS_MARKER", "728414");
    vi.stubEnv("TRAVELPAYOUTS_PROJECT_ID", "999999");
    expect(readAffiliateConfig()).toEqual({ marker: "728414", projectId: "999999" });
  });
  it("rebuilds a stale Skyscanner offer with the current quiz passengers", () => {
    const offer = { origin: { code: "WRO" }, destination: { code: "BCN" }, departureDate: "2026-12-05", returnDate: "2026-12-08", affiliateUrl: "https://www.skyscanner.pl/transport/loty/wro/bcn/" } as FlightOffer;
    const link = flightLink(offer, config, { adults: 4, children: 1, infants: 0 })!;
    expect(new URL(link.href).searchParams.get("u")).toBe("https://www.aviasales.com/search/WRO0512BCN081241");
    expect(withAffiliateConsent(link, "rejected").href).toBe("https://www.aviasales.com/search/WRO0512BCN081241");
  });
  it("does not retain a stored marker without current configuration", () => {
    const offer = { affiliateUrl: "https://www.aviasales.com/search/WRO0512BCN08122?marker=old&trs=old" } as FlightOffer;
    expect(flightLink(offer, {})?.href).toBe("https://www.aviasales.com/search/WRO0512BCN08122");
  });
  it("opens an origin form for an unknown city and keeps group size", () => {
    expect(flightSearchLink({ origin: "WRO", destination: "nieznane miasto", passengers: { adults: 4, children: 0, infants: 0 } }, {}).href).toBe("https://www.aviasales.com/?params=WRO4");
  });
});
