import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;

  if (!tripId || tripId.length > 120) {
    return NextResponse.json({ error: "Invalid trip ID." }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("trips")
    .select("id, city, country, ai_plan_json, destination_data")
    .eq("id", tripId)
    .eq("is_public", true)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Trip not found." }, { status: 404 });
  }

  return NextResponse.json({
    id: data.id,
    city: data.city,
    country: data.country,
    plan: data.ai_plan_json,
    destination: data.destination_data ?? null,
  });
}
