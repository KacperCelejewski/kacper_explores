import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export const maxDuration = 60;

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function buildPreTripEmail(city: string, country: string, shareUrl: string): string {
  return `<!DOCTYPE html>
<html lang="pl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F7F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7F5;padding:40px 0;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#FFFFFF;border-radius:20px;overflow:hidden;border:1px solid #EBEBEB;">
        <tr>
          <td style="background:#C4622D;padding:28px 32px;">
            <p style="margin:0;color:white;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">Włóczykij</p>
            <h1 style="margin:8px 0 0;color:white;font-size:22px;font-weight:800;line-height:1.3;">
              Za 3 dni lecisz do<br>${city}! ✈️
            </h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 20px;color:#4B5563;font-size:15px;line-height:1.6;">
              Twój plan podróży do <strong>${city}, ${country}</strong> czeka gotowy.
              Czas na ostatnie przygotowania — sprawdź listę rzeczy do spakowania!
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding:8px 0 24px;">
                  <a href="${shareUrl}"
                    style="display:inline-block;background:#C4622D;color:white;text-decoration:none;font-size:15px;font-weight:700;padding:14px 32px;border-radius:14px;">
                    Otwórz plan podróży →
                  </a>
                </td>
              </tr>
            </table>
            <div style="background:#F5EFE0;border-radius:12px;padding:16px;margin-bottom:20px;">
              <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#1C1008;">✅ Ostatnia chwila — sprawdź:</p>
              <ul style="margin:0;padding:0 0 0 16px;color:#4B5563;font-size:13px;line-height:1.8;">
                <li>Paszport / dowód osobisty</li>
                <li>Bilety lotnicze (check-in online!)</li>
                <li>Rezerwacja noclegu</li>
                <li>Karta płatnicza + gotówka</li>
                <li>Ubezpieczenie podróżne</li>
              </ul>
            </div>
            <p style="margin:0;color:#9CA3AF;font-size:12px;line-height:1.6;">
              Dobrej podróży! Pamiętaj, że Twój plan jest dostępny offline po pobraniu PDF.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 24px;border-top:1px solid #EBEBEB;">
            <p style="margin:0;color:#9CA3AF;font-size:11px;text-align:center;">
              © 2026 Włóczykij · <a href="https://wloczykij.me" style="color:#C4622D;text-decoration:none;">wloczykij.me</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized triggering
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = serviceClient();
  const resend = new Resend(process.env.RESEND_API_KEY!);

  // Find trips departing in exactly 3 days
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 3);
  const dateStr = targetDate.toISOString().split("T")[0]; // YYYY-MM-DD

  const { data: trips, error } = await supabase
    .from("trips")
    .select("id, city, country, user_id, flight_data")
    .filter("flight_data->>departureDate", "eq", dateStr);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!trips || trips.length === 0) return NextResponse.json({ sent: 0 });

  let sent = 0;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://wloczykij.me";

  for (const trip of trips) {
    try {
      // Fetch user email via admin API
      const { data: userData } = await supabase.auth.admin.getUserById(trip.user_id);
      const email = userData?.user?.email;
      if (!email) continue;

      const shareUrl = `${baseUrl}/plan/${trip.id}`;
      await resend.emails.send({
        from: "Włóczykij <przypomnienie@wloczykij.me>",
        to: email,
        subject: `Za 3 dni lecisz do ${trip.city}! ✈️ Twój plan podróży`,
        html: buildPreTripEmail(trip.city, trip.country, shareUrl),
      });
      sent++;
    } catch {
      // Skip failed sends, continue with others
    }
  }

  return NextResponse.json({ sent, total: trips.length });
}
