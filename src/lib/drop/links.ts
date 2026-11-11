import type { DropDeal, WeekKey } from "./types";

const AVIASALES = "https://www.aviasales.com";

function utm(deal: DropDeal, week: WeekKey): string {
  return (
    `utm_source=drop&utm_medium=email` +
    `&utm_campaign=${encodeURIComponent(week)}&utm_content=${encodeURIComponent(deal.city_code)}`
  );
}

export function buildAffiliateUrl(deal: DropDeal, marker: string, week: WeekKey): string {
  const base = deal.link.startsWith("http") ? deal.link : `${AVIASALES}${deal.link}`;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}marker=${encodeURIComponent(marker)}&${utm(deal, week)}`;
}

export function buildPlanUrl(deal: DropDeal, appUrl: string, week: WeekKey): string {
  const depart = deal.departure_at.slice(0, 10);
  const ret = deal.return_at.slice(0, 10);
  return (
    `${appUrl}/quiz?city=${encodeURIComponent(deal.city_name)}` +
    `&from=${encodeURIComponent(deal.origin)}&depart=${depart}&return=${ret}` +
    `&src=drop&${utm(deal, week)}`
  );
}

export function buildUnsubscribeUrl(appUrl: string, token: string): string {
  return `${appUrl}/api/drop/unsubscribe?token=${encodeURIComponent(token)}`;
}

export function buildSettingsUrl(appUrl: string, token: string): string {
  return `${appUrl}/zrzut/ustawienia?token=${encodeURIComponent(token)}`;
}
