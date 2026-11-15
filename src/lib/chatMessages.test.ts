import { describe, it, expect } from "vitest";
import { parseChatMessages, CHAT_MESSAGE_MAX_CHARS, CHAT_HISTORY_MAX_CHARS } from "./chatMessages";

const msg = (role: string, text: unknown) => ({ role, parts: [{ text }] });

describe("parseChatMessages", () => {
  it("przepuszcza poprawną rozmowę zaczynającą się od użytkownika", () => {
    const input = [msg("user", "Hej"), msg("model", "Cześć"), msg("user", "Co zjeść?")];
    expect(parseChatMessages(input)).toEqual({ ok: true, messages: input });
  });

  it("odrzuca puste, nie-tablicowe i zbyt długie historie", () => {
    expect(parseChatMessages([]).ok).toBe(false);
    expect(parseChatMessages("x").ok).toBe(false);
    expect(parseChatMessages(Array.from({ length: 51 }, () => msg("user", "a"))).ok).toBe(false);
  });

  it("sprawdza KAŻDĄ wiadomość, nie tylko ostatnią", () => {
    const long = "a".repeat(CHAT_MESSAGE_MAX_CHARS + 1);
    expect(parseChatMessages([msg("user", long), msg("model", "ok"), msg("user", "hej")]).ok).toBe(false);
  });

  it("odrzuca nieznane role, złą strukturę i nie-tekstowe części", () => {
    expect(parseChatMessages([msg("system", "x")]).ok).toBe(false);
    expect(parseChatMessages([{ role: "user", parts: [] }]).ok).toBe(false);
    expect(parseChatMessages([msg("user", 5)]).ok).toBe(false);
    expect(parseChatMessages([{ role: "user", parts: [{ text: "a" }, { text: "b" }] }]).ok).toBe(false);
  });

  it("wymaga, by pierwsza wiadomość i ostatnia były od użytkownika", () => {
    expect(parseChatMessages([msg("model", "x"), msg("user", "y")]).ok).toBe(false);
    expect(parseChatMessages([msg("user", "x"), msg("model", "y")]).ok).toBe(false);
  });

  it("ogranicza łączny rozmiar historii", () => {
    const chunk = "a".repeat(CHAT_MESSAGE_MAX_CHARS);
    const n = Math.ceil(CHAT_HISTORY_MAX_CHARS / CHAT_MESSAGE_MAX_CHARS) + 1;
    const list = Array.from({ length: n }, (_, i) => msg(i % 2 === 0 ? "user" : "model", chunk));
    if (list.length % 2 === 0) list.pop();
    expect(parseChatMessages(list).ok).toBe(false);
  });
});
