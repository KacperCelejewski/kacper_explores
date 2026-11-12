import { createSupabaseServer } from "@/lib/supabase/server";
import { plansAvailable } from "@/lib/credits";
import type { QuizAnswers } from "@/types";

export interface UserProfile {
  id: string;
  credits_remaining: number;
  free_plans_used: number;
  free_plans_period: string | null;
  subscription_tier: "free" | "pro";
  subscription_expires_at: string | null;
  stripe_customer_id: string | null;
  quiz_preferences: QuizAnswers | null;
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return data as UserProfile | null;
}

export function isPro(profile: UserProfile): boolean {
  if (profile.subscription_tier !== "pro") return false;
  if (!profile.subscription_expires_at) return false;
  return new Date(profile.subscription_expires_at) > new Date();
}

export function canGenerate(profile: UserProfile): boolean {
  return isPro(profile) || plansAvailable(profile) > 0;
}
