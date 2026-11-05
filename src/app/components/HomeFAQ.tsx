import { PRICES } from "@/lib/prices";

export const FAQS = [
  {
    q: "Czy Włóczykij jest darmowy?",
    a: `Pierwsze 5 planów tak. Dostajesz je po rejestracji, bez podawania karty. Potem możesz dokupić Pack (5 planów za ${PRICES.pack.label}) albo wziąć Pro bez limitu za ${PRICES.proMonthly.label}/mies. lub ${PRICES.proYearly.label}/rok.`,
  },
  {
    q: "Jak działa planowanie podróży z AI?",
    a: "Odpowiadasz na 6 krótkich pytań: budżet, styl, termin, kto jedzie. Na tej podstawie dostajesz plan godzina po godzinie, od śniadania po kolację, z konkretnymi miejscami, trasami w Google Maps i trikami, jak wydać mniej.",
  },
  {
    q: "Skąd mogę planować wyjazd — tylko z Wrocławia?",
    a: "Nie. Wybierasz lotnisko wylotu: Wrocław, Katowice, Kraków, Warszawa, Modlin, Poznań albo Gdańsk. Plany układamy dla całej Europy.",
  },
  {
    q: "Ile trwa generowanie planu podróży?",
    a: "Zwykle niecałą minutę. Nie czekasz na całość: dni pojawiają się na ekranie jeden po drugim. Gotowy plan zapiszesz w profilu albo wyślesz znajomym linkiem.",
  },
  {
    q: "Na ile dni mogę zaplanować podróż?",
    a: "Od 2 do 14 dni. Włóczykij powstał z myślą o weekendach — piątek rano wylot, niedziela wieczór powrót — ale dłuższy wyjazd też ułoży.",
  },
  {
    q: "Czy plan podróży można modyfikować?",
    a: "Tak — możesz zamienić dowolną aktywność jednym kliknięciem albo wygenerować zupełnie nowy plan całego dnia. W trakcie podróży działa też asystent czatu, który zna Twój plan: zapytasz gdzie tanio zjeść, co zrobić gdy pada, jak dojechać z lotniska.",
  },
];

export default function HomeFAQ() {
  return (
    <section className="mx-auto max-w-[600px] px-5 pt-4 pb-20" aria-labelledby="faq-heading">
      <h2
        id="faq-heading"
        className="mb-6 leading-tight"
        style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(30px, 8vw, 40px)", fontWeight: 700, letterSpacing: "-0.02em" }}
      >
        Zanim klikniesz
      </h2>
      <div className="flex flex-col gap-3">
        {FAQS.map(({ q, a }) => (
          <details
            key={q}
            className="p-4 rounded-2xl"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
          >
            <summary
              className="text-sm font-semibold leading-snug cursor-pointer list-none flex items-center justify-between gap-2"
              style={{ userSelect: "none" }}
            >
              <span>{q}</span>
              <span aria-hidden="true" className="flex-shrink-0 text-xs" style={{ color: "var(--text-muted)" }}>▾</span>
            </summary>
            <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--text-secondary)" }}>{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
