import { isMissingTableError } from "./adminStats";

// Dziennik zdarzeń zrzutu. Zawsze linia w logach ("[drop-event] {json}"), a gdy istnieje tabela
// drop_events (migracja 20261119000000), także trwały zapis. Bez adresów e-mail i pełnych linków.
export type DropEventType =
  | "consent_given"
  | "unsubscribed"
  | "settings_disabled"
  | "delivered"
  | "bounced"
  | "complained"
  | "delayed"
  | "failed"
  | "clicked"
  | "send_rejected"
  | "send_failed"
  | "send_uncertain"
  | "send_unrecorded"
  | "run_summary";

export interface DropEvent {
  event: DropEventType;
  week?: string | null;
  subscriber_id?: string | null;
  resend_id?: string | null;
  source_id?: string | null;
  detail?: Record<string, unknown>;
}

type Insertable = {
  from: (table: string) => {
    upsert: (
      rows: unknown[],
      opts: { onConflict: string; ignoreDuplicates: boolean },
    ) => PromiseLike<{ error: { code?: string; message: string } | null }>;
  };
};

const EMAIL_IN_TEXT = /[^\s@<>"',;]+@[^\s@<>"',;]+/g;

// Wolny tekst błędów (Resend, Postgres) może zawierać adres: maskujemy i skracamy.
export function scrubDetail(detail: Record<string, unknown> | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(detail ?? {})) {
    out[k] = typeof v === "string" ? v.replace(EMAIL_IN_TEXT, "[email]").slice(0, 300) : v;
  }
  return out;
}

// Nigdy nie rzuca: brak tabeli albo błąd bazy nie mogą zatrzymać wysyłki ani webhooka.
export async function logDropEvents(db: unknown, events: DropEvent[]): Promise<{ stored: boolean }> {
  if (events.length === 0) return { stored: true };
  events = events.map((e) => ({ ...e, detail: scrubDetail(e.detail) }));
  for (const e of events) console.log(`[drop-event] ${JSON.stringify(e)}`);
  try {
    const rows = events.map((e) => ({
      event: e.event,
      week: e.week ?? null,
      subscriber_id: e.subscriber_id ?? null,
      resend_id: e.resend_id ?? null,
      source_id: e.source_id ?? null,
      detail: e.detail,
    }));
    const { error } = await (db as Insertable)
      .from("drop_events")
      .upsert(rows, { onConflict: "source_id", ignoreDuplicates: true });
    if (error) {
      if (!isMissingTableError(error)) console.error("[drop-event] zapis nieudany", error.message);
      return { stored: false };
    }
    return { stored: true };
  } catch (err) {
    console.error("[drop-event] zapis nieudany", err);
    return { stored: false };
  }
}

export type ClickKind = "plan" | "price" | "settings" | "unsubscribe" | "other";

// Rodzaj klikniętego linku bez zapisywania adresu (w linkach są identyfikatory partnera i token).
export function classifyClickLink(link: unknown): ClickKind {
  if (typeof link !== "string") return "other";
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return "other";
  }
  if (url.pathname.startsWith("/quiz")) return "plan";
  if (url.pathname.startsWith("/api/drop/unsubscribe")) return "unsubscribe";
  if (url.pathname.startsWith("/zrzut/ustawienia")) return "settings";
  if (/aviasales|travelpayouts/i.test(url.hostname)) return "price";
  return "other";
}

const RESEND_MAP: Record<string, DropEventType> = {
  "email.delivered": "delivered",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.delivery_delayed": "delayed",
  "email.failed": "failed",
  "email.clicked": "clicked",
};

// Zdarzenie Resend -> zdarzenie zrzutu. Otwarcia (email.opened) pomijamy: nie są dowodem dostarczenia.
export function mapResendEvent(
  event: { type: string; data?: unknown },
  svixId: string | null,
): (DropEvent & { resend_id: string }) | null {
  const type = RESEND_MAP[event.type];
  if (!type) return null;
  const data = (event.data ?? {}) as { email_id?: unknown; click?: { link?: unknown }; bounce?: { type?: unknown } };
  if (typeof data.email_id !== "string" || !data.email_id) return null;
  const detail: Record<string, unknown> = {};
  if (type === "clicked") detail.link_kind = classifyClickLink(data.click?.link);
  if (type === "bounced" && typeof data.bounce?.type === "string") detail.bounce_type = data.bounce.type;
  return {
    event: type,
    resend_id: data.email_id,
    source_id: svixId ? `resend:${svixId}` : null,
    detail,
  };
}
