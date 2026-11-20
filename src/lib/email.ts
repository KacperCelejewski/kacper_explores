import { Resend } from "resend";
import { ORIGIN_GENITIVE } from "@/lib/drop/email";
import { MAIL_CONTACT, esc, mailButton, mailParagraph, mailShell, mailTextFooter } from "@/lib/emailLayout";

// Klient tworzony przy pierwszym wysłaniu, bo build bez klucza (np. preview) inaczej się wywala.
let client: Resend | undefined;
const resend = {
  emails: {
    send: (...args: Parameters<Resend["emails"]["send"]>) => (client ??= new Resend(process.env.RESEND_API_KEY)).emails.send(...args),
  },
};
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? MAIL_CONTACT;

/** Adres, na który trafiają odpowiedzi na maile z nadawców technicznych (zrzut@, przypomnienie@). */
export const REPLY_TO = MAIL_CONTACT;

interface TransactionalMail {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}

async function sendTransactional(mail: TransactionalMail) {
  await resend.emails.send({ ...mail, replyTo: REPLY_TO });
}

export function newsletterConfirmationMail(verifyUrl: string) {
  const subject = "Potwierdź zapis i odbierz 10% na Pro Roczny";
  const preheader = "Jedno kliknięcie i kod na 10% zniżki jest Twój.";
  const html = mailShell({
    title: subject,
    preheader,
    heading: "Potwierdź zapis i odbierz 10% na Pro Roczny",
    content:
      mailParagraph(`Dzięki, że chcesz być w kontakcie. Potwierdź adres, a dostaniesz <strong>kod na 10% zniżki</strong> na subskrypcję Pro Roczny.`) +
      `<div style="margin:8px 0 20px;">${mailButton(verifyUrl, "Potwierdź i odbierz kod")}</div>` +
      mailParagraph(`Link jest ważny 48 godzin. Jeśli to nie Ty, zignoruj tę wiadomość: bez potwierdzenia nic do Ciebie nie wyślemy.`, { muted: true, size: 14 }) +
      mailParagraph(`Przycisk nie działa? Wklej ten adres do przeglądarki:<br><span style="word-break:break-all;">${esc(verifyUrl)}</span>`, { muted: true, size: 13 }),
    footer: { reason: "Dostajesz tę wiadomość, bo ktoś podał ten adres na wloczykij.me." },
  });
  const text = [
    "Potwierdź zapis i odbierz 10% na Pro Roczny",
    "",
    "Dzięki, że chcesz być w kontakcie. Potwierdź adres, a dostaniesz kod na 10% zniżki na subskrypcję Pro Roczny.",
    "",
    `Potwierdź i odbierz kod: ${verifyUrl}`,
    "",
    "Link jest ważny 48 godzin. Jeśli to nie Ty, zignoruj tę wiadomość: bez potwierdzenia nic do Ciebie nie wyślemy.",
    "",
    mailTextFooter("Dostajesz tę wiadomość, bo ktoś podał ten adres na wloczykij.me."),
  ].join("\n");
  return { subject, html, text };
}

export async function sendNewsletterConfirmation(email: string, verifyUrl: string) {
  await sendTransactional({
    from: "Włóczykij <hej@wloczykij.me>",
    to: email,
    ...newsletterConfirmationMail(verifyUrl),
  });
}

function airportsLabel(airports: string[]): string {
  const names = airports.map((c) => ORIGIN_GENITIVE[c] ?? c);
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} i ${names[names.length - 1]}` : names[0] ?? "";
}

export function dropConfirmationMail(verifyUrl: string, opts: { airports: string[]; maxPrice: number }) {
  const subject = "Potwierdź zapis na czwartkowy zrzut";
  const where = airportsLabel(opts.airports);
  const preheader = `Co czwartek jeden mail z maksymalnie 3 wyjazdami z ${where} (lot w obie strony do ${opts.maxPrice} zł).`;
  const html = mailShell({
    title: subject,
    preheader,
    kicker: "Czwartkowy zrzut",
    heading: "Potwierdź zapis na czwartkowy zrzut",
    content:
      mailParagraph(`Co czwartek dostaniesz jeden mail z maksymalnie 3 wyjazdami z ${esc(where)} (lot w obie strony do ${esc(opts.maxPrice)} zł). Wypiszesz się w każdej chwili.`) +
      mailParagraph(`Na start dorzucamy <strong>kod na 10% zniżki</strong> na Pro Roczny. Odbierzesz go po potwierdzeniu.`) +
      `<div style="margin:8px 0 20px;">${mailButton(verifyUrl, "Potwierdź zapis")}</div>` +
      mailParagraph(`Link jest ważny 48 godzin. Jeśli to nie Ty, zignoruj tę wiadomość: bez potwierdzenia zrzut nie ruszy.`, { muted: true, size: 14 }) +
      mailParagraph(`Przycisk nie działa? Wklej ten adres do przeglądarki:<br><span style="word-break:break-all;">${esc(verifyUrl)}</span>`, { muted: true, size: 13 }),
    footer: { reason: "Dostajesz tę wiadomość, bo ktoś zapisał ten adres na czwartkowy zrzut na wloczykij.me." },
  });
  const text = [
    "Potwierdź zapis na czwartkowy zrzut",
    "",
    `Co czwartek dostaniesz jeden mail z maksymalnie 3 wyjazdami z ${where} (lot w obie strony do ${opts.maxPrice} zł). Wypiszesz się w każdej chwili.`,
    "Na start dorzucamy kod na 10% zniżki na Pro Roczny. Odbierzesz go po potwierdzeniu.",
    "",
    `Potwierdź zapis: ${verifyUrl}`,
    "",
    "Link jest ważny 48 godzin. Jeśli to nie Ty, zignoruj tę wiadomość: bez potwierdzenia zrzut nie ruszy.",
    "",
    mailTextFooter("Dostajesz tę wiadomość, bo ktoś zapisał ten adres na czwartkowy zrzut na wloczykij.me."),
  ].join("\n");
  return { subject, html, text };
}

/** Double opt-in dla zapisu na czwartkowy zrzut; zachowuje wzmiankę o kodzie 10%. */
export async function sendDropConfirmation(
  email: string,
  verifyUrl: string,
  opts: { airports: string[]; maxPrice: number },
) {
  await sendTransactional({
    from: "Włóczykij <zrzut@wloczykij.me>",
    to: email,
    ...dropConfirmationMail(verifyUrl, opts),
  });
}

export function dropManageLinkMail(manageUrl: string) {
  const subject = "Twój czwartkowy zrzut: ustawienia";
  const html = mailShell({
    title: subject,
    preheader: "Lotniska, budżet i wypis zmienisz na stronie ustawień.",
    kicker: "Czwartkowy zrzut",
    heading: "Ustawienia czwartkowego zrzutu",
    content:
      mailParagraph(`Ktoś (pewnie Ty) zapisał ten adres na czwartkowy zrzut jeszcze raz. Lotniska, budżet i wypis zmienisz na stronie ustawień.`) +
      `<div style="margin:8px 0 20px;">${mailButton(manageUrl, "Otwórz ustawienia")}</div>` +
      mailParagraph(`Jeśli to nie Ty, nic nie rób. Nic się nie zmieniło.`, { muted: true, size: 14 }) +
      mailParagraph(`Przycisk nie działa? Wklej ten adres do przeglądarki:<br><span style="word-break:break-all;">${esc(manageUrl)}</span>`, { muted: true, size: 13 }),
    footer: { reason: "Dostajesz tę wiadomość, bo ten adres jest zapisany na czwartkowy zrzut na wloczykij.me." },
  });
  const text = [
    "Ustawienia czwartkowego zrzutu",
    "",
    "Ktoś (pewnie Ty) zapisał ten adres na czwartkowy zrzut jeszcze raz. Lotniska, budżet i wypis zmienisz na stronie ustawień.",
    "",
    `Otwórz ustawienia: ${manageUrl}`,
    "",
    "Jeśli to nie Ty, nic nie rób. Nic się nie zmieniło.",
    "",
    mailTextFooter("Dostajesz tę wiadomość, bo ten adres jest zapisany na czwartkowy zrzut na wloczykij.me."),
  ].join("\n");
  return { subject, html, text };
}

/** Mail dla potwierdzonego adresu, który zapisał się ponownie bez logowania. */
export async function sendDropManageLink(email: string, manageUrl: string) {
  await sendTransactional({
    from: "Włóczykij <zrzut@wloczykij.me>",
    to: email,
    ...dropManageLinkMail(manageUrl),
  });
}

export async function sendApiAlert(callsToday: number, cap: number): Promise<void> {
  const pct = Math.round((callsToday / cap) * 100);
  const remaining = cap - callsToday;

  await resend.emails.send({
    from: "Włóczykij Admin <alerty@wloczykij.me>",
    to: ADMIN_EMAIL,
    subject: `⚠️ RapidAPI — ${pct}% limitu dziennego wykorzystane`,
    html: `
<!DOCTYPE html>
<html lang="pl">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F7F7F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7F5;padding:40px 0;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#FFFFFF;border-radius:20px;overflow:hidden;border:1px solid #EBEBEB;">
        <tr>
          <td style="background:#EF4444;padding:24px 32px;">
            <p style="margin:0;color:white;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">Włóczykij · Alert</p>
            <h1 style="margin:8px 0 0;color:white;font-size:22px;font-weight:800;">
              RapidAPI ${pct}% wykorzystane
            </h1>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#FEF2F2;border-radius:12px;padding:16px;margin-bottom:20px;">
              <tr>
                <td style="padding:8px 16px;text-align:center;">
                  <p style="margin:0;font-size:36px;font-weight:800;color:#EF4444;">${callsToday} / ${cap}</p>
                  <p style="margin:4px 0 0;font-size:13px;color:#6B7280;">callów dziś · pozostało <strong>${remaining}</strong></p>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 16px;color:#4B5563;font-size:14px;line-height:1.6;">
              Dzienny limit wynosi <strong>${cap} callów</strong>. Po jego przekroczeniu wyszukiwanie lotów przestaje działać do północy UTC.
            </p>
            <p style="margin:0;color:#4B5563;font-size:14px;line-height:1.6;">
              <strong>Co zrobić:</strong><br>
              • Sprawdź panel admina — czy cache działa poprawnie?<br>
              • Sprawdź czy użytkownicy nie otwierają modalu wielokrotnie<br>
              • Rozważ upgrade planu RapidAPI jeśli ruch rośnie
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 32px 24px;border-top:1px solid #EBEBEB;text-align:center;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL}/admin"
               style="display:inline-block;background:#111;color:white;text-decoration:none;font-size:13px;font-weight:700;padding:10px 24px;border-radius:10px;">
              Otwórz panel admina →
            </a>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}
