import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { Resend } from "resend";
import { isAuthorizedCron } from "@/lib/drop/cronAuth";
import { preTripWhen, renderPreTripEmail } from "@/lib/preTripEmail";
import { resolveIcsStartDate } from "@/lib/ics";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized triggering
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const resend = new Resend(process.env.RESEND_API_KEY!);

  // Find trips departing in exactly 3 days
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 3);
  const dateStr = targetDate.toISOString().split("T")[0]; // YYYY-MM-DD

  const { data: trips, error } = await supabase
    .from("trips")
    .select("id, city, country, user_id, flight_data, plan_start:ai_plan_json->>startDate, plan_days:ai_plan_json->>duration")
    .or(`ai_plan_json->>startDate.eq.${dateStr},flight_data->>departureDate.eq.${dateStr}`);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // Data wyjazdu jak w kalendarzu planu (.ics): data zapisana z planem, a dopiero potem data oferty lotu.
  // Zapytanie bierze oba kandydaty, więc odfiltrowujemy wyjazdy, których właściwy termin jest inny.
  const due = (trips ?? []).filter(
    (t) =>
      resolveIcsStartDate({
        planStartDate: (t as { plan_start?: string | null }).plan_start,
        offerDepartureDate: (t.flight_data as { departureDate?: string } | null)?.departureDate,
      }) === dateStr
  );
  if (due.length === 0) return NextResponse.json({ sent: 0 });

  let sent = 0;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://wloczykij.me";

  for (const trip of due) {
    try {
      // Fetch user email via admin API
      const { data: userData } = await supabase.auth.admin.getUserById(trip.user_id);
      const email = userData?.user?.email;
      if (!email) continue;

      const shareUrl = `${baseUrl}/plan/${trip.id}`;
      const offer = trip.flight_data as { departureDate?: string; returnDate?: string } | null;
      const when = preTripWhen({
        planStart: (trip as { plan_start?: string | null }).plan_start,
        planDays: (trip as { plan_days?: string | null }).plan_days,
        offerDeparture: offer?.departureDate,
        offerReturn: offer?.returnDate,
      });
      const mail = renderPreTripEmail({ city: trip.city, country: trip.country, planUrl: shareUrl, when });
      await resend.emails.send({
        from: "Włóczykij <przypomnienie@wloczykij.me>",
        to: email,
        replyTo: "hej@wloczykij.me",
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      });
      sent++;
    } catch {
      // Skip failed sends, continue with others
    }
  }

  return NextResponse.json({ sent, total: due.length });
}
