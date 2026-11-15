import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { Resend } from "resend";
import { isAuthorizedCron } from "@/lib/drop/cronAuth";
import { renderPreTripEmail } from "@/lib/preTripEmail";

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
      const mail = renderPreTripEmail({ city: trip.city, country: trip.country, planUrl: shareUrl });
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

  return NextResponse.json({ sent, total: trips.length });
}
