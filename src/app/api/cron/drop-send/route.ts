import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createServiceClient } from "@/lib/supabase/service";
import { sendSlack } from "@/lib/slack";
import { isAuthorizedCron } from "@/lib/drop/cronAuth";
import { weekKey } from "@/lib/drop/dates";
import { renderDropEmail, ORIGIN_GENITIVE } from "@/lib/drop/email";
import { buildUnsubscribeUrl } from "@/lib/drop/links";
import { chunk, classifyBatchError, selectRecipients } from "@/lib/drop/send";
import type { CityTeaser, DropDeal, DropSubscriber } from "@/lib/drop/types";

export const maxDuration = 60;

const BUDGET_MS = 50_000; // zapas do limitu 60 s
const BATCH_SIZE = 100; // limit Resend batch.send
const PAGE = 1000; // domyślny limit wierszy w Supabase
const RATE_LIMIT_WAIT_MS = 1000;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const FROM = "Włóczykij <zrzut@wloczykij.me>";

type Db = ReturnType<typeof createServiceClient>;

async function fetchAllPages<T>(
  query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await query(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    all.push(...(data ?? []));
    if (!data || data.length < PAGE) return all;
  }
}

async function releaseRows(db: Db, week: string, ids: string[]) {
  const { error } = await db.from("drop_sends").delete().eq("week", week).in("subscriber_id", ids);
  if (error) console.error("[drop-send] cleanup", error.message);
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    await sendSlack("Zrzut: brak RESEND_API_KEY, przerywam");
    return NextResponse.json({ error: "Missing RESEND_API_KEY" }, { status: 500 });
  }

  const started = Date.now();
  const week = weekKey(new Date());
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://wloczykij.me";
  const marker = process.env.TRAVELPAYOUTS_MARKER ?? "";
  const db = createServiceClient();
  const resend = new Resend(resendKey);

  let deals: DropDeal[];
  let teasers: Map<string, CityTeaser>;
  let subs: DropSubscriber[];
  let alreadySent: Set<string>;
  try {
    const { data: dealRows, error: dealsError } = await db.from("drop_deals").select("*").eq("week", week);
    if (dealsError) throw new Error(dealsError.message);
    deals = (dealRows ?? []) as DropDeal[];
    if (deals.length === 0) {
      await sendSlack(`Zrzut ${week}: brak okazji, nic nie wysłano`);
      return NextResponse.json({ week, sent: 0, deals: 0 });
    }

    const { data: teaserRows, error: teasersError } = await db.from("city_teasers").select("*").eq("week", week);
    if (teasersError) throw new Error(teasersError.message);
    teasers = new Map(((teaserRows ?? []) as CityTeaser[]).map((t) => [t.city_code, t]));

    const subRows = await fetchAllPages<DropSubscriber & { airports: string[] | null }>((from, to) =>
      db
        .from("newsletter_subscribers")
        .select("id, email, airports, max_price, unsubscribe_token")
        .eq("verified", true)
        .eq("drop_enabled", true)
        .not("max_price", "is", null)
        .not("unsubscribe_token", "is", null)
        .order("id")
        .range(from, to),
    );
    subs = subRows.filter((s) => (s.airports ?? []).length > 0) as DropSubscriber[];

    const sentRows = await fetchAllPages<{ subscriber_id: string }>((from, to) =>
      db.from("drop_sends").select("subscriber_id").eq("week", week).order("subscriber_id").range(from, to),
    );
    alreadySent = new Set(sentRows.map((r) => r.subscriber_id));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await sendSlack(`Zrzut ${week}: błąd odczytu z bazy: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const recipients = selectRecipients(subs, alreadySent, deals);
  const unmatched = subs.filter((s) => !alreadySent.has(s.id)).length - recipients.length;
  const batches = chunk(recipients, BATCH_SIZE);

  let sent = 0;
  let errors = 0;
  let leftover = 0; // nie wysłane przez limit Resend albo czasu
  let quotaHit = false;
  let timedOut = false;
  let uncertain = 0; // błąd bez pewności, czy Resend wysłał
  let updateFailures = 0;
  let firstError: string | null = null;

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    const rest = () => batches.slice(b).reduce((n, c) => n + c.length, 0);

    if (Date.now() - started > BUDGET_MS) {
      timedOut = true;
      leftover = rest();
      break;
    }

    // rezerwacja przed wysyłką: wstawiają się tylko wiersze, których jeszcze nie było
    const { data: inserted, error: insertError } = await db
      .from("drop_sends")
      .upsert(
        batch.map((r) => ({ week, subscriber_id: r.sub.id })),
        { onConflict: "week,subscriber_id", ignoreDuplicates: true },
      )
      .select("subscriber_id");
    if (insertError) {
      errors += batch.length;
      firstError ??= `zapis drop_sends: ${insertError.message}`;
      continue;
    }
    const claimed = new Set((inserted ?? []).map((r: { subscriber_id: string }) => r.subscriber_id));
    const mine = batch.filter((r) => claimed.has(r.sub.id));
    if (mine.length === 0) continue;

    const payload = mine.map(({ sub, deals: picked }) => {
      const { subject, html } = renderDropEmail({
        deals: picked,
        teasers,
        originCity: ORIGIN_GENITIVE[picked[0].origin] ?? picked[0].origin,
        week,
        appUrl,
        marker,
        unsubscribeToken: sub.unsubscribe_token,
      });
      return {
        from: FROM,
        to: sub.email,
        subject,
        html,
        headers: {
          "List-Unsubscribe": `<${buildUnsubscribeUrl(appUrl, sub.unsubscribe_token)}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      };
    });
    const ids = mine.map((r) => r.sub.id);
    const idempotencyKey = `drop-${week}-${ids[0]}-${ids.length}`;

    const sendBatch = () => resend.batch.send(payload, { idempotencyKey });
    let result: Awaited<ReturnType<typeof sendBatch>> | null = null;
    let thrown: string | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        result = await sendBatch();
      } catch (err) {
        result = null;
        thrown = err instanceof Error ? err.message : String(err);
        console.error("[drop-send] batch.send threw", err);
        break;
      }
      // chwilowy limit 2 zapytań/s: jedno ponowienie tej samej partii z zachowanymi rezerwacjami
      if (attempt === 0 && result.error && classifyBatchError(result.error) === "rate_limit") {
        await sleep(RATE_LIMIT_WAIT_MS);
        continue;
      }
      break;
    }

    if (!result || result.error || !result.data) {
      const err = result?.error ?? null;
      const kind = err ? classifyBatchError(err) : "unknown";
      const label = err ? `${err.name}: ${err.message}` : (thrown ?? "brak danych z Resend");
      firstError ??= label;
      if (kind === "unknown") {
        // Resend mógł przyjąć partię: rezerwacje zostają, żeby rerun nie wysłał drugi raz
        errors += mine.length;
        uncertain += mine.length;
        continue;
      }
      await releaseRows(db, week, ids);
      if (kind === "quota") {
        quotaHit = true;
        leftover = rest();
        break;
      }
      errors += mine.length;
      continue;
    }

    // Resend zwraca id w kolejności wysłanych wiadomości
    const sentAt = new Date().toISOString();
    const updates = await Promise.all(
      mine.map(async (r, i) => {
        const id = result.data?.data?.[i]?.id ?? null;
        const { error } = await db
          .from("drop_sends")
          .update({ sent_at: sentAt, resend_id: id })
          .eq("week", week)
          .eq("subscriber_id", r.sub.id);
        return !error && id !== null;
      }),
    );
    updateFailures += updates.filter((ok) => !ok).length;
    sent += mine.length;
  }

  const parts = [`Zrzut ${week}: wysłane ${sent}, bez dopasowania ${unmatched}, błędy ${errors}`];
  if (quotaHit) parts.push(`limit Resend, niewysłane: ${leftover}, bez ponawiania`);
  if (timedOut) parts.push(`limit czasu, zostało do wysłania: ${leftover}`);
  if (uncertain) parts.push(`nie wiadomo, czy wysłane: ${uncertain}`);
  if (updateFailures) parts.push(`nie zapisano resend_id dla ${updateFailures}`);
  if (firstError) parts.push(`pierwszy błąd: ${firstError}`);
  if (!marker) parts.push("brak TRAVELPAYOUTS_MARKER, linki bez partnera");
  await sendSlack(parts.join("; "));

  return NextResponse.json(
    { week, sent, unmatched, errors, leftover, quotaHit, timedOut },
    { status: errors || quotaHit || timedOut ? 500 : 200 },
  );
}
