import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { sendSlack } from "@/lib/slack";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = url.searchParams.get("next") ?? "/";

  const redirectUrl = new URL(next, req.url);

  if (code || (token_hash && type)) {
    const response = NextResponse.redirect(redirectUrl);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    if (code) {
      await supabase.auth.exchangeCodeForSession(code);
    } else if (token_hash && type) {
      await supabase.auth.verifyOtp({ token_hash, type });
    }

    // Notify on new registration (created_at within last 60s)
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.created_at) {
      const ageSeconds = (Date.now() - new Date(user.created_at).getTime()) / 1000;
      if (ageSeconds < 60) {
        void sendSlack(`🎉 *Nowy użytkownik!*\n${user.email}`);
      }
    }

    return response;
  }

  return NextResponse.redirect(redirectUrl);
}
