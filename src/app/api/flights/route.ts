import { NextRequest, NextResponse } from "next/server";
import { getRecommendations } from "@/lib/mockFlights";
import { getRealRecommendations } from "@/lib/flights/travelpayouts";
import { buildSkyscannerUrl } from "@/lib/flights/search-url";
import { checkRateLimit, LIMITS } from "@/lib/rateLimit";
import { validateQuizAnswers, getClientIp } from "@/lib/validate";
import type { DestinationRecommendation } from "@/types";

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
    airports = ["WRO"],
    vibe = null,
    placeType = null,
    month = null,
    duration = null,
  } = body as Record<string, unknown>;

  const airportCodes = airports as string[];
  const durationDays = (duration as number | null) ?? null;

  let pool: DestinationRecommendation[] | undefined;
  const hasRealApi = !!process.env.TRAVELPAYOUTS_TOKEN;

  if (hasRealApi && month) {
    try {
      pool = await getRealRecommendations(month as number, airportCodes);
    } catch (err) {
      console.error("Travelpayouts error, using mock:", err);
      pool = undefined;
    }
  }

  // Return ALL destinations sorted by match score (frontend handles display limit)
  let recommendations = getRecommendations(
    styles as string[],
    budget as string,
    airportCodes,
    vibe as string | null,
    placeType as string | null,
    999,
    pool ?? undefined
  );

  // Inject estimated dates + Skyscanner month URL for mock data (no real API)
  if (!pool && month) {
    const m = month as number;
    const now = new Date();
    const year = m >= now.getMonth() + 1 ? now.getFullYear() : now.getFullYear() + 1;
    const pad = (n: number) => String(n).padStart(2, "0");
    const dep = `${year}-${pad(m)}-10`;
    const depDate = new Date(dep);
    depDate.setUTCDate(depDate.getUTCDate() + (durationDays ?? 6));
    const ret = depDate.toISOString().slice(0, 10);
    recommendations = recommendations.map((rec) => {
      const offer = rec.bestOffer;
      return {
        ...rec,
        bestOffer: {
          ...offer,
          departureDate: dep,
          returnDate: ret,
          affiliateUrl: buildSkyscannerUrl(offer.origin.code, offer.destination.code, dep),
        },
      };
    });
  }

  // Adjust return dates from real API to match user's selected duration
  if (pool && durationDays) {
    recommendations = recommendations.map((rec) => {
      const offer = rec.bestOffer;
      if (!offer.departureDate) return rec;
      const depDate = new Date(offer.departureDate);
      const retDate = new Date(depDate);
      retDate.setUTCDate(retDate.getUTCDate() + durationDays);
      const newRet = retDate.toISOString().slice(0, 10);
      // Patch affiliate URL: replace both YYYYMMDD and YYYY-MM-DD formats
      let affiliateUrl = offer.affiliateUrl;
      if (affiliateUrl && offer.returnDate) {
        const oldCompact = offer.returnDate.replace(/-/g, "");
        const newCompact = newRet.replace(/-/g, "");
        affiliateUrl = affiliateUrl
          .replaceAll(oldCompact, newCompact)
          .replaceAll(offer.returnDate, newRet);
      }
      return { ...rec, bestOffer: { ...offer, returnDate: newRet, affiliateUrl } };
    });
  }

  return NextResponse.json({ recommendations });
}
