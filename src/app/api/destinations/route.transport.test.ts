import { describe, it, expect, vi, beforeEach } from "vitest";

const gemini = vi.hoisted(() => ({ prompts: [] as string[], reply: "" as string, fail: false }));

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel() {
      return {
        generateContent: async (prompt: string) => {
          gemini.prompts.push(prompt);
          if (gemini.fail) throw new Error("503 overloaded");
          return { response: { text: () => gemini.reply } };
        },
      };
    }
  },
}));
vi.mock("@/lib/geminiLog", () => ({ logGeminiCall: async () => {} }));

import { POST } from "./route";

const quiz = { budget: "low", vibe: "chill", styles: ["food"], placeType: null, month: 6, duration: 3, airports: ["WRO"], companion: "solo" };
let n = 100;
const post = (body: unknown) =>
  POST(new Request("http://x/api/destinations", {
    method: "POST", body: JSON.stringify(body), headers: { "x-forwarded-for": `203.0.113.${(n += 1)}` },
  }) as never);
const unique = (extra: object, month: number) => ({ ...quiz, month, ...extra });

beforeEach(() => {
  process.env.GEMINI_API_KEY = "dummy";
  gemini.prompts.length = 0;
  gemini.fail = false;
  gemini.reply = JSON.stringify({ destinations: [{ city: "Prague", description: "Opis modelu.", tags: ["history", "nonsense"], highlights: ["a", "b", "c"], budgetLevel: "low" }, { city: "Atlantyda" }, { city: "Brno" }] });
});

describe("POST /api/destinations: transport lądowy", () => {
  it("auto: model dostaje listę miejsc w zasięgu z czasem dojazdu, bez pytania o loty", async () => {
    const res = await post(unique({ transport: ["auto"] }, 1));
    expect(res.status).toBe(200);
    const prompt = gemini.prompts[0];
    expect(prompt).toContain("WYBIERZ WYŁĄCZNIE Z TEJ LISTY");
    expect(prompt).toMatch(/- Praga \(Czechy\): auto ok\. [\d,]+ h/);
    expect(prompt).not.toMatch(/lotnisko wylotu|NIE proponuj jako celu miast wylotu/);
    expect(prompt).not.toContain("z lotem");
    expect(prompt).not.toContain("Dubrownik"); // poza zasięgiem weekendu
  });

  it("odpowiedź to tylko miejsca z listy, z naszym dojazdem, nazwami i uzupełnieniem do 6", async () => {
    const res = await post(unique({ transport: ["auto"] }, 2));
    const { destinations } = await res.json();
    expect(destinations).toHaveLength(6);
    expect(destinations.map((d: { city: string }) => d.city)).toEqual(expect.arrayContaining(["Praga", "Brno"]));
    expect(destinations.map((d: { city: string }) => d.city)).not.toContain("Atlantyda");
    expect(destinations[0]).toMatchObject({ city: "Praga", country: "Czechy", description: "Opis modelu.", tags: ["history"] });
    for (const d of destinations) {
      expect(d.travel).toHaveLength(1);
      expect(d.travel[0]).toMatchObject({ mode: "auto" });
      expect(d.travel[0].hours).toBeLessThanOrEqual(10);
      expect(d.flightSearchUrl).toBeUndefined();
      expect(d.bestOffer).toBeUndefined();
    }
  });

  it("rower: tylko miejsca w odległości dnia jazdy", async () => {
    const res = await post(unique({ transport: ["rower"] }, 3));
    const { destinations } = await res.json();
    expect(destinations.length).toBeGreaterThan(0);
    for (const d of destinations) {
      expect(d.travel.map((t: { mode: string }) => t.mode)).toEqual(["rower"]);
      expect(d.travel[0].hours).toBeLessThanOrEqual(8);
    }
  });

  it("brak miejsc w zasięgu: pusta lista z komunikatem i bez wywołania modelu", async () => {
    // start, którego nie znamy jako miasta w Polsce (hub zagraniczny): nie zgadujemy odległości
    const none = await post(unique({ transport: ["rower"], airports: ["BER"] }, 5));
    expect(none.status).toBe(200);
    const body = await none.json();
    expect(gemini.prompts).toHaveLength(0);
    expect(body.destinations).toEqual([]);
    expect(body.note).toMatch(/W zasięgu wybranych środków/);
  });

  it("przeciążony model: lista z naszymi opisami zamiast błędu 503", async () => {
    gemini.fail = true;
    const res = await post(unique({ transport: ["pociag_bus"] }, 6));
    expect(res.status).toBe(200);
    const { destinations } = await res.json();
    expect(destinations).toHaveLength(6);
    expect(destinations[0].description).toBeTruthy();
  });

  it("samolot z autem: prompt lotów z dopiskiem o miejscach w zasięgu, loty zostają", async () => {
    gemini.reply = JSON.stringify({ destinations: [{ city: "Praga", country: "Czechy" }, { city: "Lizbona", country: "Portugalia" }] });
    const res = await post(unique({ transport: ["samolot", "auto"] }, 7));
    const prompt = gemini.prompts[0];
    expect(prompt).toContain("lotnisko wylotu: WRO");
    expect(prompt).toContain("dopuszcza też dojazd bez samolotu");
    const { destinations } = await res.json();
    expect(destinations.find((d: { city: string }) => d.city === "Praga").travel[0].mode).toBe("auto");
    expect(destinations.find((d: { city: string }) => d.city === "Lizbona").travel).toBeUndefined();
  });

  it("sam samolot i brak transportu: prompt bez zmian względem lotów, bez dojazdu", async () => {
    await post(unique({}, 8));
    await post(unique({ transport: ["samolot"] }, 9));
    expect(gemini.prompts[0].replace(/Miesiąc: .*/, "")).toBe(gemini.prompts[1].replace(/Miesiąc: .*/, ""));
    expect(gemini.prompts[0]).not.toContain("dopuszcza też dojazd");
  });
});

describe("POST /api/destinations: transport lądowy z regionem i rodzajem wyjazdu", () => {
  it("region spoza zasięgu lądowego (Azja + auto): pusta lista z komunikatem, bez pytania modelu", async () => {
    const res = await post(unique({ transport: ["auto"], regions: ["azja"] }, 2));
    const data = await res.json();
    expect(data.destinations).toEqual([]);
    expect(data.note).toBeTruthy();
    expect(gemini.prompts).toHaveLength(0);
  });
  it("region Europa + auto: lista w zasięgu jak bez regionu, z naszym dojazdem", async () => {
    const res = await post(unique({ transport: ["auto"], regions: ["europa"] }, 3));
    const data = await res.json();
    expect(data.destinations.length).toBeGreaterThan(0);
    expect(data.destinations.every((d: { travel?: unknown[] }) => d.travel && d.travel.length > 0)).toBe(true);
  });
  it("rodzaj wyjazdu narty + auto: prompt niesie blok rodzaju, a lista zostaje tylko z miejsc opisanych przez model jako narciarskie", async () => {
    gemini.reply = JSON.stringify({ destinations: [
      { city: "Zakopane", description: "Ośrodek narciarski z wyciągami na Kasprowym Wierchu.", highlights: ["stoki", "wyciągi", "narty"] },
      { city: "Praga", description: "Miasto do zwiedzania.", highlights: ["Most Karola", "piwo", "Zamek"] },
    ] });
    const res = await post(unique({ transport: ["auto"], tripType: "narty" }, 4));
    expect(gemini.prompts[0]).toMatch(/RODZAJ WYJAZDU: Narty/);
    const data = await res.json();
    expect(data.destinations.map((d: { city: string }) => d.city)).toEqual(["Zakopane"]);
  });
});
