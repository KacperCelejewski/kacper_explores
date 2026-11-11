import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase/service";
import { isHardDisabled, DROP_MAX_PRICES } from "@/lib/drop/signup";
import DropSettingsForm from "./DropSettingsForm";

export const metadata: Metadata = {
  title: "Ustawienia zrzutu | Włóczykij",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function DropSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const raw = (await searchParams).token;
  const token = typeof raw === "string" ? raw : "";

  const { data: row } = token
    ? await createServiceClient()
        .from("newsletter_subscribers")
        .select("airports, max_price, drop_enabled, drop_disabled_reason, verified")
        .eq("unsubscribe_token", token)
        .maybeSingle()
    : { data: null };

  return (
    <main className="max-w-md mx-auto px-6 py-16">
      <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "var(--font-heading)" }}>
        Ustawienia zrzutu
      </h1>
      {row ? (
        <DropSettingsForm
          token={token}
          initial={{
            airports: row.airports ?? [],
            maxPrice: DROP_MAX_PRICES.find((p) => p === row.max_price) ?? 300,
            enabled: !!row.drop_enabled,
            verified: !!row.verified,
            hardDisabled: isHardDisabled(row.drop_disabled_reason),
          }}
        />
      ) : (
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
          Ten link jest nieaktualny. Najnowszy znajdziesz w ostatnim zrzucie.
        </p>
      )}
    </main>
  );
}
