import type { PartnerLink } from "@/lib/affiliate";
import type { DropDeal, WeekKey } from "./types";

const AVIASALES = "https://www.aviasales.com";

// medium: skąd przyszedł ruch ("email" dla zrzutu, "web" dla strony z okazjami)
function utm(deal: DropDeal, week: WeekKey, medium: string): string {
  return (
    `utm_source=drop&utm_medium=${encodeURIComponent(medium)}` +
    `&utm_campaign=${encodeURIComponent(week)}&utm_content=${encodeURIComponent(deal.city_code)}`
  );
}

export function buildAffiliateUrl(deal: DropDeal, marker: string, week: WeekKey, medium = "email"): string {
  const base = deal.link.startsWith("http") ? deal.link : `${AVIASALES}${deal.link}`;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}marker=${encodeURIComponent(marker)}&${utm(deal, week, medium)}`;
}

export function buildPlanUrl(deal: DropDeal, appUrl: string, week: WeekKey, medium = "email"): string {
  const depart = deal.departure_at.slice(0, 10);
  const ret = deal.return_at.slice(0, 10);
  return (
    `${appUrl}/quiz?city=${encodeURIComponent(deal.city_name)}` +
    `&from=${encodeURIComponent(deal.origin)}&depart=${depart}&return=${ret}` +
    `&src=drop&${utm(deal, week, medium)}`
  );
}

export function buildUnsubscribeUrl(appUrl: string, token: string): string {
  return `${appUrl}/api/drop/unsubscribe?token=${encodeURIComponent(token)}`;
}

export function buildSettingsUrl(appUrl: string, token: string): string {
  return `${appUrl}/zrzut/ustawienia?token=${encodeURIComponent(token)}`;
}

// Link do lotu dla strony: z markerem partnerskim, a bez niego zwykły link bez prowizji (nie udajemy partnera)
export function buildFlightLink(deal: DropDeal, marker: string | undefined, week: WeekKey, medium: string): PartnerLink {
  if (marker) return { href: buildAffiliateUrl(deal, marker, week, medium), partner: "aviasales", paid: true };
  const href = deal.link.startsWith("http") ? deal.link : `${AVIASALES}${deal.link}`;
  return { href, partner: "aviasales", paid: false };
}
