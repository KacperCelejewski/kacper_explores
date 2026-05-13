import { NextRequest, NextResponse } from "next/server";
import { getRecommendations } from "@/lib/mockFlights";
import { checkRateLimit, LIMITS } from "@/lib/rateLimit";
import { validateQuizAnswers, getClientIp } from "@/lib/validate";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`flights:${ip}`, LIMITS.flights.limit, LIMITS.flights.windowMs);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Zbyt wiele requestów. Spróbuj ponownie za ${rl.resetInSeconds}s.` },
      {
        status: 429,
        headers: { "Retry-After": String(rl.resetInSeconds) },
      }
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

  const { styles = [], budget = "low", includeBerlin = true } = body;

  const recommendations = getRecommendations(styles, budget ?? "low", includeBerlin, 3);
  return NextResponse.json({ recommendations });
}
