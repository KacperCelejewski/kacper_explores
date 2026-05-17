import { NextRequest, NextResponse } from "next/server";
import { searchFlightOptions } from "@/lib/flights/rapidapi";
import { checkRateLimit, LIMITS } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/validate";

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`real-flights:${ip}`, LIMITS.realFlights.limit, LIMITS.realFlights.windowMs);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Zbyt wiele requestów. Spróbuj ponownie za ${rl.resetInSeconds}s.` },
      { status: 429, headers: { "Retry-After": String(rl.resetInSeconds) } }
    );
  }

  const { searchParams } = new URL(req.url);
  const origin = searchParams.get("origin");
  const dest = searchParams.get("dest");
  const month = Number(searchParams.get("month"));
  const duration = Number(searchParams.get("duration"));

  if (!origin || !dest || !month || !duration) {
    return NextResponse.json({ error: "Brakujące parametry: origin, dest, month, duration" }, { status: 400 });
  }

  if (month < 1 || month > 12 || duration < 1 || duration > 60) {
    return NextResponse.json({ error: "Nieprawidłowe wartości month lub duration" }, { status: 400 });
  }

  if (!process.env.RAPIDAPI_KEY) {
    console.warn("[real-flights] RAPIDAPI_KEY not set — returning empty");
    return NextResponse.json({ flights: [], reason: "no_api_key" });
  }

  const flights = await searchFlightOptions(origin, dest, month, duration, 3);
  return NextResponse.json({ flights, count: flights.length });
}
