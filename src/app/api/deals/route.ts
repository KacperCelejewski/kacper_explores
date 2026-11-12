import { NextRequest, NextResponse } from "next/server";
import { getDealsForOrigin, originFromSlug } from "@/lib/drop/read";
import { hoursInCity } from "@/lib/drop/stay";

// Najtańsze okazje z lotniska dla paska na stronie głównej; tylko polskie lotniska, tylko dane z bazy
export async function GET(req: NextRequest) {
  const origin = originFromSlug(req.nextUrl.searchParams.get("origin") ?? "");
  if (!origin) return NextResponse.json({ error: "Nieznane lotnisko." }, { status: 400 });

  const { deals } = await getDealsForOrigin(origin, 3);
  return NextResponse.json({
    origin,
    deals: deals.map((d) => ({
      city: d.city_name,
      price: d.price,
      departure_at: d.departure_at,
      return_at: d.return_at,
      hours: hoursInCity(d),
    })),
  });
}
