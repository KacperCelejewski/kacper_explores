import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) return NextResponse.json({ error: "no key" });

  const url = new URL("https://sky-scrapper.p.rapidapi.com/api/v1/flights/searchAirport");
  url.searchParams.set("query", "WRO");
  url.searchParams.set("locale", "en-US");

  const res = await fetch(url.toString(), {
    headers: {
      "x-rapidapi-host": "sky-scrapper.p.rapidapi.com",
      "x-rapidapi-key": apiKey,
    },
  });

  const body = await res.json();
  return NextResponse.json({ http: res.status, body });
}
