import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(req: NextRequest) {
  try {
    const { session_id, event, step } = await req.json() as {
      session_id: string;
      event: string;
      step?: number;
    };

    if (!session_id || !event) {
      return NextResponse.json({}, { status: 400 });
    }

    // quiz_events ma RLS bez polityk: zapisuje tylko klucz serwisowy
    await createServiceClient().from("quiz_events").insert({ session_id, event, step: step ?? null });
  } catch {
    // Tracking errors are silent — never block the user
  }

  return NextResponse.json({});
}
