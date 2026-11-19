import { travelpayoutsLink, type PartnerLink } from "@/lib/affiliate";
import { buildAviasalesUrl } from "@/lib/flights/search-url";
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
  const full = deal.link.startsWith("http") ? deal.link : `${AVIASALES}${deal.link}`;
  // Operacje na tekście (bez new URL): zepsuty link z API nie wywala całej partii maili, a kodowanie zapytania zostaje bez zmian.
  const hashAt = full.indexOf("#");
  const hash = hashAt >= 0 ? full.slice(hashAt) : "";
  const noHash = hashAt >= 0 ? full.slice(0, hashAt) : full;
  const queryAt = noHash.indexOf("?");
  const path = queryAt >= 0 ? noHash.slice(0, queryAt) : noHash;
  const existing = queryAt >= 0 ? noHash.slice(queryAt + 1).split("&") : [];
  // Obcy marker/trs z linku API nie może dublować naszego; pusty marker nie dopisuje pustego parametru.
  const kept = existing.filter((pair) => pair !== "" && !/^(marker|trs)(=|$)/i.test(pair));
  const clean = marker.trim();
  if (clean) kept.push(`marker=${encodeURIComponent(clean)}`);
  kept.push(utm(deal, week, medium));
  return `${path}?${kept.join("&")}${hash}`;
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
export function buildFlightLink(deal: DropDeal, marker: string | undefined, week: WeekKey, medium: string, projectId?: string): PartnerLink {
  let url: URL;
  try {
    const raw = deal.link.startsWith("http") ? deal.link : `${AVIASALES}${deal.link}`;
    // Validate external data before either the paid link or direct fallback is used.
    url = new URL(travelpayoutsLink("aviasales", raw).href);
  } catch {
    url = new URL(buildAviasalesUrl(deal.origin, deal.city_code, deal.departure_at, deal.return_at, ""));
  }
  url.searchParams.delete("marker");
  url.searchParams.delete("trs");
  if (!marker?.trim() || !projectId?.trim()) return { href: url.toString(), partner: "aviasales", paid: false };
  for (const [key, value] of new URLSearchParams(utm(deal, week, medium))) url.searchParams.set(key, value);
  return travelpayoutsLink("aviasales", url.toString(), { marker, projectId });
}
