import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_FEEDBACK_DB_ID =
  process.env.NOTION_FEEDBACK_DB_ID ?? "b661760146c1476793f5857d9c4a8490";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tripId, type, rating, text, city, source, answers } = body;

    if (!tripId || !rating) {
      return NextResponse.json({ error: "Brakuje wymaganych pól" }, { status: 400 });
    }

    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Zapisz do Notion (jeśli skonfigurowany token)
    if (NOTION_TOKEN) {
      await saveToNotion({ tripId, type, rating, text, city, source, answers, userId: user?.id });
    }

    // Pełny feedback → +1 kredyt
    let creditAdded = false;
    if (type === "full" && user) {
      const { error } = await supabase.rpc("add_credits", {
        p_user_id: user.id,
        p_credits: 1,
      });
      if (!error) creditAdded = true;
    }

    return NextResponse.json({ success: true, creditAdded });
  } catch (err) {
    console.error("[feedback]", err);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}

async function saveToNotion(data: {
  tripId: string;
  type?: string;
  rating: string;
  text?: string;
  city?: string;
  source?: string;
  answers?: Record<string, string>;
  userId?: string;
}) {
  const sentiment =
    data.rating === "up"
      ? "😍 Pozytywny"
      : data.rating === "down"
      ? "😡 Negatywny"
      : "😐 Neutralny";

  const sourceMap: Record<string, string> = {
    instagram: "Instagram DM",
    friend: "Bezpośrednio",
    google: "Web (formularz)",
    whatsapp: "WhatsApp",
    other: "Bezpośrednio",
  };
  const notionSource = data.source
    ? (sourceMap[data.source] ?? "Web (formularz)")
    : "Web (formularz)";

  const parts: string[] = [];
  if (data.text) parts.push(data.text);
  if (data.answers?.liked) parts.push(`Podobało się: ${data.answers.liked}`);
  if (data.answers?.improve) parts.push(`Do poprawy: ${data.answers.improve}`);
  if (data.city) parts.push(`Miasto: ${data.city}`);
  const content = parts.join("\n") || `Rating: ${data.rating} | Trip: ${data.tripId}`;

  try {
    await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NOTION_TOKEN}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        parent: { database_id: NOTION_FEEDBACK_DB_ID },
        properties: {
          Treść: {
            title: [{ text: { content: content.slice(0, 2000) } }],
          },
          Sentyment: { select: { name: sentiment } },
          Źródło: { select: { name: notionSource } },
          Data: { date: { start: new Date().toISOString().split("T")[0] } },
        },
      }),
    });
  } catch (err) {
    // Nie przerywaj flow jeśli Notion padnie
    console.error("[feedback/notion]", err);
  }
}
