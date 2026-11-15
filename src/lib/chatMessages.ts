export interface ChatMessage {
  role: "user" | "model";
  parts: [{ text: string }];
}

export const CHAT_MAX_MESSAGES = 50;
export const CHAT_MESSAGE_MAX_CHARS = 2000;
// Odpowiedzi modelu wracają z klienta w historii, więc dostają luźniejszy limit niż pytania
export const CHAT_MODEL_MESSAGE_MAX_CHARS = 6000;
export const CHAT_HISTORY_MAX_CHARS = 20_000;

type Parsed = { ok: true; messages: ChatMessage[] } | { ok: false; error: string };

/** Waliduje całą historię czatu z klienta (struktura, role, długość każdej wiadomości i suma). */
export function parseChatMessages(input: unknown): Parsed {
  if (!Array.isArray(input) || input.length === 0) return { ok: false, error: "Brak wymaganych pól." };
  if (input.length > CHAT_MAX_MESSAGES) return { ok: false, error: "Historia rozmowy jest zbyt długa." };

  let total = 0;
  const messages: ChatMessage[] = [];
  for (const raw of input) {
    const m = raw as { role?: unknown; parts?: unknown };
    if (m?.role !== "user" && m?.role !== "model") return { ok: false, error: "Nieprawidłowy format." };
    if (!Array.isArray(m.parts) || m.parts.length !== 1) return { ok: false, error: "Nieprawidłowy format." };
    const text = (m.parts[0] as { text?: unknown })?.text;
    if (typeof text !== "string" || text.length === 0) return { ok: false, error: "Nieprawidłowy format." };
    const max = m.role === "user" ? CHAT_MESSAGE_MAX_CHARS : CHAT_MODEL_MESSAGE_MAX_CHARS;
    if (text.length > max) {
      return { ok: false, error: `Za długa wiadomość. Zmieść się w ${CHAT_MESSAGE_MAX_CHARS} znaków.` };
    }
    total += text.length;
    messages.push({ role: m.role, parts: [{ text }] });
  }
  if (total > CHAT_HISTORY_MAX_CHARS) return { ok: false, error: "Historia rozmowy jest zbyt długa." };
  // Gemini odrzuca historię niezaczynającą się od użytkownika, a ostatnia wiadomość ma być pytaniem
  if (messages[0].role !== "user" || messages[messages.length - 1].role !== "user") {
    return { ok: false, error: "Nieprawidłowy format." };
  }
  return { ok: true, messages };
}
