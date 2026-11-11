import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendSlack } from "@/lib/slack";
import { isAuthorizedCron } from "@/lib/drop/cronAuth";
import { weekKey, weekendDates } from "@/lib/drop/dates";
import { fetchCities, fetchWeekendOffers, groupDeals, mergeVariants } from "@/lib/drop/deals";
import type { DropDeal } from "@/lib/drop/types";

export const maxDuration = 60;

const PAUSE_MS = 300; // limit Travelpayouts: 100 zapytań/h
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.TRAVELPAYOUTS_TOKEN;
  if (!token) {
    await sendSlack("Zrzut: brak TRAVELPAYOUTS_TOKEN, przerywam");
    return NextResponse.json({ error: "Missing TRAVELPAYOUTS_TOKEN" }, { status: 500 });
  }

  const started = Date.now();
  const now = new Date();
  const week = weekKey(now);
  const variants = weekendDates(now);
  const supabase = createServiceClient();

  const { data: subs, error: subsError } = await supabase
    .from("newsletter_subscribers")
    .select("airports")
    .eq("verified", true)
    .eq("drop_enabled", true);
  if (subsError) {
    await sendSlack(`Zrzut ${week}: błąd odczytu subskrybentów: ${subsError.message}`);
    return NextResponse.json({ error: subsError.message }, { status: 500 });
  }

  const airports = [...new Set((subs ?? []).flatMap((s) => (s.airports as string[]) ?? []))];
  if (airports.length === 0) {
    await sendSlack(`Zrzut ${week}: brak lotnisk subskrybentów, nic do pobrania`);
    return NextResponse.json({ week, airports: [], deals: 0 });
  }

  let cities;
  try {
    cities = await fetchCities();
  } catch (err) {
    console.error("[drop-prepare] fetchCities", err);
    await sendSlack(`Zrzut ${week}: nie udało się pobrać listy miast`);
    return NextResponse.json({ error: "cities fetch failed" }, { status: 500 });
  }

  const fetchedAt = new Date().toISOString();
  const withData: string[] = [];
  const empty: string[] = [];
  let total = 0;
  let dbError: string | null = null;

  for (const origin of airports) {
    const all: DropDeal[] = [];
    for (const variant of variants) {
      const offers = await fetchWeekendOffers(origin, variant, token);
      all.push(...groupDeals(offers, variant, cities, week, fetchedAt));
      await sleep(PAUSE_MS);
    }
    const deals = mergeVariants(all);
    if (deals.length === 0) {
      empty.push(origin);
      continue;
    }

    // stare okazje z tego tygodnia nie mogą zostać obok świeżych
    const del = await supabase.from("drop_deals").delete().eq("week", week).eq("origin", origin);
    const up = del.error
      ? del
      : await supabase.from("drop_deals").upsert(deals, { onConflict: "week,origin,city_code" });
    if (up.error) {
      dbError = up.error.message;
      empty.push(origin);
      continue;
    }
    withData.push(origin);
    total += deals.length;
  }

  await sendSlack(
    `Zrzut ${week}: ${total} okazji z ${withData.join(", ") || "-"}; puste: ${empty.join(", ") || "-"}; ${Date.now() - started} ms` +
      (dbError ? `; błąd bazy: ${dbError}` : ""),
  );
  return NextResponse.json(
    { week, deals: total, airports: withData, empty },
    { status: dbError ? 500 : 200 },
  );
}
