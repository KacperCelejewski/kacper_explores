import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/userProfile";
import { sendDropConfirmation, sendDropManageLink } from "@/lib/email";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/validate";
import { createNewsletterPromo, newVerificationToken, newsletterVerifyUrl } from "@/lib/newsletter";
import {
  buildSubscriberUpsert, budgetToMaxPrice, decideSubscribeAction, newUnsubscribeToken, normalizeSignup, DROP_MAX_AIRPORTS,
} from "@/lib/drop/signup";
import { buildSettingsUrl } from "@/lib/drop/links";
import { POLISH_AIRPORTS } from "@/lib/airports";

const GENERIC_ERROR = "Coś poszło nie tak. Spróbuj jeszcze raz — zwykle działa za drugim.";
const POLISH_CODES = new Set(POLISH_AIRPORTS.map((a) => a.code));

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`drop:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Za dużo prób. Spróbuj za godzinę." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== "object") throw new Error("bad body");
    body = parsed;
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe dane." }, { status: 400 });
  }

  const fromProfile = body.fromProfile === true;
  let input: unknown = body;

  if (fromProfile) {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      return NextResponse.json({ error: "Zaloguj się, żeby zapisać się z profilu." }, { status: 401 });
    }
    const prefs = (await getUserProfile())?.quiz_preferences;
    if (!prefs?.airports?.length || !prefs.budget) {
      return NextResponse.json({ error: "Zrób najpierw quiz, żebyśmy wiedzieli, skąd lecisz i za ile." }, { status: 400 });
    }
    const airports = prefs.airports.filter((c) => POLISH_CODES.has(c)).slice(0, DROP_MAX_AIRPORTS);
    input = { email: user.email, airports, max_price: budgetToMaxPrice(prefs.budget) };
  }

  const signup = normalizeSignup(input);
  if ("error" in signup) return NextResponse.json({ error: signup.error }, { status: 400 });

  const supabase = createServiceClient();
  const { data: existing } = await supabase
    .from("newsletter_subscribers")
    .select("verified, drop_disabled_reason, unsubscribe_token")
    .eq("email", signup.email)
    .maybeSingle();

  const action = decideSubscribeAction(existing, { fromProfile });
  const now = new Date().toISOString();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const mailOpts = { airports: signup.airports, maxPrice: signup.max_price };

  // Anonim zawsze dostaje { pending: true }, żeby nie dało się sprawdzić, kto jest zapisany.
  if (action === "blocked") return NextResponse.json({ pending: true });

  if (action === "send_manage_link" && existing) {
    // Potwierdzonego wiersza nie ruszamy; najwyżej dopisujemy brakujący token wypisu.
    let token = existing.unsubscribe_token;
    if (!token) {
      token = newUnsubscribeToken();
      const { error } = await supabase
        .from("newsletter_subscribers")
        .update({ unsubscribe_token: token })
        .eq("email", signup.email);
      if (error) return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
    }
    try {
      await sendDropManageLink(signup.email, buildSettingsUrl(appUrl, token));
    } catch (err) {
      console.error("[drop] failed to send manage link:", err);
    }
    return NextResponse.json({ pending: true });
  }

  if (action === "update_profile" && existing) {
    // Adres z zalogowanego konta uznajemy za potwierdzony
    const fields = buildSubscriberUpsert({ ...existing, verified: true }, signup);
    const { error } = await supabase
      .from("newsletter_subscribers")
      .update({ ...fields, verified: true, ...(existing.verified ? {} : { verified_at: now }) })
      .eq("email", signup.email);
    if (error) return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
    return NextResponse.json({ enabled: true });
  }

  if (action === "resend_verification") {
    // Niepotwierdzony: świeży token resetuje okno ważności linku
    const token = newVerificationToken();
    const { error } = await supabase
      .from("newsletter_subscribers")
      .update({ ...buildSubscriberUpsert(existing, signup), verification_token: token, token_sent_at: now })
      .eq("email", signup.email);
    if (error) return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
    try {
      await sendDropConfirmation(signup.email, newsletterVerifyUrl(token), mailOpts);
    } catch (err) {
      console.error("[drop] failed to send confirmation email:", err);
    }
    return NextResponse.json({ pending: true });
  }

  let promo: { code: string; stripePromoId: string };
  try {
    promo = await createNewsletterPromo();
  } catch {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
  }

  const token = newVerificationToken();
  const row = fromProfile
    ? { ...buildSubscriberUpsert({ verified: true, drop_disabled_reason: null, unsubscribe_token: null }, signup), verified: true, verified_at: now }
    : { ...buildSubscriberUpsert(null, signup), verified: false, verification_token: token, token_sent_at: now };

  const { error } = await supabase.from("newsletter_subscribers").insert({
    email: signup.email,
    discount_code: promo.code,
    stripe_promo_code_id: promo.stripePromoId,
    ...row,
  });
  if (error) return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });

  if (fromProfile) return NextResponse.json({ enabled: true });

  try {
    await sendDropConfirmation(signup.email, newsletterVerifyUrl(token), mailOpts);
  } catch (err) {
    console.error("[drop] failed to send confirmation email:", err);
  }
  return NextResponse.json({ pending: true });
}
