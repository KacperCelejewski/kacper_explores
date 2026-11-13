import type { FlightOffer } from "@/types";

export type Partner =
  | "aviasales" | "skyscanner" | "booking" | "hostelworld"
  | "getyourguide" | "tiqets" | "radical_storage" | "bounce";
export type Placement = "flight" | "hotel" | "tickets" | "luggage";

export interface PartnerLink {
  href: string;
  partner: Partner;
  paid: boolean;
}

export type PartnerConfig = Partial<
  Record<"booking" | "hostelworld" | "getyourguide" | "tiqets" | "radical_storage" | "bounce", string | undefined>
>;

// Next wstawia NEXT_PUBLIC_* do paczki tylko przy dosłownym odczycie, nie przez process.env[klucz]
const PARTNER_CONFIG: PartnerConfig = {
  booking: process.env.NEXT_PUBLIC_AFFILIATE_BOOKING,
  hostelworld: process.env.NEXT_PUBLIC_AFFILIATE_HOSTELWORLD,
  getyourguide: process.env.NEXT_PUBLIC_AFFILIATE_GETYOURGUIDE,
  tiqets: process.env.NEXT_PUBLIC_AFFILIATE_TIQETS,
  radical_storage: process.env.NEXT_PUBLIC_AFFILIATE_RADICAL_STORAGE,
  bounce: process.env.NEXT_PUBLIC_AFFILIATE_BOUNCE,
};

// Konfiguracja partnera: parametr dopisywany do adresu (np. aid=123) albo szablon z {url}.
// Pusta konfiguracja daje null, czyli link bez prowizji.
export function applyPartner(url: string, config: string | undefined): string | null {
  const value = config?.trim();
  if (!value) return null;
  if (value.includes("{url}")) return value.replace("{url}", encodeURIComponent(url));
  const param = value.replace(/^[?&]+/, "");
  return `${url}${url.includes("?") ? "&" : "?"}${param}`;
}

function link(url: string, partner: Partner, config: string | undefined): PartnerLink {
  const paidUrl = applyPartner(url, config);
  return { href: paidUrl ?? url, partner, paid: paidUrl !== null };
}

export function bookingLink(
  input: { city: string; country: string; checkin?: string; checkout?: string },
  config: PartnerConfig = PARTNER_CONFIG,
): PartnerLink {
  const params = new URLSearchParams({ ss: input.country ? `${input.city}, ${input.country}` : input.city, group_adults: "1", no_rooms: "1" });
  if (input.checkin) params.set("checkin", input.checkin);
  if (input.checkout) params.set("checkout", input.checkout);
  return link(`https://www.booking.com/search.html?${params}`, "booking", config.booking);
}

export function hostelworldLink(city: string, config: PartnerConfig = PARTNER_CONFIG): PartnerLink {
  return link(`https://www.hostelworld.com/search?search=${encodeURIComponent(city)}`, "hostelworld", config.hostelworld);
}

// Najpierw partner z ustawionym ID (GetYourGuide, potem Tiqets); bez żadnego wraca GetYourGuide bez prowizji
export function ticketsLink(input: { title: string; city: string }, config: PartnerConfig = PARTNER_CONFIG): PartnerLink {
  const q = encodeURIComponent(`${input.title} ${input.city}`);
  const gyg = `https://www.getyourguide.com/s/?q=${q}`;
  const tiqets = `https://www.tiqets.com/en/search?q=${q}`;
  if (applyPartner(gyg, config.getyourguide)) return link(gyg, "getyourguide", config.getyourguide);
  if (applyPartner(tiqets, config.tiqets)) return link(tiqets, "tiqets", config.tiqets);
  return link(gyg, "getyourguide", undefined);
}

export function luggageLink(config: PartnerConfig = PARTNER_CONFIG): PartnerLink {
  const radical = "https://radicalstorage.com/";
  const bounce = "https://usebounce.com/";
  if (applyPartner(radical, config.radical_storage)) return link(radical, "radical_storage", config.radical_storage);
  if (applyPartner(bounce, config.bounce)) return link(bounce, "bounce", config.bounce);
  return link(radical, "radical_storage", undefined);
}

// Link do lotu powstaje na serwerze (marker Travelpayouts); tu tylko go rozpoznajemy.
export function flightLink(offer: FlightOffer | null | undefined): PartnerLink | null {
  const raw = offer?.affiliateUrl;
  if (!raw) return null;
  let url: URL;
  try { url = new URL(raw); } catch { return null; }
  if (url.hostname.includes("aviasales.")) {
    return { href: raw, partner: "aviasales", paid: !!url.searchParams.get("marker") };
  }
  if (url.hostname.includes("skyscanner.")) return { href: raw, partner: "skyscanner", paid: false };
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
