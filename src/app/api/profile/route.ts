import { NextResponse } from "next/server";
import { getUserProfile, canGenerate, isPro } from "@/lib/userProfile";

export async function GET() {
  const profile = await getUserProfile();
  if (!profile) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    credits_remaining: profile.credits_remaining,
    subscription_tier: profile.subscription_tier,
    is_pro: isPro(profile),
    can_generate: canGenerate(profile),
  });
}
