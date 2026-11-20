import { describe, it, expect, vi, beforeEach } from "vitest";

const gemini = vi.hoisted(() => ({
  prompts: [] as string[],
  // Odpowiedź atrapy; test może ją podmienić, domyślnie jedno miasto.
  response: { destinations: [{ city: "Porto", country: "Portugalia", description: "Plaże i narty biegowe." }] } as unknown,
}));

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel() {
      return {
        generateContent: async (prompt: string) => {
          gemini.prompts.push(prompt);
          return { response: { text: () => JSON.stringify(gemini.response) } };
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
  gemini.response = { destinations: [{ city: "Porto", country: "Portugalia", description: "Plaże i narty biegowe." }] };
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

  it("przyjmuje poprawne nowe pola; region i transport nie zmieniają promptu (zakres P7 i P9), rodzaj wyjazdu tak", async () => {
    const plain = await post({ ...quiz, month: 8 });
    expect(plain.status).toBe(200);
    const withFields = await post({ ...quiz, month: 8, regions: ["azja"], transport: ["auto"] });
    expect(withFields.status).toBe(200);
    expect(gemini.prompts).toHaveLength(2);
    expect(gemini.prompts[1]).toBe(gemini.prompts[0]);
    const withTrip = await post({ ...quiz, month: 8, tripType: "plaza" });
    expect(withTrip.status).toBe(200);
    expect(gemini.prompts[2]).toMatch(/RODZAJ WYJAZDU: Plaża/);
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
    gemini.response = { destinations: [{ city: "Zakopane", country: "Polska", description: "Ośrodek narciarski, wyciągi." }] };
    await post({ ...q, tripType: "narty" });
    await post({ ...q, transport: ["rower"] });
    expect(gemini.prompts).toHaveLength(4);
  });
});

describe("POST /api/destinations: rodzaj wyjazdu", () => {
  const skiQuiz = { ...quiz, month: 1, tripType: "narty" };
  const ski = { city: "Zakopane", country: "Polska", description: "Ośrodek narciarski pod Tatrami, wyciągi na Kasprowy.", highlights: ["Trasy zjazdowe", "Karnet", "Schroniska przy stoku"] };
  const praga = { city: "Praga", country: "Czechy", description: "Stare Miasto, mosty i piwo.", highlights: ["Most Karola", "Zamek", "Rynek"] };

  it("narty: prompt żąda ośrodków z wyciągami i zabrania miast do zwiedzania", async () => {
    gemini.response = { destinations: [ski] };
    await post(skiQuiz);
    expect(gemini.prompts[0]).toMatch(/RODZAJ WYJAZDU: Narty/);
    expect(gemini.prompts[0]).toMatch(/WYŁĄCZNIE miejscowości z ośrodkiem narciarskim/);
    expect(gemini.prompts[0]).not.toMatch(/UWAGA, termin nie pasuje/);
  });

  it("narty: odpowiedź filtrowana, zostają tylko miejsca z infrastrukturą narciarską", async () => {
    gemini.response = { destinations: [ski, praga] };
    const res = await post({ ...skiQuiz, styles: ["history"] });
    expect((await res.json()).destinations.map((d: { city: string }) => d.city)).toEqual(["Zakopane"]);
  });

  it("narty: miasto wybrane przez użytkownika zostaje mimo filtra", async () => {
    gemini.response = { destinations: [praga, ski] };
    const res = await post({ ...skiQuiz, styles: ["food"], preferredCity: "Praga" });
    expect((await res.json()).destinations.map((d: { city: string }) => d.city)).toEqual(["Praga", "Zakopane"]);
  });

  it("narty: gdy żaden kierunek nie pasuje, 200 z pustą listą (nie 503) i bez zapisu do cache", async () => {
    gemini.response = { destinations: [praga] };
    const q = { ...skiQuiz, styles: ["nature"] };
    const res = await post(q);
    expect(res.status).toBe(200);
    expect((await res.json()).destinations).toEqual([]);
    expect(gemini.prompts).toHaveLength(2); // oba modele próbowane
    await post(q);
    expect(gemini.prompts).toHaveLength(4); // pusta lista nie trafia do cache
  });

  it("narty w lipcu: prompt ostrzega o terminie i dopuszcza krótszą listę", async () => {
    gemini.response = { destinations: [ski] };
    await post({ ...skiQuiz, month: 7, styles: ["beach"] });
    expect(gemini.prompts[0]).toMatch(/UWAGA, termin nie pasuje/);
    expect(gemini.prompts[0]).toMatch(/zwróć mniej/);
  });

  it("zwiedzanie jawnie wybrane działa jak brak odpowiedzi: ten sam prompt i brak filtra", async () => {
    gemini.response = { destinations: [praga] };
    const a = await post({ ...quiz, month: 2, styles: ["history"] });
    const b = await post({ ...quiz, month: 2, styles: ["history"], tripType: "zwiedzanie" });
    expect((await a.json()).destinations).toHaveLength(1);
    expect((await b.json()).destinations).toHaveLength(1);
    expect(gemini.prompts).toHaveLength(1); // ten sam klucz cache
    expect(gemini.prompts[0]).not.toMatch(/RODZAJ WYJAZDU/);
  });
});
