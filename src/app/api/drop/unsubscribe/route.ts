import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/validate";
import { buildSettingsUrl } from "@/lib/drop/links";

export const maxDuration = 60;

const TOKEN_RE = /^[A-Za-z0-9_-]{1,128}$/;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function page(title: string, body: string, status = 200): Response {
  const html = `<!doctype html>
<html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${esc(title)} | Włóczykij</title></head>
<body style="margin:0;background:#FFFBF7;color:#1A1A1A;font-family:system-ui,-apple-system,Segoe UI,sans-serif;">
<main style="max-width:420px;margin:0 auto;padding:64px 24px;">${body}</main></body></html>`;
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

const button = "display:inline-block;min-height:48px;padding:0 24px;border:0;border-radius:14px;background:#FF6B35;color:#fff;font-size:16px;font-weight:700;cursor:pointer;line-height:48px;text-decoration:none;";

// GET niczego nie zmienia: skanery poczty otwierają linki z maili, więc wypis wymaga kliknięcia (POST).
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const action = `/api/drop/unsubscribe?token=${encodeURIComponent(token)}`;
  return page(
    "Wypis ze zrzutu",
    `<h1 style="font-size:24px;margin:0 0 20px;">Wypisać Cię ze zrzutu?</h1>
<form method="post" action="${esc(action)}"><button type="submit" style="${button}">Wypisz mnie</button></form>`,
  );
}

// Dla nieznanego tokenu odpowiedź jest taka sama jak dla znanego.
export async function POST(req: NextRequest) {
  const rl = checkRateLimit(`drop-unsub:${getClientIp(req)}`, 30, 60 * 60 * 1000);
  if (!rl.allowed) return page("Wypis ze zrzutu", "<p>Za dużo prób. Spróbuj za godzinę.</p>", 429);

  const token = req.nextUrl.searchParams.get("token") ?? "";
  if (TOKEN_RE.test(token)) {
    // Skargi i odbicia zostają: nie nadpisujemy ich powodem "user"
    const { error } = await createServiceClient()
      .from("newsletter_subscribers")
      .update({ drop_enabled: false, drop_disabled_reason: "user" })
      .eq("unsubscribe_token", token)
      .or("drop_disabled_reason.is.null,drop_disabled_reason.eq.user");
    if (error) {
      console.error("[drop] unsubscribe failed:", error);
      return page("Wypis ze zrzutu", "<p>Coś poszło nie tak. Spróbuj jeszcze raz.</p>", 500);
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const settings = TOKEN_RE.test(token) ? buildSettingsUrl(appUrl, token) : appUrl;
  return page(
    "Wypisany",
    `<h1 style="font-size:24px;margin:0 0 20px;">Wypisany. Zrzut już nie przyjdzie.</h1>
<a href="${esc(settings)}" style="${button}">Jednak chcę</a>`,
  );
}
