import { NextRequest, NextResponse } from "next/server";
import { parsePassengers, searchFlightOptions } from "@/lib/flights/rapidapi";
import { checkRateLimit, LIMITS } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/validate";

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`real-flights:${ip}`, LIMITS.realFlights.limit, LIMITS.realFlights.windowMs);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Za dużo naraz. Spróbuj za ${rl.resetInSeconds} s.` },
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

  const passengers = parsePassengers(searchParams);
  if (!passengers) {
    return NextResponse.json({ error: "Nieprawidłowy skład grupy (adults, children, infants)" }, { status: 400 });
  }

  if (!process.env.RAPIDAPI_KEY) {
    console.warn("[real-flights] RAPIDAPI_KEY not set — returning empty");
    return NextResponse.json({ flights: [], reason: "no_api_key" });
  }

  const result = await searchFlightOptions(origin, dest, month, duration, 3, passengers);

  // Porównanie z jedną osobą: tylko dla najlepszej oferty i tylko dla grupy.
  // Limit dziennych wywołań pilnuje searchFlightOptions; gdy odmówi, pomijamy bez błędu.
  let soloPrice: number | null = null;
  const best = result.flights[0];
  const seats = passengers.adults + passengers.children;
  if (searchParams.get("compare") === "1" && best && seats > 1) {
    try {
      const solo = await searchFlightOptions(origin, dest, month, duration, 3, { adults: 1, children: 0, infants: 0 });
      const same = solo.flights.find(
        (f) => f.departureDate === best.departureDate && f.returnDate === best.returnDate
      );
      soloPrice = same ? same.price : null;
    } catch {
      soloPrice = null;
    }
  }

  return NextResponse.json({
    flights: result.flights,
    count: result.flights.length,
    reason: result.reason,
    ...(soloPrice !== null ? { soloPrice } : {}),
  });
}
