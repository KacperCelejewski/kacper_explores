import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";

// Dotychczasowa wartość domyślna. Zostaje tylko do czasu ustawienia ADMIN_EMAIL na produkcji
// (Vercel → Environment Variables); wtedy usuń ten fallback.
const LEGACY_ADMIN_EMAIL = "hej@wloczykij.me";

let warned = false;

function adminEmail(): string {
  const configured = process.env.ADMIN_EMAIL?.trim();
  if (configured) return configured.toLowerCase();
  if (!warned) {
    warned = true;
    console.warn("[admin] ADMIN_EMAIL nie jest ustawiony: używam adresu domyślnego. Ustaw ADMIN_EMAIL w środowisku.");
  }
  return LEGACY_ADMIN_EMAIL;
}

type MaybeUser = { email?: string | null; email_confirmed_at?: string | null } | null | undefined;

export function isAdminUser(user: MaybeUser): boolean {
  if (!user?.email || !user.email_confirmed_at) return false;
  return user.email.trim().toLowerCase() === adminEmail();
}

// Wołaj na początku KAŻDEJ strony i trasy admina, przed jakimkolwiek odczytem kluczem serwisowym:
// layout nie jest granicą autoryzacji (strony potomne renderują się niezależnie).
export async function requireAdmin() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminUser(user)) redirect("/");
  return user;
}
