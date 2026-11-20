import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const gemini = vi.hoisted(() => ({
  prompts: [] as string[],
  // Kolejka odpowiedzi atrapy; pusta = domyślne Porto.
  replies: [] as unknown[],
  // Atrapa zegara: każda odpowiedź Gemini "trwa" tyle ms (Date.now jest podmieniony w testach wolnej odpowiedzi).
  skewMs: 0,
  advancePerCallMs: 0,
}));

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel() {
      return {
        generateContent: async (prompt: string) => {
          gemini.prompts.push(prompt);
          gemini.skewMs += gemini.advancePerCallMs;
          const reply = gemini.replies.length > 0 ? gemini.replies.shift() : { destinations: [{ city: "Porto", country: "Portugalia" }] };
          return { response: { text: () => JSON.stringify(reply) } };
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
  gemini.replies.length = 0;
  gemini.skewMs = 0;
  gemini.advancePerCallMs = 0;
});

afterEach(() => vi.restoreAllMocks());

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

  it("przyjmuje poprawne nowe pola; transport nie zmienia promptu (zakres P9), region i rodzaj wyjazdu tak", async () => {
    const plain = await post({ ...quiz, month: 8 });
    expect(plain.status).toBe(200);
    const withFields = await post({ ...quiz, month: 8, transport: ["auto"] });
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
    // Komplet z Europy, żeby filtr regionu nie dopraszał o uzupełnienie (to osobny przypadek niżej).
    gemini.replies.push({ destinations: ["Porto", "Lizbona", "Rzym", "Wiedeń", "Praga", "Ateny"].map((c) => ({ city: c, country: "Portugalia" })) });
    await post({ ...q, regions: ["europa"] });
    expect(gemini.prompts).toHaveLength(2); // inny region: nowe zapytanie
    await post({ ...q, regions: ["europa"] });
    expect(gemini.prompts).toHaveLength(2);
    gemini.replies.push({ destinations: [{ city: "Zakopane", country: "Polska", description: "Ośrodek narciarski, wyciągi." }] });
    await post({ ...q, tripType: "narty" });
    await post({ ...q, transport: ["rower"] });
    expect(gemini.prompts).toHaveLength(4);
  });
});

const city = (c: string, country: string) => ({ city: c, country, countryFlag: "x", coverImage: "y", description: "d", tags: [], budgetLevel: "high", highlights: [] });
const southAmerica = [
  city("Buenos Aires", "Argentyna"), city("Rio de Janeiro", "Brazylia"), city("Cusco", "Peru"),
  city("Santiago", "Chile"), city("Cartagena", "Kolumbia"), city("Montevideo", "Urugwaj"),
];
const cities = async (res: Response) => ((await res.json()).destinations as { city: string }[]).map((d) => d.city);

describe("POST /api/destinations: region", () => {
  it("wybór Ameryki Południowej wpisuje region do promptu jako twarde ograniczenie", async () => {
    gemini.replies.push({ destinations: southAmerica });
    await post({ ...quiz, month: 1, regions: ["ameryka_poludniowa"], budget: "high" });
    expect(gemini.prompts[0]).toContain("TWARDE OGRANICZENIE");
    expect(gemini.prompts[0]).toContain("Ameryka Południowa");
    expect(gemini.prompts[0]).toContain('"high"');
  });

  it("zwraca wyłącznie kierunki z wybranego regionu", async () => {
    gemini.replies.push({ destinations: southAmerica });
    const res = await post({ ...quiz, month: 2, regions: ["ameryka_poludniowa"] });
    expect(res.status).toBe(200);
    expect(await cities(res)).toEqual(southAmerica.map((d) => d.city));
    expect(gemini.prompts).toHaveLength(1); // komplet z regionu: bez uzupełniania
  });

  it("odrzuca kierunek spoza regionu i uzupełnia go z powtórnego zapytania", async () => {
    gemini.replies.push({ destinations: [...southAmerica.slice(0, 4), city("Paryż", "Francja"), city("Nowy Jork", "USA")] });
    gemini.replies.push({ destinations: [city("Cusco", "Peru"), city("La Paz", "Boliwia"), city("Quito", "Ekwador"), city("Londyn", "Wielka Brytania")] });
    const res = await post({ ...quiz, month: 3, regions: ["ameryka_poludniowa"] });
    const names = await cities(res);
    expect(gemini.prompts).toHaveLength(2);
    expect(gemini.prompts[1]).toContain("POPRAWKA");
    expect(gemini.prompts[1]).toContain("Paryż");
    expect(names).toEqual(["Buenos Aires", "Rio de Janeiro", "Cusco", "Santiago", "La Paz", "Quito"]); // bez duplikatu Cusco
    expect(names).not.toContain("Paryż");
    expect(names).not.toContain("Nowy Jork");
    expect(names).not.toContain("Londyn");
  });

  it("gdy uzupełnienie zawodzi, zwraca tylko to, co pasuje (nigdy kierunków spoza regionu)", async () => {
    gemini.replies.push({ destinations: [city("Lima", "Peru"), city("Paryż", "Francja")] });
    gemini.replies.push({ destinations: [city("Rzym", "Włochy")] });
    const res = await post({ ...quiz, month: 4, regions: ["ameryka_poludniowa"] });
    expect(await cities(res)).toEqual(["Lima"]);
  });

  it("gdy nic nie pasuje do regionu, oddaje pustą listę, a nie kierunki z innego regionu", async () => {
    gemini.replies.push({ destinations: [city("Paryż", "Francja")] });
    gemini.replies.push({ destinations: [city("Rzym", "Włochy")] });
    gemini.replies.push({ destinations: [city("Madryt", "Hiszpania")] });
    gemini.replies.push({ destinations: [city("Lizbona", "Portugalia")] });
    const res = await post({ ...quiz, month: 5, regions: ["ameryka_poludniowa"] });
    expect(res.status).toBe(200);
    expect((await res.json()).destinations).toEqual([]);
  });

  it("wynik z regionu jest w cache serwera, a pusty wynik nie", async () => {
    const q = { ...quiz, month: 10, regions: ["azja"] };
    gemini.replies.push({ destinations: [city("Tokio", "Japonia"), city("Bangkok", "Tajlandia"), city("Hanoi", "Wietnam"), city("Seul", "Korea Południowa"), city("Kioto", "Japonia"), city("Osaka", "Japonia")] });
    await post(q);
    await post(q);
    expect(gemini.prompts).toHaveLength(1);
  });

  it("bez regionu odpowiedź nie jest filtrowana (zgodność wsteczna, także kraj spoza tabeli)", async () => {
    gemini.replies.push({ destinations: [city("Paryż", "Francja"), city("Narnia", "Narnia")] });
    const res = await post({ ...quiz, month: 11 });
    expect(await cities(res)).toEqual(["Paryż", "Narnia"]);
    expect(gemini.prompts).toHaveLength(1);
    expect(gemini.prompts[0]).not.toContain("TWARDE OGRANICZENIE");
    expect(gemini.prompts[0]).toContain('budgetLevel (string): "low" lub "medium"');
  });

  it("puste regions znaczą obojętnie: ten sam prompt co bez pola", async () => {
    await post({ ...quiz, month: 12 });
    await post({ ...quiz, month: 12, regions: [] });
    expect(gemini.prompts).toHaveLength(1); // ten sam klucz cache
  });

  it("miasto wybrane w galerii wygrywa z regionem: bez ograniczenia w prompcie i bez filtra", async () => {
    gemini.replies.push({ destinations: [city("Porto", "Portugalia"), ...southAmerica.slice(0, 5)] });
    const res = await post({ ...quiz, month: 6, regions: ["ameryka_poludniowa"], preferredCity: "Porto" });
    expect(gemini.prompts[0]).not.toContain("TWARDE OGRANICZENIE");
    expect(await cities(res)).toEqual(["Porto", ...southAmerica.slice(0, 5).map((d) => d.city)]);
    expect(gemini.prompts).toHaveLength(1);
  });

  it("za mało propozycji z regionu nie trafia do cache, a pusty wynik nie ponawia drugim modelem", async () => {
    const q = { ...quiz, month: 8, regions: ["azja"] };
    gemini.replies.push({ destinations: [city("Tokio", "Japonia")] }, { destinations: [city("Seul", "Korea Południowa")] });
    await post(q);
    const before = gemini.prompts.length;
    gemini.replies.push({ destinations: [city("Tokio", "Japonia")] }, { destinations: [city("Seul", "Korea Południowa")] });
    await post(q);
    expect(gemini.prompts.length).toBe(before + 2); // drugi raz znów pytamy: poprzedni wynik (1-2 kierunki) nie został zapamiętany

    gemini.prompts.length = 0;
    gemini.replies.push({ destinations: [city("Paryż", "Francja")] }, { destinations: [city("Rzym", "Włochy")] });
    const empty = await post({ ...quiz, month: 9, regions: ["azja"] });
    expect((await empty.json()).destinations).toEqual([]);
    expect(gemini.prompts).toHaveLength(2); // pierwsze zapytanie + jedno uzupełnienie, bez drugiego modelu
  });

  it("odrzuca nieznany region (400) i wyższy budżet przyjmuje", async () => {
    expect((await post({ ...quiz, regions: ["atlantyda"] })).status).toBe(400);
    gemini.replies.push({ destinations: southAmerica });
    expect((await post({ ...quiz, month: 7, budget: "high", regions: ["ameryka_poludniowa"] })).status).toBe(200);
  });

  it("granica cache: 3 kierunki z regionu są zapamiętane, 2 nie", async () => {
    const three = [city("Kair", "Egipt"), city("Marakesz", "Maroko"), city("Nairobi", "Kenia")];
    const q = { ...quiz, month: 2, duration: 6, regions: ["afryka"] };
    gemini.replies.push({ destinations: three }, { destinations: [] }); // odpowiedź i uzupełnienie bez nowych
    await post(q);
    expect(gemini.prompts).toHaveLength(2);
    await post(q);
    expect(gemini.prompts).toHaveLength(2); // trzy kierunki: drugi raz z cache

    const q2 = { ...quiz, month: 3, duration: 6, regions: ["afryka"] };
    gemini.replies.push({ destinations: three.slice(0, 2) }, { destinations: [] });
    await post(q2);
    gemini.replies.push({ destinations: three.slice(0, 2) }, { destinations: [] });
    await post(q2);
    expect(gemini.prompts).toHaveLength(6); // dwa kierunki: za każdym razem nowe zapytanie (z uzupełnieniem)
  });

  describe("limit czasu", () => {
    const slow = () => {
      gemini.advancePerCallMs = 9_000;
      const real = Date.now();
      vi.spyOn(Date, "now").mockImplementation(() => real + gemini.skewMs);
    };

    it("wolna pierwsza odpowiedź: uzupełnienia nie ma, zostaje to, co pasuje do regionu", async () => {
      slow();
      gemini.replies.push({ destinations: [city("Lima", "Peru"), city("Cusco", "Peru"), city("Paryż", "Francja")] });
      const res = await post({ ...quiz, month: 4, duration: 7, regions: ["ameryka_poludniowa"] });
      expect(gemini.prompts).toHaveLength(1);
      expect(await cities(res)).toEqual(["Lima", "Cusco"]);
    });

    it("wolna odpowiedź bez żadnego kierunku z regionu: 503 (tłok), a nie 'w regionie nic nie ma'", async () => {
      slow();
      gemini.replies.push({ destinations: [city("Paryż", "Francja")] });
      const res = await post({ ...quiz, month: 5, duration: 7, regions: ["ameryka_poludniowa"] });
      expect(res.status).toBe(503);
      expect(gemini.prompts).toHaveLength(1);
    });
  });
});

describe("POST /api/destinations: rodzaj wyjazdu", () => {
  const skiQuiz = { ...quiz, month: 1, tripType: "narty" };
  const ski = { city: "Zakopane", country: "Polska", description: "Ośrodek narciarski pod Tatrami, wyciągi na Kasprowy.", highlights: ["Trasy zjazdowe", "Karnet", "Schroniska przy stoku"] };
  const praga = { city: "Praga", country: "Czechy", description: "Stare Miasto, mosty i piwo.", highlights: ["Most Karola", "Zamek", "Rynek"] };

  it("narty: prompt żąda ośrodków z wyciągami i zabrania miast do zwiedzania", async () => {
    gemini.replies.push({ destinations: [ski] });
    await post(skiQuiz);
    expect(gemini.prompts[0]).toMatch(/RODZAJ WYJAZDU: Narty/);
    expect(gemini.prompts[0]).toMatch(/WYŁĄCZNIE miejscowości z ośrodkiem narciarskim/);
    expect(gemini.prompts[0]).not.toMatch(/UWAGA, termin nie pasuje/);
  });

  it("narty: odpowiedź filtrowana, zostają tylko miejsca z infrastrukturą narciarską", async () => {
    gemini.replies.push({ destinations: [ski, praga] });
    const res = await post({ ...skiQuiz, styles: ["history"] });
    expect((await res.json()).destinations.map((d: { city: string }) => d.city)).toEqual(["Zakopane"]);
  });

  it("narty: miasto wybrane przez użytkownika zostaje mimo filtra", async () => {
    gemini.replies.push({ destinations: [praga, ski] });
    const res = await post({ ...skiQuiz, styles: ["food"], preferredCity: "Praga" });
    expect((await res.json()).destinations.map((d: { city: string }) => d.city)).toEqual(["Praga", "Zakopane"]);
  });

  it("narty: gdy żaden kierunek nie pasuje, 200 z pustą listą (nie 503) i bez zapisu do cache", async () => {
    gemini.replies.push({ destinations: [praga] }, { destinations: [praga] });
    const q = { ...skiQuiz, styles: ["nature"] };
    const res = await post(q);
    expect(res.status).toBe(200);
    expect((await res.json()).destinations).toEqual([]);
    expect(gemini.prompts).toHaveLength(2); // oba modele próbowane
    gemini.replies.push({ destinations: [praga] }, { destinations: [praga] });
    await post(q);
    expect(gemini.prompts).toHaveLength(4); // pusta lista nie trafia do cache
  });

  it("narty w lipcu: prompt ostrzega o terminie i dopuszcza krótszą listę", async () => {
    gemini.replies.push({ destinations: [ski] });
    await post({ ...skiQuiz, month: 7, styles: ["beach"] });
    expect(gemini.prompts[0]).toMatch(/UWAGA, termin nie pasuje/);
    expect(gemini.prompts[0]).toMatch(/zwróć mniej/);
  });

  it("zwiedzanie jawnie wybrane działa jak brak odpowiedzi: ten sam prompt i brak filtra", async () => {
    gemini.replies.push({ destinations: [praga] });
    const a = await post({ ...quiz, month: 2, styles: ["history"] });
    const b = await post({ ...quiz, month: 2, styles: ["history"], tripType: "zwiedzanie" });
    expect((await a.json()).destinations).toHaveLength(1);
    expect((await b.json()).destinations).toHaveLength(1);
    expect(gemini.prompts).toHaveLength(1); // ten sam klucz cache
    expect(gemini.prompts[0]).not.toMatch(/RODZAJ WYJAZDU/);
  });
});
