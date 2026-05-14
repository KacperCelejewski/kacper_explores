import { NextRequest, NextResponse } from "next/server";
import { getRecommendations } from "@/lib/mockFlights";
import { getRealRecommendations } from "@/lib/flights/travelpayouts";
import { checkRateLimit, LIMITS } from "@/lib/rateLimit";
import { validateQuizAnswers, getClientIp } from "@/lib/validate";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`flights:${ip}`, LIMITS.flights.limit, LIMITS.flights.windowMs);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Zbyt wiele requestów. Spróbuj ponownie za ${rl.resetInSeconds}s.` },
      { status: 429, headers: { "Retry-After": String(rl.resetInSeconds) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowy format żądania." }, { status: 400 });
  }

  if (!validateQuizAnswers(body)) {
    return NextResponse.json({ error: "Nieprawidłowe dane wejściowe." }, { status: 400 });
  }

  const {
    styles = [],
    budget = "low",
    includeBerlin = true,
    vibe = null,
    placeType = null,
    month = null,
  } = body as Record<string, unknown>;

  // Use real API if token is configured, otherwise fall back to mock
  let pool: import("@/types").DestinationRecommendation[] | undefined;
  const hasRealApi = !!process.env.TRAVELPAYOUTS_TOKEN;

  if (hasRealApi && month) {
    try {
      pool = await getRealRecommendations(month as number, includeBerlin as boolean);
    } catch (err) {
      console.error("Travelpayouts error, using mock:", err);
      pool = undefined;
    }
  }

  let recommendations = getRecommendations(
    styles as string[],
    budget as string,
    includeBerlin as boolean,
    vibe as string | null,
    placeType as string | null,
    3,
    pool ?? undefined
  );

  // Add estimated dates when real API not used but month is known
  if (!pool && month) {
    const m = month as number;
    const now = new Date();
    const year = m >= now.getMonth() + 1 ? now.getFullYear() : now.getFullYear() + 1;
    const pad = (n: number) => String(n).padStart(2, "0");
    const dep = `${year}-${pad(m)}-10`;
    const ret = `${year}-${pad(m)}-17`;
    recommendations = recommendations.map((rec) => ({
      ...rec,
      bestOffer: { ...rec.bestOffer, departureDate: dep, returnDate: ret },
    }));
  }

  return NextResponse.json({ recommendations });
}
