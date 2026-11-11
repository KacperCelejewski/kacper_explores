import { Resend } from "resend";
import { ORIGIN_GENITIVE } from "@/lib/drop/email";

// Klient tworzony przy pierwszym wysłaniu, bo build bez klucza (np. preview) inaczej się wywala.
let client: Resend | undefined;
const resend = {
  emails: {
    send: (...args: Parameters<Resend["emails"]["send"]>) => (client ??= new Resend(process.env.RESEND_API_KEY)).emails.send(...args),
  },
};
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "hej@wloczykij.me";

export async function sendNewsletterConfirmation(email: string, verifyUrl: string) {
  await resend.emails.send({
    from: "Włóczykij <hej@wloczykij.me>",
    to: email,
    subject: "Potwierdź zapis — odbierz 10% na Pro Roczny",
    html: `
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
              Potwierdź zapis<br>i odbierz 10% na Pro Roczny
            </h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 20px;color:#4B5563;font-size:15px;line-height:1.6;">
              Dzięki za zapisanie się do newslettera!<br>
              Kliknij poniżej, żeby potwierdzić swój adres e-mail i dostać <strong style="color:#FF6B35;">unikalny kod na 10% zniżki</strong> na subskrypcję Pro Roczny.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding:8px 0 24px;">
                  <a href="${verifyUrl}"
                    style="display:inline-block;background:#FF6B35;color:white;text-decoration:none;font-size:15px;font-weight:700;padding:14px 32px;border-radius:14px;">
                    Potwierdź i odbierz kod →
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0;color:#9CA3AF;font-size:12px;line-height:1.6;">
              Link jest ważny przez 48 godzin. Jeśli nie zapisywałeś się do newslettera, zignoruj tę wiadomość.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px 24px;border-top:1px solid #EBEBEB;">
            <p style="margin:0;color:#9CA3AF;font-size:11px;text-align:center;">
              © 2026 Włóczykij · <a href="https://wloczykij.me" style="color:#FF6B35;text-decoration:none;">wloczykij.me</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}

function dropMailLayout(title: string, body: string, ctaUrl: string, cta: string, footnote: string): string {
  return `
<!DOCTYPE html>
<html lang="pl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F7F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7F5;padding:40px 0;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#FFFFFF;border-radius:20px;overflow:hidden;border:1px solid #EBEBEB;">
        <tr>
          <td style="background:#FF6B35;padding:28px 32px;">
            <p style="margin:0;color:white;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">Włóczykij</p>
            <h1 style="margin:8px 0 0;color:white;font-size:22px;font-weight:800;line-height:1.3;">${title}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 20px;color:#4B5563;font-size:15px;line-height:1.6;">${body}</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding:8px 0 24px;">
                  <a href="${ctaUrl}"
                    style="display:inline-block;background:#FF6B35;color:white;text-decoration:none;font-size:15px;font-weight:700;padding:14px 32px;border-radius:14px;">
                    ${cta}
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0;color:#9CA3AF;font-size:12px;line-height:1.6;">${footnote}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 24px;border-top:1px solid #EBEBEB;">
            <p style="margin:0;color:#9CA3AF;font-size:11px;text-align:center;">
              © 2026 Włóczykij · <a href="https://wloczykij.me" style="color:#FF6B35;text-decoration:none;">wloczykij.me</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function airportsLabel(airports: string[]): string {
  const names = airports.map((c) => ORIGIN_GENITIVE[c] ?? c);
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} i ${names[names.length - 1]}` : names[0] ?? "";
}

/** Double opt-in dla zapisu na czwartkowy zrzut; zachowuje wzmiankę o kodzie 10%. */
export async function sendDropConfirmation(
  email: string,
  verifyUrl: string,
  opts: { airports: string[]; maxPrice: number },
) {
  await resend.emails.send({
    from: "Włóczykij <onboarding@resend.dev>",
    to: email,
    subject: "Potwierdź zapis na czwartkowy zrzut",
    html: dropMailLayout(
      "Potwierdź zapis<br>na czwartkowy zrzut",
      `Co czwartek dostaniesz jeden mail z maksymalnie 3 wyjazdami z ${airportsLabel(opts.airports)} do ${opts.maxPrice} zł. Wypiszesz się jednym kliknięciem.<br><br>Na start dorzucamy <strong style="color:#FF6B35;">kod na 10% zniżki</strong> na Pro Roczny. Odbierzesz go po potwierdzeniu.`,
      verifyUrl,
      "Potwierdź zapis →",
      "Link jest ważny przez 48 godzin. Jeśli nie zapisywałeś się na zrzut, zignoruj tę wiadomość.",
    ),
  });
}

/** Mail dla potwierdzonego adresu, który zapisał się ponownie bez logowania. */
export async function sendDropManageLink(email: string, manageUrl: string) {
  await resend.emails.send({
    from: "Włóczykij <onboarding@resend.dev>",
    to: email,
    subject: "Twój czwartkowy zrzut: ustawienia",
    html: dropMailLayout(
      "Ustawienia<br>czwartkowego zrzutu",
      "Ktoś (pewnie Ty) zapisał ten adres na czwartkowy zrzut. Lotniska, budżet i wypis zmienisz na stronie ustawień.",
      manageUrl,
      "Otwórz ustawienia →",
      "Jeśli to nie Ty, nic nie rób. Nic się nie zmieniło.",
    ),
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
