import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function sendNewsletterConfirmation(email: string, verifyUrl: string) {
  await resend.emails.send({
    from: "Kacper Explores <hello@kacperexplores.com>",
    to: email,
    subject: "Potwierdź zapis — odbierz 10% na Pack",
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
            <p style="margin:0;color:white;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">Kacper Explores</p>
            <h1 style="margin:8px 0 0;color:white;font-size:22px;font-weight:800;line-height:1.3;">
              Potwierdź zapis<br>i odbierz 10% zniżki
            </h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 20px;color:#4B5563;font-size:15px;line-height:1.6;">
              Dzięki za zapisanie się do newslettera!<br>
              Kliknij poniżej, żeby potwierdzić swój adres e-mail i dostać <strong style="color:#FF6B35;">unikalny kod na 10% zniżki</strong> na Pack.
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
              © 2026 Kacper Explores · <a href="https://kacperexplores.com" style="color:#FF6B35;text-decoration:none;">kacperexplores.com</a>
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
