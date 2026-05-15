import type { Metadata } from "next";
import HomeClient from "./components/HomeClient";
import HomeFAQ from "./components/HomeFAQ";
import SiteNav from "./components/SiteNav";
import SiteFooter from "./components/SiteFooter";

export const metadata: Metadata = {
  title: "Budżetowe podróże solo po Europie — AI planuje Twój wyjazd",
  description: "Budżetowe podróże solo z Polski — AI planuje Twój wyjazd godzina po godzinie. Najtańsze loty z WRO i nie tylko. Zacznij za darmo.",
  alternates: {
    canonical: "https://wloczykij.me",
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Czy Włóczykij jest darmowy?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Tak — po rejestracji otrzymujesz 1 plan podróży całkowicie za darmo, bez podawania karty kredytowej. Jeśli chcesz więcej planów, możesz wybrać Pack (5 planów za 5 zł) lub Pro (nielimitowane plany za 19 zł/mies.).",
      },
    },
    {
      "@type": "Question",
      name: "Jak działa planowanie podróży z AI?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Odpowiadasz na 6 krótkich pytań o swoje preferencje (budżet, styl, długość wyjazdu). AI analizuje odpowiedzi, dobiera najtańsze loty z WRO lub BER i generuje szczegółowy plan godzina po godzinie — od śniadania po kolację, z trasami na Google Maps i trikami budżetowymi.",
      },
    },
    {
      "@type": "Question",
      name: "Skąd lata aplikacja — tylko z Wrocławia?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Aplikacja sprawdza loty zarówno z Wrocławia (WRO), jak i z Berlina (BER i SXF) — stolicy dostępnej busem lub samochodem w ~2 godziny. Berlin otwiera znacznie więcej tras i często tańsze połączenia.",
      },
    },
    {
      "@type": "Question",
      name: "Ile trwa generowanie planu podróży?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Zazwyczaj 30–60 sekund. Gemini AI analizuje Twoje preferencje, sprawdza dostępność lotów i układa szczegółowy itinerary. Plan możesz potem udostępnić znajomym lub zapisać w swoim profilu.",
      },
    },
    {
      "@type": "Question",
      name: "Na ile dni mogę zaplanować podróż?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Aplikacja obsługuje wyjazdy od 2 do 14 dni. Optymalnie działa dla wyjazdów 4–7-dniowych — tyle czasu potrzeba, żeby w pełni poznać europejskie miasto.",
      },
    },
    {
      "@type": "Question",
      name: "Czy plan podróży można modyfikować?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Aktualnie plan jest generowany jednorazowo i możesz go przeglądać oraz udostępniać. Możliwość edycji planów to funkcja, którą rozwijamy dla użytkowników Pro.",
      },
    },
  ],
};

const webAppSchema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Włóczykij",
  url: "https://wloczykij.me",
  description: "Budżetowe planowanie podróży solo — najtańsze loty i plany AI godzina po godzinie.",
  applicationCategory: "TravelApplication",
  operatingSystem: "Web",
  inLanguage: "pl",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "PLN",
    description: "1 plan podróży za darmo po rejestracji",
  },
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <SiteNav />
      <HomeClient />
      <HomeFAQ />
      <SiteFooter />
    </>
  );
}
