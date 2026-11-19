import { AIRLINE_NAMES } from "@/lib/flights/airlines";
import { dealNotes, hoursInCity } from "./stay";
import { buildAffiliateUrl, buildPlanUrl, buildSettingsUrl, buildUnsubscribeUrl } from "./links";
import { MAIL_COLORS, mailButton, mailGhostButton, mailParagraph, mailShell, mailTextFooter } from "@/lib/emailLayout";
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
export function formatLocal(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  const dd = String(d).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  return `${weekday} ${dd}.${mm}, ${iso.slice(11, 16)}`;
}

export function transfersLabel(n: number): string {
  if (n === 0) return "bez przesiadek";
  if (n === 1) return "1 przesiadka";
  return `${n} przesiadki`;
}

// Kiedy sprawdziliśmy cenę: z fetched_at, w czasie polskim ("śr 11.11, 22:00"). Bez daty zwraca null.
export function formatCheckedAt(iso: string | undefined | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return formatLocal(`${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:00`);
}

function subjectFor(deals: DropDeal[], originCity: string | null): string {
  if (deals.length === 1) return `${deals[0].city_name}: lot za ${deals[0].price} zł na ten weekend`;
  return originCity
    ? `${deals.length} wyjazdy z ${originCity} na ten weekend`
    : `${deals.length} wyjazdy na ten weekend`;
}

function priceNote(deal: DropDeal): string {
  const checked = formatCheckedAt(deal.fetched_at);
  return checked
    ? `lot w obie strony, cena sprawdzona ${checked}, może się zmienić`
    : "lot w obie strony, cena może się zmienić";
}

function renderCard(
  deal: DropDeal,
  teaser: CityTeaser | undefined,
  input: { appUrl: string; marker: string; week: WeekKey },
): string {
  const airline = AIRLINE_NAMES[deal.airline] ?? deal.airline;
  const checkUrl = buildAffiliateUrl(deal, input.marker, input.week);
  const planUrl = buildPlanUrl(deal, input.appUrl, input.week);
  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const muted = (html: string, size = 13, top = 6) =>
    `<p class="m-muted" style="margin:${top}px 0 0;color:${MAIL_COLORS.muted};font-family:${font};font-size:${size}px;line-height:1.5;">${html}</p>`;
  const teaserHtml = teaser?.teaser
    ? `<p class="m-body" style="margin:12px 0 0;color:${MAIL_COLORS.body};font-family:${font};font-size:15px;line-height:1.6;">${esc(teaser.teaser)}</p>`
    : "";
  const hours = hoursInCity(deal);
  const stayHtml = hours
    ? `<p class="m-ink" style="margin:6px 0 0;color:${MAIL_COLORS.ink};font-family:${font};font-size:14px;font-weight:600;line-height:1.5;">ok. ${esc(hours)} h na miejscu</p>`
    : "";
  const notesHtml = dealNotes(deal).map((n) => muted(esc(n), 13)).join("");
  const budgetHtml = teaser?.local_budget ? muted(esc(teaser.local_budget), 14, 8) : "";

  return `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-line m-soft" style="margin:0 0 16px;background:#FBF5E8;border:1px solid ${MAIL_COLORS.line};border-radius:14px;">
          <tr><td style="padding:18px 20px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
              <td class="m-ink" style="color:${MAIL_COLORS.ink};font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:700;line-height:1.2;">${esc(deal.city_name)}</td>
              <td class="m-accent" align="right" style="color:${MAIL_COLORS.accent};font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:700;line-height:1.2;white-space:nowrap;">${esc(deal.price)} zł</td>
            </tr></table>
            ${muted(esc(priceNote(deal)), 12, 2)}
            <p class="m-ink" style="margin:12px 0 0;color:${MAIL_COLORS.ink};font-family:${font};font-size:15px;line-height:1.6;">${esc(formatLocal(deal.departure_at))} &rarr; ${esc(formatLocal(deal.return_at))}</p>
            ${muted(`z ${esc(ORIGIN_GENITIVE[deal.origin] ?? deal.origin)} · ${esc(airline)} · ${esc(transfersLabel(deal.transfers))}`, 13, 2)}
            ${stayHtml}
            ${notesHtml}
            ${teaserHtml}
            ${budgetHtml}
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;"><tr>
              <td style="padding:0 8px 8px 0;">${mailButton(checkUrl, "Sprawdź cenę")}</td>
              <td style="padding:0 0 8px;">${mailGhostButton(planUrl, "Ułóż mi plan")}</td>
            </tr></table>
          </td></tr>
        </table>`;
}

function renderCardText(
  deal: DropDeal,
  teaser: CityTeaser | undefined,
  input: { appUrl: string; marker: string; week: WeekKey },
): string {
  const airline = AIRLINE_NAMES[deal.airline] ?? deal.airline;
  const hours = hoursInCity(deal);
  const lines = [
    `${deal.city_name}: ${deal.price} zł`,
    `(${priceNote(deal)})`,
    `${formatLocal(deal.departure_at)} -> ${formatLocal(deal.return_at)}`,
    `z ${ORIGIN_GENITIVE[deal.origin] ?? deal.origin} · ${airline} · ${transfersLabel(deal.transfers)}`,
  ];
  if (hours) lines.push(`ok. ${hours} h na miejscu`);
  lines.push(...dealNotes(deal));
  if (teaser?.teaser) lines.push("", teaser.teaser);
  if (teaser?.local_budget) lines.push(teaser.local_budget);
  lines.push("", `Sprawdź cenę: ${buildAffiliateUrl(deal, input.marker, input.week)}`);
  lines.push(`Ułóż mi plan: ${buildPlanUrl(deal, input.appUrl, input.week)}`);
  return lines.join("\n");
}

export function renderDropEmail(input: {
  deals: DropDeal[];
  teasers: Map<string, CityTeaser>;
  originCity: string;
  week: WeekKey;
  appUrl: string;
  marker: string;
  unsubscribeToken: string;
}): { subject: string; html: string; text: string; preheader: string } {
  // przy kilku lotniskach jedno miasto w temacie i nagłówku byłoby mylące
  const multiOrigin = new Set(input.deals.map((d) => d.origin)).size > 1;
  const originCity = multiOrigin ? null : input.originCity;
  const subject = subjectFor(input.deals, originCity);
  const heading = originCity ? `Weekend z ${originCity}` : "Weekend z wyjazdami";
  const cheapest = Math.min(...input.deals.map((d) => d.price));
  const preheader =
    input.deals.length === 1
      ? `${formatLocal(input.deals[0].departure_at)} → ${formatLocal(input.deals[0].return_at)}, ${transfersLabel(input.deals[0].transfers)}.`
      : `Loty od ${cheapest} zł: ${input.deals.map((d) => d.city_name).join(", ")}.`;
  const settingsUrl = buildSettingsUrl(input.appUrl, input.unsubscribeToken);
  const unsubscribeUrl = buildUnsubscribeUrl(input.appUrl, input.unsubscribeToken);
  const affiliate = input.marker.trim().length > 0;
  const disclosure = affiliate
    ? "Linki „Sprawdź cenę” są partnerskie: jeśli kupisz bilet, dostaniemy prowizję, a Ty nie zapłacisz ani złotówki więcej."
    : "";
  const reason = "Dostajesz ten mail, bo zapisano ten adres na czwartkowy zrzut z okazjami na weekend.";
  const links = [
    { label: "Zmień lotnisko lub budżet", url: settingsUrl },
    { label: "Wypisz się ze zrzutu", url: unsubscribeUrl },
  ];
  const cards = input.deals.map((d) => renderCard(d, input.teasers.get(d.city_code), input)).join("\n");

  const html = mailShell({
    title: subject,
    preheader,
    kicker: "Czwartkowy zrzut",
    heading: esc(heading),
    content:
      mailParagraph("Tyle ten weekend kosztuje lot w obie strony. Wybierz, dokąd.") +
      cards +
      (disclosure ? mailParagraph(esc(disclosure), { muted: true, size: 13 }) : ""),
    footer: { reason, links },
  });

  const text = [
    heading,
    "",
    "Tyle ten weekend kosztuje lot w obie strony. Wybierz, dokąd.",
    "",
    input.deals.map((d) => renderCardText(d, input.teasers.get(d.city_code), input)).join("\n\n"),
    ...(disclosure ? ["", disclosure] : []),
    "",
    mailTextFooter(reason, links),
  ].join("\n");

  return { subject, html, text, preheader };
}
