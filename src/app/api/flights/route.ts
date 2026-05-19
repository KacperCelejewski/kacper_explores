import { NextResponse } from "next/server";

// Deprecated — use /api/destinations instead
export function POST() {
  return NextResponse.json({ error: "Endpoint deprecated. Use /api/destinations." }, { status: 410 });
}
