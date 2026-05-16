import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  const supabase = serviceClient();

  const { data, error } = await supabase
    .from("trips")
    .select("id, city, country, destination_data, quiz_answers, created_at")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ trips: data ?? [] });
}
