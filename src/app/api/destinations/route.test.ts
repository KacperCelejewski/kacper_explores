import { describe, it, expect, vi, beforeEach } from "vitest";

const gemini = vi.hoisted(() => ({ prompts: [] as string[] }));

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel() {
      return {
        generateContent: async (prompt: string) => {
          gemini.prompts.push(prompt);
          return { response: { text: () => JSON.stringify({ destinations: [{ city: "Porto", country: "Portugalia" }] }) } };
        },
      };
    }
  },
}));
vi.mock("@/lib/geminiLog", () => ({ logGeminiCall: async () => {} }));

import { POST } from "./route";

const quiz = { budget: "low", vibe: "chill", styles: ["food"], placeType: "charming", month: 6, duration: 4, airports: ["WRO"] };
let n = 0;
const post = (body: unknown) =>
  POST(new Request("http://x/api/destinations", {
    method: "POST", body: JSON.stringify(body), headers: { "x-forwarded-for": `198.51.100.${(n += 1)}` },
  }) as never);

beforeEach(() => {
  process.env.GEMINI_API_KEY = "dummy";
  gemini.prompts.length = 0;
});

describe("POST /api/destinations: nowe pola quizu", () => {
  it("odrzuca nieznany region, rodzaj wyjazdu i transport (400, bez wywołania Gemini)", async () => {
    for (const bad of [{ regions: ["atlantyda"] }, { tripType: "kosmos" }, { transport: ["rakieta"] }]) {
      const res = await post({ ...quiz, ...bad });
      expect(res.status).toBe(400);
    }
    expect(gemini.prompts).toHaveLength(0);
  });

  it("stary quiz bez nowych pól działa jak dotąd", async () => {
    const res = await post({ ...quiz, month: 7 });
    expect(res.status).toBe(200);
    expect((await res.json()).destinations).toHaveLength(1);
    expect(gemini.prompts).toHaveLength(1);
  });

  it("przyjmuje poprawne nowe pola, ale prompt Gemini się nie zmienia (to zakres P7-P9)", async () => {
    const plain = await post({ ...quiz, month: 8 });
    expect(plain.status).toBe(200);
    const withFields = await post({ ...quiz, month: 8, regions: ["azja"], tripType: "narty", transport: ["auto"] });
    expect(withFields.status).toBe(200);
    expect(gemini.prompts).toHaveLength(2);
    expect(gemini.prompts[1]).toBe(gemini.prompts[0]);
  });

  it("cache serwera rozróżnia odpowiedzi różniące się nowymi polami", async () => {
    const q = { ...quiz, month: 9 };
    await post(q);
    await post(q);
    expect(gemini.prompts).toHaveLength(1); // ten sam quiz: trafienie w cache
    await post({ ...q, regions: ["europa"] });
    expect(gemini.prompts).toHaveLength(2); // inny region: nowe zapytanie
    await post({ ...q, regions: ["europa"] });
    expect(gemini.prompts).toHaveLength(2);
    await post({ ...q, tripType: "narty" });
    await post({ ...q, transport: ["rower"] });
    expect(gemini.prompts).toHaveLength(4);
  });
});
