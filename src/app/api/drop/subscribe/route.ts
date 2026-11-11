import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/userProfile";
import { sendNewsletterConfirmation } from "@/lib/email";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/validate";
import { createNewsletterPromo, newVerificationToken, newsletterVerifyUrl } from "@/lib/newsletter";
import { buildSubscriberUpsert, budgetToMaxPrice, normalizeSignup, DROP_MAX_AIRPORTS } from "@/lib/drop/signup";
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

  const fields = buildSubscriberUpsert(existing, signup);
  const now = new Date().toISOString();

  if (existing) {
    if (existing.verified) {
      const { error } = await supabase.from("newsletter_subscribers").update(fields).eq("email", signup.email);
      if (error) return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
      return NextResponse.json({ enabled: true });
    }
    if (fromProfile) {
      // Adres z zalogowanego konta uznajemy za potwierdzony
      const { error } = await supabase
        .from("newsletter_subscribers")
        .update({ ...buildSubscriberUpsert({ ...existing, verified: true }, signup), verified: true, verified_at: now })
        .eq("email", signup.email);
      if (error) return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
      return NextResponse.json({ enabled: true });
    }
    // Niepotwierdzony: świeży token resetuje okno ważności linku
    const token = newVerificationToken();
    const { error } = await supabase
      .from("newsletter_subscribers")
      .update({ ...fields, verification_token: token, token_sent_at: now })
      .eq("email", signup.email);
    if (error) return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
    try {
      await sendNewsletterConfirmation(signup.email, newsletterVerifyUrl(token));
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
    : { ...fields, verified: false, verification_token: token, token_sent_at: now };

  const { error } = await supabase.from("newsletter_subscribers").insert({
    email: signup.email,
    discount_code: promo.code,
    stripe_promo_code_id: promo.stripePromoId,
    ...row,
  });
  if (error) return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });

  if (fromProfile) return NextResponse.json({ enabled: true });

  try {
    await sendNewsletterConfirmation(signup.email, newsletterVerifyUrl(token));
  } catch (err) {
    console.error("[drop] failed to send confirmation email:", err);
  }
  return NextResponse.json({ pending: true });
}
