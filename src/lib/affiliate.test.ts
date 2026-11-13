import { describe, expect, it } from "vitest";
import {
  affiliateClickParams, applyPartner, bookingLink, flightLink, hostelworldLink,
  isFreeCost, luggageLink, partnerLinkProps, ticketsLink,
} from "./affiliate";
import type { FlightOffer } from "@/types";

describe("applyPartner", () => {
  it("returns null without config", () => {
    expect(applyPartner("https://x.com/s?q=a", undefined)).toBeNull();
    expect(applyPartner("https://x.com/s?q=a", "  ")).toBeNull();
  });

  it("appends a parameter with ? or &", () => {
    expect(applyPartner("https://x.com/s?q=a", "aid=123")).toBe("https://x.com/s?q=a&aid=123");
    expect(applyPartner("https://x.com/", "partner_id=AB")).toBe("https://x.com/?partner_id=AB");
    expect(applyPartner("https://x.com/", "?aid=1")).toBe("https://x.com/?aid=1");
  });

  it("puts the encoded target into a {url} template", () => {
    const target = "https://www.getyourguide.com/s/?q=Wieża Belém Lizbona&x=1";
    expect(applyPartner(target, "https://tp.media/r?marker=9&u={url}")).toBe(
      `https://tp.media/r?marker=9&u=${encodeURIComponent(target)}`,
    );
  });
});

describe("partner links", () => {
  it("keeps today's Booking search and adds the partner", () => {
    const link = bookingLink(
      { city: "Lizbona", country: "Portugalia", checkin: "2026-12-05", checkout: "2026-12-08" },
      { booking: "aid=1" },
    );
    expect(link).toEqual({
      href: "https://www.booking.com/search.html?ss=Lizbona%2C+Portugalia&group_adults=1&no_rooms=1&checkin=2026-12-05&checkout=2026-12-08&aid=1",
      partner: "booking",
      paid: true,
    });
  });

  it("works without config, just without commission", () => {
    expect(hostelworldLink("Lizbona", {})).toEqual({
      href: "https://www.hostelworld.com/search?search=Lizbona",
      partner: "hostelworld",
      paid: false,
    });
  });

  it("prefers GetYourGuide, then Tiqets, then unpaid GetYourGuide", () => {
    const input = { title: "Wieża Belém", city: "Lizbona" };
    expect(ticketsLink(input, { getyourguide: "partner_id=G", tiqets: "partner=T" }).partner).toBe("getyourguide");
    expect(ticketsLink(input, { tiqets: "partner=T" }).partner).toBe("tiqets");
    expect(ticketsLink(input, {})).toEqual({
      href: `https://www.getyourguide.com/s/?q=${encodeURIComponent("Wieża Belém Lizbona")}`,
      partner: "getyourguide",
      paid: false,
    });
  });

  it("prefers Radical Storage, then Bounce", () => {
    expect(luggageLink({ bounce: "ref=B" })).toEqual({ href: "https://usebounce.com/?ref=B", partner: "bounce", paid: true });
    expect(luggageLink({})).toEqual({ href: "https://radicalstorage.com/", partner: "radical_storage", paid: false });
  });
});

describe("flightLink", () => {
  const aviasales = "https://www.aviasales.com/search/WRO0512BCN08121";

  it("recognizes a paid Aviasales link", () => {
    expect(flightLink({ affiliateUrl: `${aviasales}?marker=abc` } as FlightOffer)).toEqual({
      href: `${aviasales}?marker=abc`,
      partner: "aviasales",
      paid: true,
    });
  });

  it("treats Aviasales without a marker and Skyscanner as unpaid", () => {
    expect(flightLink({ affiliateUrl: aviasales } as FlightOffer)).toMatchObject({ partner: "aviasales", paid: false });
    expect(flightLink({ affiliateUrl: "https://www.skyscanner.pl/transport/loty/wro/bcn/" } as FlightOffer))
      .toMatchObject({ partner: "skyscanner", paid: false });
  });

  it("returns null without a usable flight link", () => {
    expect(flightLink(undefined)).toBeNull();
    expect(flightLink({} as FlightOffer)).toBeNull();
    expect(flightLink({ affiliateUrl: "nie-url" } as FlightOffer)).toBeNull();
    expect(flightLink({ affiliateUrl: "https://example.com/loty" } as FlightOffer)).toBeNull();
  });
});

describe("isFreeCost", () => {
  it.each(["Free", "free", "Bezpłatnie", "bezpłatne", "Darmowe", "0 zł", "~0 EUR", "", undefined, null])(
    "%s is free",
    (cost) => expect(isFreeCost(cost)).toBe(true),
  );

  it.each(["~10 zł", "100 PLN", "~20 €", "15 EUR", "€€"])("%s is paid", (cost) => {
    expect(isFreeCost(cost)).toBe(false);
  });
});

describe("partnerLinkProps", () => {
  it("marks paid links as sponsored and carries tracking data", () => {
    expect(partnerLinkProps({ href: "https://a.com", partner: "booking", paid: true }, "hotel", "Lizbona")).toEqual({
      href: "https://a.com",
      target: "_blank",
      rel: "sponsored noopener noreferrer",
      "data-affiliate": "hotel",
      "data-partner": "booking",
      "data-paid": "true",
      "data-city": "Lizbona",
    });
  });

  it("does not mark unpaid links as sponsored", () => {
    expect(partnerLinkProps({ href: "https://a.com", partner: "booking", paid: false }, "hotel", "Lizbona").rel)
      .toBe("noopener noreferrer");
  });
});

describe("affiliateClickParams", () => {
  it("reads the attributes set by partnerLinkProps", () => {
    expect(affiliateClickParams({ affiliate: "tickets", partner: "getyourguide", paid: "true", city: "Lizbona" }))
      .toEqual({ placement: "tickets", partner: "getyourguide", paid: true, city: "Lizbona" });
  });

  it("ignores links that are not partner links", () => {
    expect(affiliateClickParams({})).toBeNull();
  });
});

describe("bookingLink bez kraju", () => {
  it("szuka samego miasta, gdy kraju nie znamy", () => {
    const link = bookingLink({ city: "Rzym", country: "" }, {});
    const q = new URL(link.href).searchParams.get("ss");
    expect(q).toBe("Rzym");
  });
});

describe("affiliateServerEvent", () => {
  it("składa nazwę z partnera i miejsca", async () => {
    const { affiliateServerEvent } = await import("./affiliate");
    expect(affiliateServerEvent({ placement: "hotel", partner: "booking", paid: true })).toBe("affiliate_click:booking:hotel");
  });
  it("dopisuje :unpaid dla linku bez prowizji", async () => {
    const { affiliateServerEvent } = await import("./affiliate");
    expect(affiliateServerEvent({ placement: "flight", partner: "aviasales", paid: false })).toBe("affiliate_click:aviasales:flight:unpaid");
  });
});

describe("bookingLink label", () => {
  it("dopisuje label do adresu Bookinga, gdy podano źródło", () => {
    const l = bookingLink({ city: "Rzym", country: "", label: "okazje-wro" }, {});
    expect(new URL(l.href).searchParams.get("label")).toBe("okazje-wro");
  });
  it("bez label niczego nie dopisuje", () => {
    expect(new URL(bookingLink({ city: "Rzym", country: "" }, {}).href).searchParams.has("label")).toBe(false);
  });
});

describe("bookingLink label z szablonem partnera", () => {
  it("label zostaje w adresie przekazanym do szablonu {url}", () => {
    const l = bookingLink({ city: "Rzym", country: "", label: "okazje-wro" }, { booking: "https://partner.example/go?u={url}" });
    expect(decodeURIComponent(l.href)).toContain("label=okazje-wro");
  });
});
