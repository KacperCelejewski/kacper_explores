import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import ShareClient from "./ShareClient";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function generateMetadata(
  { params }: { params: Promise<{ tripId: string }> }
): Promise<Metadata> {
  const { tripId } = await params;

  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("trips")
      .select("city, country, ai_plan_json")
      .eq("id", tripId)
      .maybeSingle();

    if (data?.city) {
      const plan = data.ai_plan_json as { duration?: number; totalBudgetEstimate?: string } | null;
      const duration = plan?.duration;
      const budget = plan?.totalBudgetEstimate;
      const title = duration && budget
        ? `${duration} dni w ${data.city} za ${budget}`
        : `Plan podróży do ${data.city}`;
      const description = `Plan podróży do ${data.city}, ${data.country} wygenerowany przez Włóczykij — budżetowe podróże solo z AI.`;

      return {
        title,
        description,
        openGraph: {
          title: `${title} | Włóczykij`,
          description,
          url: `https://wloczykij.me/share/${tripId}`,
        },
        twitter: {
          card: "summary_large_image",
          title: `${title} | Włóczykij`,
          description,
        },
      };
    }
  } catch {
    // fallback to default metadata
  }

  return {
    title: "Plan podróży",
    description: "Plan podróży wygenerowany przez Włóczykij — budżetowe podróże solo z AI.",
  };
}

export default function SharePage() {
  return <ShareClient />;
}
