import { describe, it, expect, vi, beforeEach } from "vitest";

// Atrapa Gemini: kolejne wywołania (modele) zwracają kolejne odpowiedzi z kolejki, jako NDJSON.
const mock = vi.hoisted(() => ({
  replies: [] as string[],
  models: [] as string[],
  prompts: [] as string[],
  inserted: [] as Array<Record<string, unknown>>,
}));

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel({ model }: { model: string }) {
      return {
        generateContentStream: async (prompt: string) => {
          mock.models.push(model);
          mock.prompts.push(prompt);
          const text = mock.replies.shift() ?? "";
          return {
            stream: (async function* () { yield { text: () => text }; })(),
            response: Promise.resolve({ usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1 } }),
          };
        },
      };
    }
  },
}));
vi.mock("@/lib/geminiLog", () => ({ logGeminiCall: async () => {} }));
vi.mock("@/lib/aiGuard", () => ({ guardGlobalFuse: async () => null }));
vi.mock("@/lib/userProfile", () => ({
  getUserProfile: async () => ({ id: "u1", subscription_tier: "pro", subscription_expires_at: "2999-01-01T00:00:00Z" }),
  canGenerate: () => true,
  isPro: () => true,
}));
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    rpc: async () => ({ data: "free", error: null }),
    from: () => ({ insert: async (row: Record<string, unknown>) => { mock.inserted.push(row); return { error: null }; } }),
  }),
}));

import { POST } from "./route";

const line = (o: object) => JSON.stringify(o);
const header = (extra: object = {}) => line({ type: "header", city: "Zakopane", country: "Polska", duration: 2, totalBudgetEstimate: "1000 PLN", budgetBreakdown: { flights: "", accommodation: "", food: "", attractions: "" }, generalTips: [], ...extra });
const act = (title: string, type = "attraction") => ({ time: "10:00", title, description: "", type, cost: "Free", location: "x", emoji: "x" });
const day = (n: number, theme: string, ...activities: object[]) => line({ type: "day", day: n, date: `Dzień ${n}`, theme, activities });

const skiReply = [header({ tripType: "narty" }), day(1, "Wypożyczalnia i karnet", act("Wypożyczalnia sprzętu narciarskiego"), act("Karnet na wyciąg")), day(2, "Cały dzień na stoku", act("Jazda na Kasprowym od otwarcia wyciągu"))].join("\n");
const krupowkiReply = [header({ tripType: "narty" }), day(1, "Krupówki", act("Spacer po Krupówkach"), act("Muzeum Tatrzańskie")), day(2, "Zabytki", act("Zwiedzanie Starego Miasta"), act("Katedra"))].join("\n");
const cityNoField = [header(), day(1, "Krupówki", act("Spacer po Krupówkach"), act("Muzeum Tatrzańskie")), day(2, "Zabytki", act("Zwiedzanie Starego Miasta"), act("Katedra"))].join("\n");

const quiz = { budget: "low", vibe: "active", styles: ["nature"], placeType: null, month: 1, duration: 2, airports: ["WRO"], companion: "solo" };
let n = 0;
const post = async (quizAnswers: object) => {
  const res = await POST(new Request("http://x/api/generate", {
    method: "POST",
    body: JSON.stringify({ destination: { city: "Zakopane", country: "Polska" }, quizAnswers, flightDetails: null }),
    headers: { "x-forwarded-for": `203.0.113.${(n += 1)}` },
  }) as never);
  const lines = (await res.text()).split("\n").filter(Boolean).map((l) => JSON.parse(l));
  return { status: res.status, done: lines.find((l) => l.done) as { plan: { tripType?: string; days: Array<{ theme: string }> } } | undefined, lines };
};

beforeEach(() => {
  process.env.GEMINI_API_KEY = "dummy";
  mock.replies.length = 0;
  mock.models.length = 0;
  mock.prompts.length = 0;
  mock.inserted.length = 0;
});

describe("POST /api/generate: rodzaj wyjazdu", () => {
  it("narty: prompt zawiera blok o stoku i wymaga pola tripType w nagłówku", async () => {
    mock.replies.push(skiReply);
    await post({ ...quiz, tripType: "narty" });
    expect(mock.prompts[0]).toMatch(/jeździe na nartach/);
    expect(mock.prompts[0]).toContain('"header","tripType":"narty"');
  });

  it("narty: plan zbudowany wokół stoku przechodzi bez ponawiania i zapisuje tripType", async () => {
    mock.replies.push(skiReply);
    const { done } = await post({ ...quiz, tripType: "narty" });
    expect(mock.models).toHaveLength(1);
    expect(done?.plan.tripType).toBe("narty");
    expect(done?.plan.days[1].theme).toBe("Cały dzień na stoku");
    expect(mock.inserted[0].ai_plan_json).toMatchObject({ tripType: "narty" });
  });

  it("narty: plan z programem zwiedzania miasta jest odrzucany i generowany ponownie innym modelem", async () => {
    mock.replies.push(krupowkiReply, skiReply);
    const { done } = await post({ ...quiz, tripType: "narty" });
    expect(mock.models).toEqual(["gemini-2.5-flash-lite", "gemini-2.5-flash"]);
    expect(done?.plan.days.map((d) => d.theme)).toEqual(["Wypożyczalnia i karnet", "Cały dzień na stoku"]);
    expect(done?.plan.days.some((d) => /Krupówki/.test(d.theme))).toBe(false);
  });

  it("narty: gdy każdy model zignoruje rodzaj, użytkownik dostaje pierwszy plan zamiast błędu (kredyt nie przepada)", async () => {
    mock.replies.push(krupowkiReply, krupowkiReply, krupowkiReply);
    const { done, lines } = await post({ ...quiz, tripType: "narty" });
    expect(lines.some((l) => l.error)).toBe(false);
    expect(done).toBeDefined();
    expect(done?.plan.tripType).toBe("narty");
  });

  it("narty: brak pola tripType w odpowiedzi nie jest błędem, serwer je uzupełnia", async () => {
    const withoutField = [header(), day(1, "Stok", act("Jazda na nartach")), day(2, "Wyciąg", act("Karnet i wyciąg"))].join("\n");
    mock.replies.push(withoutField);
    const { done } = await post({ ...quiz, tripType: "narty" });
    expect(mock.models).toHaveLength(1);
    expect(done?.plan.tripType).toBe("narty");
  });

  it("zwiedzanie i brak rodzaju: bez kontroli, bez ponawiania i bez pola tripType w planie", async () => {
    for (const q of [quiz, { ...quiz, tripType: "zwiedzanie" }]) {
      mock.models.length = 0;
      mock.replies.push(cityNoField);
      const { done } = await post(q);
      expect(mock.models).toHaveLength(1);
      expect(done?.plan.tripType).toBeUndefined();
      expect(mock.prompts.at(-1)).not.toMatch(/RODZAJ WYJAZDU/);
    }
  });
});
