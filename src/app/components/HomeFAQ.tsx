const FAQS = [
  {
    q: "Czy Włóczykij jest darmowy?",
    a: "Tak — po rejestracji otrzymujesz 1 plan podróży całkowicie za darmo, bez podawania karty kredytowej. Jeśli chcesz więcej planów, możesz wybrać Pack (5 planów za 5 zł) lub Pro (nielimitowane plany za 19 zł/mies.).",
  },
  {
    q: "Jak działa planowanie podróży z AI?",
    a: "Odpowiadasz na 6 krótkich pytań o swoje preferencje (budżet, styl, długość wyjazdu). AI analizuje odpowiedzi, dobiera najtańsze loty z WRO lub BER i generuje szczegółowy plan godzina po godzinie — od śniadania po kolację, z trasami na Google Maps i trikami budżetowymi.",
  },
  {
    q: "Skąd lata aplikacja — tylko z Wrocławia?",
    a: "Aplikacja sprawdza loty zarówno z Wrocławia (WRO), jak i z Berlina (BER i SXF) — stolicy dostępnej busem lub samochodem w ~2 godziny. Berlin otwiera znacznie więcej tras i często tańsze połączenia.",
  },
  {
    q: "Ile trwa generowanie planu podróży?",
    a: "Zazwyczaj 30–60 sekund. Gemini AI analizuje Twoje preferencje, sprawdza dostępność lotów i układa szczegółowy itinerary. Plan możesz potem udostępnić znajomym lub zapisać w swoim profilu.",
  },
  {
    q: "Na ile dni mogę zaplanować podróż?",
    a: "Aplikacja obsługuje wyjazdy od 2 do 14 dni. Optymalnie działa dla wyjazdów 4–7-dniowych — tyle czasu potrzeba, żeby w pełni poznać europejskie miasto.",
  },
  {
    q: "Czy plan podróży można modyfikować?",
    a: "Aktualnie plan jest generowany jednorazowo i możesz go przeglądać oraz udostępniać. Możliwość edycji planów to funkcja, którą rozwijamy dla użytkowników Pro.",
  },
];

export default function HomeFAQ() {
  return (
    <section className="mt-10 px-5" aria-labelledby="faq-heading">
      <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: "var(--accent)" }}>
        FAQ
      </p>
      <h2 id="faq-heading" className="text-xl font-bold mb-5 leading-snug">
        Często zadawane pytania
      </h2>
      <div className="flex flex-col gap-3">
        {FAQS.map(({ q, a }) => (
          <details
            key={q}
            className="p-4 rounded-2xl"
            style={{ background: "#F7F7F5", border: "1px solid var(--border)" }}
          >
            <summary
              className="text-sm font-semibold leading-snug cursor-pointer list-none flex items-center justify-between gap-2"
              style={{ userSelect: "none" }}
            >
              <span>{q}</span>
              <span aria-hidden="true" className="flex-shrink-0 text-xs" style={{ color: "var(--text-muted)" }}>▾</span>
            </summary>
            <p className="text-xs mt-2 leading-relaxed" style={{ color: "var(--text-muted)" }}>{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
