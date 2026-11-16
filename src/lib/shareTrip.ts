import { cache } from "react";
import { createServiceClient } from "@/lib/supabase/service";
import { buildShareOgModel, type ShareOgModel } from "@/lib/shareOg";

export type ShareLookup =
  | { status: "found"; model: ShareOgModel }
  // Zapytanie przeszło, ale planu nie ma albo nie jest publiczny
  | { status: "missing" }
  // Awaria bazy: nie wiemy, więc nie wolno ogłaszać 404
  | { status: "unknown" };

// Jedno zapytanie na żądanie dla strony, metadanych i obrazka podglądu (React cache).
// Publiczny jest tylko plan z is_public = true; to samo robi /api/share/[tripId].
export const lookupPublicTrip = cache(async (tripId: string): Promise<ShareLookup> => {
  if (!tripId || tripId.length > 120) return { status: "missing" };
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("trips")
      .select("city, country, ai_plan_json, quiz_answers")
      .eq("id", tripId)
      .eq("is_public", true)
      .maybeSingle();
    if (error) return { status: "unknown" };
    const model = buildShareOgModel(data);
    return model ? { status: "found", model } : { status: "missing" };
  } catch {
    return { status: "unknown" };
  }
});
