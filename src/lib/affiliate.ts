import type { FlightOffer, GroupComposition } from "@/types";
import type { FlightPassengers } from "./group";
import { buildAviasalesUrl } from "./flights/search-url";

export type Partner =
  | "aviasales" | "skyscanner" | "booking" | "hostelworld"
  | "getyourguide" | "tiqets" | "radical_storage" | "radical" | "bounce";
export type Placement = "flight" | "hotel" | "tickets" | "luggage";

export interface PartnerLink {
  href: string;
  partner: Partner;
  paid: boolean;
  directHref?: string;
}

export type PartnerConfig = Partial<
  Record<"booking" | "hostelworld" | "getyourguide" | "tiqets" | "radical_storage" | "bounce", string | undefined>
> & { marker?: string; projectId?: string };

export const AFFILIATE_PROGRAMS = {
  aviasales: { campaignId: "100", promoId: "4114", hosts: ["aviasales.com", "www.aviasales.com"] },
  tiqets: { campaignId: "89", promoId: "2074", hosts: ["tiqets.com", "www.tiqets.com"] },
  radical: { campaignId: "209", promoId: "5867", hosts: ["radicalstorage.com", "www.radicalstorage.com"] },
} as const;

// Read on the server; only these two public IDs are passed to the client provider.
export function readAffiliateConfig(): PartnerConfig {
  return { marker: process.env.TRAVELPAYOUTS_MARKER, projectId: process.env.TRAVELPAYOUTS_PROJECT_ID };
}

export function travelpayoutsLink(partner: keyof typeof AFFILIATE_PROGRAMS, target: string, config: PartnerConfig = {}): PartnerLink {
  if (!Object.hasOwn(AFFILIATE_PROGRAMS, partner)) throw new Error("Unsupported affiliate program");
  const program = AFFILIATE_PROGRAMS[partner];
  const url = new URL(target);
  if (url.protocol !== "https:" || !(program.hosts as readonly string[]).includes(url.hostname) || url.username || url.password) {
    throw new Error("Unsupported affiliate destination");
  }
  const marker = config.marker?.trim();
  const project = config.projectId?.trim();
  if (!marker || !project) return { href: target, partner, paid: false };
  const query = new URLSearchParams({ campaign_id: program.campaignId, marker, p: program.promoId, trs: project, u: target });
  return { href: `https://tp.media/r?${query}`, directHref: target, partner, paid: true };
}

export function withAffiliateConsent(link: PartnerLink, consent: "accepted" | "rejected" | null): PartnerLink {
  if (!link.paid || consent === "accepted") return link;
  return { href: link.directHref ?? "https://www.aviasales.com/", partner: link.partner, paid: false };
}

// Konfiguracja partnera: parametr dopisywany do adresu (np. aid=123) albo szablon z {url}.
// Pusta konfiguracja daje null, czyli link bez prowizji.
export function applyPartner(url: string, config: string | undefined): string | null {
  const value = config?.trim();
  if (!value) return null;
  if (value.includes("{url}")) return value.replace("{url}", encodeURIComponent(url));
  const param = value.replace(/^[?&]+/, "");
  return `${url}${url.includes("?") ? "&" : "?"}${param}`;
}

export function bookingLink(
  input: { city: string; country: string; checkin?: string; checkout?: string; label?: string; group?: GroupComposition },
  _config: PartnerConfig = {},
): PartnerLink {
  // Kept for call-site compatibility; legacy partner settings are deliberately ignored.
  void _config;
  const group = input.group;
  const params = new URLSearchParams({ ss: input.country ? `${input.city}, ${input.country}` : input.city, group_adults: String(group?.adults ?? 1) });
  // Booking chce liczbę dzieci i wiek każdego z nich (parametr age powtórzony)
  if (group && group.childrenAges.length > 0) {
    params.set("group_children", String(group.childrenAges.length));
    for (const age of group.childrenAges) params.append("age", String(age));
  }
  params.set("no_rooms", "1");
  if (input.checkin) params.set("checkin", input.checkin);
  if (input.checkout) params.set("checkout", input.checkout);
  // label pozwala w raporcie Bookinga odróżnić, z której strony przyszła rezerwacja
  if (input.label) params.set("label", input.label);
  return { href: `https://www.booking.com/search.html?${params}`, partner: "booking", paid: false };
}

export function hostelworldLink(city: string, _config: PartnerConfig = {}): PartnerLink {
  void _config;
  return { href: `https://www.hostelworld.com/search?search=${encodeURIComponent(city)}`, partner: "hostelworld", paid: false };
}

export function ticketsLink(input: { title: string; city: string }, config: PartnerConfig = {}): PartnerLink {
  const q = encodeURIComponent(`${input.title} ${input.city}`);
  const tiqets = `https://www.tiqets.com/en/search?q=${q}`;
  return travelpayoutsLink("tiqets", tiqets, config);
}

export function luggageLink(config: PartnerConfig = {}): PartnerLink {
  return travelpayoutsLink("radical", "https://radicalstorage.com/", config);
}

export function flightSearchLink(input: { origin: string; destination: string; depart?: string; returnDate?: string; passengers?: FlightPassengers }, config: PartnerConfig = {}): PartnerLink {
  return travelpayoutsLink("aviasales", buildAviasalesUrl(input.origin, input.destination, input.depart ?? "", input.returnDate ?? "", "", input.passengers), config);
}

// Rebuild saved URLs so stale markers and Skyscanner URLs never override current consent/config.
export function flightLink(offer: FlightOffer | null | undefined, config: PartnerConfig = {}, passengers?: FlightPassengers): PartnerLink | null {
  if (offer?.origin?.code && offer.destination?.code) {
    return flightSearchLink({ origin: offer.origin.code, destination: offer.destination.code, depart: offer.departureDate, returnDate: offer.returnDate, passengers: passengers ?? offer.passengers }, config);
  }
  const raw = offer?.affiliateUrl;
  if (!raw) return null;
  let url: URL;
  try { url = new URL(raw); } catch { return null; }
  if (url.protocol === "https:" && !url.username && !url.password && ["aviasales.com", "www.aviasales.com"].includes(url.hostname)) {
    url.searchParams.delete("marker");
    url.searchParams.delete("trs");
    return travelpayoutsLink("aviasales", url.toString(), config);
  }
  return null;
}

// Pusty koszt, słowa „free/bezpł/darmow” albo pierwsza liczba równa 0 oznaczają darmową atrakcję.
export function isFreeCost(cost: string | null | undefined): boolean {
  const text = (cost ?? "").trim();
  if (!text) return true;
  if (/free|bezpł|darmow/i.test(text)) return true;
  const num = text.match(/\d+(?:[.,]\d+)?/);
  return num !== null && parseFloat(num[0].replace(",", ".")) === 0;
}

export function partnerLinkProps(link: PartnerLink, placement: Placement, city: string) {
  return {
    href: link.href,
    target: "_blank" as const,
    rel: link.paid ? "sponsored noopener noreferrer" : "noopener noreferrer",
    "data-affiliate": placement,
    "data-partner": link.partner,
    "data-paid": link.paid ? ("true" as const) : ("false" as const),
    "data-city": city,
  };
}

// Nazwa zdarzenia do licznika po stronie serwera (tabela quiz_events), niezależnego od zgody na GA:
// "affiliate_click:booking:hotel" albo z dopiskiem ":unpaid", gdy link nie jest partnerski.
export function affiliateServerEvent(aff: { placement: string; partner: string; paid: boolean }): string {
  return `affiliate_click:${aff.partner}:${aff.placement}${aff.paid ? "" : ":unpaid"}`.slice(0, 80);
}

export function affiliateClickParams(
  dataset: Record<string, string | undefined>,
): { placement: string; partner: string; paid: boolean; city?: string } | null {
  if (!dataset.affiliate) return null;
  return {
    placement: dataset.affiliate,
    partner: dataset.partner ?? "unknown",
    paid: dataset.paid === "true",
    city: dataset.city,
  };
}
