import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendSlack } from "@/lib/slack";
import { isAuthorizedCron } from "@/lib/drop/cronAuth";
import { weekKey } from "@/lib/drop/dates";
import { fetchCities } from "@/lib/drop/deals";
import { generateTeaser } from "@/lib/drop/teasers";
import { runPool } from "@/lib/drop/runPool";

export const maxDuration = 60;

const POOL_SIZE = 5;
const BUDGET_MS = 50_000; // zapas do limitu 60 s

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  const week = weekKey(new Date());

  if (!process.env.GEMINI_API_KEY) {
    await sendSlack(`Zajawki ${week}: brak GEMINI_API_KEY, przerywam`);
    return NextResponse.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 });
  }

  const supabase = createServiceClient();
  const [dealsRes, teasersRes] = await Promise.all([
    supabase.from("drop_deals").select("city_code, city_name").eq("week", week),
    supabase.from("city_teasers").select("city_code").eq("week", week),
  ]);
  const readError = dealsRes.error ?? teasersRes.error;
  if (readError) {
    await sendSlack(`Zajawki ${week}: błąd odczytu bazy: ${readError.message}`);
    return NextResponse.json({ error: readError.message }, { status: 500 });
  }

  const done = new Set((teasersRes.data ?? []).map((t) => t.city_code as string));
  const todo = new Map<string, string>();
  for (const d of dealsRes.data ?? []) {
    if (!done.has(d.city_code)) todo.set(d.city_code, d.city_name);
  }
  if (todo.size === 0) {
    await sendSlack(`Zajawki ${week}: 0/0, błędy: 0`);
    return NextResponse.json({ week, ok: 0, all: 0 });
  }

  let cities;
  try {
    cities = await fetchCities();
  } catch (err) {
    console.error("[drop-teasers] fetchCities", err);
    await sendSlack(`Zajawki ${week}: nie udało się pobrać listy miast`);
    return NextResponse.json({ error: "cities fetch failed" }, { status: 500 });
  }

  const codes = [...todo.keys()];
  const results = await runPool(codes, POOL_SIZE, started + BUDGET_MS, async (code) => {
    const country = cities.get(code)?.country_code;
    if (!country) return null;
    const teaser = await generateTeaser(todo.get(code)!, country, week, code);
    if (!teaser) return null;
    const { error } = await supabase
      .from("city_teasers")
      .upsert(teaser, { onConflict: "week,city_code" });
    return error ? null : teaser;
  });

  const ok = results.filter(Boolean).length;
  const failed = results.filter((r) => r === null).length; // undefined = nie zdążono
  await sendSlack(`Zajawki ${week}: ${ok}/${codes.length}, błędy: ${failed}`);
  return NextResponse.json({ week, ok, all: codes.length, failed });
}
