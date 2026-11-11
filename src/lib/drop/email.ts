import { AIRLINE_NAMES } from "@/lib/flights/airlines";
import { buildAffiliateUrl, buildPlanUrl, buildSettingsUrl, buildUnsubscribeUrl } from "./links";
import type { CityTeaser, DropDeal, WeekKey } from "./types";

export const ORIGIN_GENITIVE: Record<string, string> = {
  WRO: "Wrocławia",
  KTW: "Katowic",
  KRK: "Krakowa",
  WAW: "Warszawy",
  WMI: "Modlina",
  POZ: "Poznania",
  GDN: "Gdańska",
};

const WEEKDAYS = ["nd", "pn", "wt", "śr", "czw", "pt", "sob"];

function esc(value: string | number): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Z lokalnego ISO ("2026-11-13T19:05:00+01:00") → "pt 13.11, 19:05", bez konwersji strefy.
function formatLocal(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  const dd = String(d).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  return `${weekday} ${dd}.${mm}, ${iso.slice(11, 16)}`;
}

function transfersLabel(n: number): string {
  if (n === 0) return "bez przesiadek";
  if (n === 1) return "1 przesiadka";
  return `${n} przesiadki`;
}

function subjectFor(deals: DropDeal[], originCity: string | null): string {
  if (deals.length === 1) return `${deals[0].city_name} za ${deals[0].price} zł w ten weekend`;
  return originCity
    ? `${deals.length} wyjazdy z ${originCity} na ten weekend`
    : `${deals.length} wyjazdy na ten weekend`;
}

function renderCard(
  deal: DropDeal,
  teaser: CityTeaser | undefined,
  input: { appUrl: string; marker: string; week: WeekKey },
): string {
  const airline = AIRLINE_NAMES[deal.airline] ?? deal.airline;
  const checkUrl = buildAffiliateUrl(deal, input.marker, input.week);
  const planUrl = buildPlanUrl(deal, input.appUrl, input.week);
  const teaserHtml = teaser?.teaser
    ? `<p style="margin:12px 0 0;color:#4B5563;font-size:14px;line-height:1.6;">${esc(teaser.teaser)}</p>`
    : "";
  const budgetHtml = teaser?.local_budget
    ? `<p style="margin:8px 0 0;color:#6B7280;font-size:13px;line-height:1.5;">${esc(teaser.local_budget)}</p>`
    : "";

  return `
        <tr>
          <td style="padding:0 32px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #EBEBEB;border-radius:16px;">
              <tr><td style="padding:20px;">
                <table width="100%" cellpadding="0" cellspacing="0"><tr>
                  <td style="color:#111827;font-size:20px;font-weight:800;">${esc(deal.city_name)}</td>
                  <td align="right" style="color:#FF6B35;font-size:20px;font-weight:800;">${esc(deal.price)} zł</td>
                </tr></table>
                <p style="margin:2px 0 0;color:#9CA3AF;font-size:11px;">cena ze środy 22:00, może się zmienić</p>
                <p style="margin:12px 0 0;color:#111827;font-size:14px;line-height:1.6;">
                  ${esc(formatLocal(deal.departure_at))} &rarr; ${esc(formatLocal(deal.return_at))}
                </p>
                <p style="margin:2px 0 0;color:#6B7280;font-size:13px;">z ${esc(ORIGIN_GENITIVE[deal.origin] ?? deal.origin)} · ${esc(airline)} · ${esc(transfersLabel(deal.transfers))}</p>
                ${teaserHtml}
                ${budgetHtml}
                <table cellpadding="0" cellspacing="0" style="margin-top:16px;"><tr>
                  <td style="padding-right:8px;">
                    <a href="${esc(checkUrl)}" style="display:inline-block;background:#FF6B35;color:white;text-decoration:none;font-size:14px;font-weight:700;padding:12px 20px;border-radius:12px;">Sprawdź cenę</a>
                  </td>
                  <td>
                    <a href="${esc(planUrl)}" style="display:inline-block;color:#FF6B35;text-decoration:none;font-size:14px;font-weight:700;padding:11px 19px;border-radius:12px;border:1px solid #FF6B35;">Ułóż mi plan</a>
                  </td>
                </tr></table>
              </td></tr>
            </table>
          </td>
        </tr>`;
}

export function renderDropEmail(input: {
  deals: DropDeal[];
  teasers: Map<string, CityTeaser>;
  originCity: string;
  week: WeekKey;
  appUrl: string;
  marker: string;
  unsubscribeToken: string;
}): { subject: string; html: string } {
  // przy kilku lotniskach jedno miasto w temacie i nagłówku byłoby mylące
  const multiOrigin = new Set(input.deals.map((d) => d.origin)).size > 1;
  const originCity = multiOrigin ? null : input.originCity;
  const subject = subjectFor(input.deals, originCity);
  const cards = input.deals
    .map((d) => renderCard(d, input.teasers.get(d.city_code), input))
    .join("\n");
  const settingsUrl = buildSettingsUrl(input.appUrl, input.unsubscribeToken);
  const unsubscribeUrl = buildUnsubscribeUrl(input.appUrl, input.unsubscribeToken);

  const html = `
<!DOCTYPE html>
<html lang="pl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F7F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7F5;padding:40px 0;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#FFFFFF;border-radius:20px;overflow:hidden;border:1px solid #EBEBEB;">

        <!-- Header -->
        <tr>
          <td style="background:#FF6B35;padding:28px 32px;">
            <p style="margin:0;color:white;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">Włóczykij</p>
            <h1 style="margin:8px 0 0;color:white;font-size:22px;font-weight:800;line-height:1.3;">
              ${originCity ? `Weekend z ${esc(originCity)}` : "Weekend z wyjazdami"}
            </h1>
          </td>
        </tr>

        <tr><td style="padding:24px 32px 16px;">
          <p style="margin:0;color:#4B5563;font-size:15px;line-height:1.6;">
            Tyle ten weekend kosztuje lot w obie strony. Wybierz, dokąd.
          </p>
        </td></tr>

        <!-- Deals -->
${cards}

        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px 24px;border-top:1px solid #EBEBEB;">
            <p style="margin:0 0 8px;color:#6B7280;font-size:12px;text-align:center;">
              Chcesz alert na konkretne miasto? To będzie w Pro.
            </p>
            <p style="margin:0;color:#9CA3AF;font-size:11px;text-align:center;">
              <a href="${esc(settingsUrl)}" style="color:#FF6B35;text-decoration:none;">Zmień lotnisko lub budżet</a>
              · <a href="${esc(unsubscribeUrl)}" style="color:#FF6B35;text-decoration:none;">Wypisz się ze zrzutu</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html };
}
