import { formatTripWhen } from "@/lib/shareOg";
import { inclusiveDays } from "@/lib/tripTerm";
import { esc, mailButton, mailParagraph, mailShell, mailTextFooter, MAIL_COLORS } from "@/lib/emailLayout";

const CHECKLIST = [
  "Paszport albo dowód osobisty",
  "Bilety lotnicze i odprawa online",
  "Rezerwacja noclegu",
  "Karta płatnicza i trochę gotówki",
  "Ubezpieczenie podróżne",
];

/**
 * Termin do maila: data dnia 1 z planu i liczba jego dni (jak w nagłówku i w .ics), a gdy planu bez daty
 * nie ma, data wylotu z oferty lotu. Bez daty zwraca null i mail zostaje bez terminu.
 */
export function preTripWhen(input: {
  planStart?: string | null;
  planDays?: string | number | null;
  offerDeparture?: string | null;
  offerReturn?: string | null;
}): string | null {
  const planDays = Number(input.planDays);
  if (input.planStart && Number.isInteger(planDays) && planDays > 0) return formatTripWhen(input.planStart, planDays);
  const days = inclusiveDays(input.offerDeparture, input.offerReturn);
  if (input.offerDeparture && days) return formatTripWhen(input.offerDeparture, days);
  return null;
}

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/** Przypomnienie na 3 dni przed wylotem. Dane z bazy (miasto, kraj) są escapowane. */
export function renderPreTripEmail(input: { city: string; country: string; planUrl: string; when?: string | null }): {
  subject: string;
  html: string;
  text: string;
} {
  const { city, country, planUrl, when } = input;
  const subject = `Za 3 dni lecisz do ${city}. Plan czeka`;
  const preheader = `Plan na ${city} jest gotowy. Zostało sprawdzić paszport, bilety i nocleg.`;
  const reason = "Dostajesz tę wiadomość, bo masz na koncie plan wyjazdu z wylotem za 3 dni.";
  const optOut = "Nie chcesz takich przypomnień? Odpisz na tę wiadomość, a je wyłączymy.";

  const list = CHECKLIST.map((item) => `<li style="margin:0 0 4px;">${esc(item)}</li>`).join("");

  const html = mailShell({
    title: subject,
    preheader,
    kicker: "Przypomnienie",
    heading: `Za 3 dni lecisz do ${esc(city)}`,
    content:
      mailParagraph(`Plan podróży do <strong>${esc(city)}, ${esc(country)}</strong>${when ? ` (${esc(when)})` : ""} czeka gotowy. Zostało dopiąć ostatnie rzeczy.`) +
      `<div style="margin:8px 0 24px;">${mailButton(planUrl, "Otwórz plan")}</div>` +
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-soft" bgcolor="#FBF5E8" style="background:#FBF5E8;border-radius:12px;margin:0 0 16px;"><tr><td style="padding:16px 20px;">
        <p class="m-ink" style="margin:0 0 8px;color:${MAIL_COLORS.ink};font-family:${FONT};font-size:15px;font-weight:700;">Ostatnie sprawdzenie</p>
        <ul class="m-body" style="margin:0;padding:0 0 0 20px;color:${MAIL_COLORS.body};font-family:${FONT};font-size:15px;line-height:1.6;">${list}</ul>
      </td></tr></table>` +
      mailParagraph("Plan możesz pobrać jako PDF i mieć pod ręką bez internetu. Dobrej drogi.", { muted: true, size: 14 }),
    footer: { reason: `${reason} ${optOut}` },
  });

  const text = [
    `Za 3 dni lecisz do ${city}`,
    "",
    `Plan podróży do ${city}, ${country}${when ? ` (${when})` : ""} czeka gotowy. Zostało dopiąć ostatnie rzeczy.`,
    "",
    `Otwórz plan: ${planUrl}`,
    "",
    "Ostatnie sprawdzenie:",
    ...CHECKLIST.map((i) => `- ${i}`),
    "",
    "Plan możesz pobrać jako PDF i mieć pod ręką bez internetu. Dobrej drogi.",
    "",
    mailTextFooter(`${reason} ${optOut}`),
  ].join("\n");

  return { subject, html, text };
}
