import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!token || token.length !== 64) {
    return NextResponse.redirect(`${appUrl}/?newsletter=invalid`);
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("newsletter_subscribers")
    .select("id, discount_code, verified, created_at")
    .eq("verification_token", token)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.redirect(`${appUrl}/?newsletter=invalid`);
  }

  if (data.verified) {
    // Already verified — just show the code
    return NextResponse.redirect(`${appUrl}/?newsletter=verified&code=${data.discount_code}`);
  }

  // Check token age (48h expiry)
  const createdAt = new Date(data.created_at as string);
  const age = Date.now() - createdAt.getTime();
  if (age > 48 * 60 * 60 * 1000) {
    return NextResponse.redirect(`${appUrl}/?newsletter=expired`);
  }

  await supabase
    .from("newsletter_subscribers")
    .update({ verified: true, verified_at: new Date().toISOString() })
    .eq("id", data.id);

  return NextResponse.redirect(`${appUrl}/?newsletter=verified&code=${data.discount_code}`);
}
