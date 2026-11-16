import { NextRequest, NextResponse } from "next/server";
import { fetchCityPhoto } from "@/lib/unsplashApi";

export async function GET(req: NextRequest) {
  const city = req.nextUrl.searchParams.get("city");
  if (!city) return NextResponse.json({ error: "missing city" }, { status: 400 });

  const photo = await fetchCityPhoto(city);
  return NextResponse.json(photo, { headers: { "Cache-Control": "public, max-age=86400" } });
}
