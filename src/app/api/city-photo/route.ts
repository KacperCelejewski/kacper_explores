import { NextRequest, NextResponse } from "next/server";
import { fetchCityPhotoUrl } from "@/lib/unsplashApi";

export async function GET(req: NextRequest) {
  const city = req.nextUrl.searchParams.get("city");
  if (!city) return NextResponse.json({ error: "missing city" }, { status: 400 });

  const url = await fetchCityPhotoUrl(city);
  return NextResponse.json({ url }, { headers: { "Cache-Control": "public, max-age=86400" } });
}
