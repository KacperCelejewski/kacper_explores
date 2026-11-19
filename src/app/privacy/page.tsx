import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "../components/SiteNav";
import SiteFooter from "../components/SiteFooter";

export const metadata: Metadata = {
  title: "Polityka Prywatności",
  description:
    "Polityka prywatności serwisu Włóczykij — informacje o przetwarzaniu danych osobowych, cookies i Twoich prawach zgodnie z RODO.",
  alternates: { canonical: "https://wloczykij.me/privacy" },
  robots: { index: true, follow: true },
};

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section className="mb-8">
    <h2
      className="text-xl font-bold mt-8 mb-3 leading-snug"
      style={{ color: "var(--text-primary)" }}
    >
      {title}
    </h2>
    {children}
  </section>
);

const P = ({ children }: { children: React.ReactNode }) => (
  <p
    className="text-sm leading-relaxed mb-4"
    style={{ color: "var(--text-primary)" }}
  >
    {children}
  </p>
);

const Li = ({ children }: { children: React.ReactNode }) => (
  <li className="flex items-start gap-2 text-sm leading-relaxed mb-2">
    <span style={{ color: "var(--accent)", flexShrink: 0, marginTop: 2 }}>
      ✦
    </span>
    <span style={{ color: "var(--text-primary)" }}>{children}</span>
  </li>
);

const Ul = ({ children }: { children: React.ReactNode }) => (
  <ul className="flex flex-col pl-1 mb-4">{children}</ul>
);

export default function PrivacyPage() {
  const updatedAt = "16 listopada 2026";
  const adminEmail = "hej@wloczykij.me";

  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Polityka Prywatności — Włóczykij",
    url: "https://wloczykij.me/privacy",
    inLanguage: "pl",
    publisher: {
      "@type": "Organization",
      name: "Włóczykij",
      url: "https://wloczykij.me",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <SiteNav />

      <article className="flex flex-col flex-1 px-5 pb-16 max-w-2xl mx-auto w-full">
        {/* Breadcrumb */}
        <div className="pt-6 pb-2">
          <Link
            href="/"
            className="text-xs font-semibold"
            style={{ color: "var(--accent)", textDecoration: "none" }}
          >
            ← Strona główna
          </Link>
        </div>

        {/* Header */}
        <header className="pt-4 pb-6">
          <h1
            className="text-3xl font-bold leading-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Polityka Prywatności
          </h1>
          <p
            className="text-sm mt-3 leading-relaxed"
            style={{ color: "var(--text-muted)" }}
          >
            Ostatnia aktualizacja: {updatedAt}
          </p>
        </header>

        <div className="h-px mb-6" style={{ background: "var(--border)" }} />

        {/* Content */}
        <div className="flex flex-col">
          <Section title="1. Administrator danych">
            <P>
              Administratorem Twoich danych osobowych jest Włóczykij,
              prowadzący serwis <strong>Włóczykij</strong> dostępny pod adresem{" "}
              <strong>wloczykij.me</strong>.
            </P>
            <P>
              Kontakt:{" "}
              <a
                href={`mailto:${adminEmail}`}
                style={{ color: "var(--accent)" }}
              >
                {adminEmail}
              </a>
            </P>
          </Section>

          <Section title="2. Jakie dane zbieramy">
            <P>
              W zależności od sposobu korzystania z serwisu przetwarzamy
              następujące kategorie danych:
            </P>
            <Ul>
              <Li>
                <strong>Dane konta:</strong> adres e-mail, imię (imię Google lub
                wpisane przy rejestracji), identyfikator użytkownika — zbierane
                przy rejestracji lub logowaniu przez Google OAuth / magic link.
              </Li>
              <Li>
                <strong>Dane podróży:</strong> Twoje preferencje (budżet, styl
                podróży, miesiąc wyjazdu, czas trwania, skład grupy), wygenerowane
                plany podróży oraz pytania, które zadajesz asystentowi czatu
                w planie — zbierane podczas korzystania z kreatora i planu.
                Plan możesz udostępnić linkiem do podglądu; każdy, kto ma ten link, go zobaczy.
              </Li>
              <Li>
                <strong>E-mail do wiadomości:</strong> jeśli zapiszesz się na newsletter albo
                na Czwartkowy zrzut, zapisujemy adres e-mail oraz wybrane lotniska i próg
                ceny. Jeśli masz konto i zaplanowany wyjazd, wyślemy Ci też jedną
                wiadomość z przypomnieniem na 3 dni przed wylotem.
              </Li>
              <Li>
                <strong>Zdarzenia wiadomości z Czwartkowego zrzutu:</strong> zapisujemy,
                że wiadomość została wysłana, dostarczona, odbita, oznaczona jako spam
                albo że kliknięto w link, a także że z maila przeszedłeś do quizu lub
                planu. Zapisujemy rodzaj zdarzenia, tydzień i identyfikator subskrypcji,
                bez adresu e-mail i bez pełnych linków. Kliknięcia mierzy dla nas Resend.
                Zdarzenia służą do sprawdzenia, czy zrzut dociera i jest przydatny;
                kasujemy je razem z Twoim zapisem.
              </Li>
              <Li>
                <strong>Opinie:</strong> ocena i tekst, które wpiszesz w formularzu opinii
                po planie (razem z miastem i, jeśli jesteś zalogowany, identyfikatorem
                konta po naszej stronie).
              </Li>
              <Li>
                <strong>Statystyki użycia kreatora:</strong> losowy identyfikator sesji i
                nazwa zdarzenia (np. etap quizu, kliknięcie linku partnerskiego), zapisywane
                w naszej bazie bez cookies i bez adresu e-mail.
              </Li>
              <Li>
                <strong>Dane płatności:</strong> informacje o transakcjach
                (kwota, data, rodzaj planu, identyfikator sesji Stripe). Numery kart i pełne dane płatnicze są
                przetwarzane wyłącznie przez Stripe — my ich nie przechowujemy.
              </Li>
              <Li>
                <strong>Dane techniczne:</strong> adres IP, typ przeglądarki,
                system operacyjny, czas wizyty — zbierane automatycznie przez
                infrastrukturę serwerową (Vercel). Dla wywołań, które kosztują nas
                pieniądze, prowadzimy też liczniki użycia (liczba zapytań do AI na
                konto i dzień, bez treści zapytań).
              </Li>
              <Li>
                <strong>Pliki cookie:</strong> szczegóły w{" "}
                <Link href="/cookies" style={{ color: "var(--accent)" }}>
                  Polityce Cookies
                </Link>
                .
              </Li>
              <Li>
                <strong>Linki partnerskie:</strong> po zgodzie w bannerze linki do Aviasales,
                Tiqets i Radical Storage korzystają z Travelpayouts. Adres przekazuje parametry
                wyszukiwania, np. trasę, daty, skład podróżnych lub nazwę atrakcji i miasto,
                oraz publiczny identyfikator partnera i projektu. Nie umieszczamy w nich
                e-maila ani identyfikatora konta. Po kliknięciu usługodawca otrzymuje
                dane techniczne połączenia zgodnie ze swoją polityką prywatności.
                Bez zgody link na stronie nie zawiera identyfikatorów afiliacyjnych. Linki do lotów w e-mailach z Czwartkowego zrzutu mają identyfikator partnera zawsze (zapis na zrzut to osobna zgoda). Zgodę zmienisz
                przyciskiem na stronie Polityki Cookies.
              </Li>
            </Ul>
          </Section>

          <Section title="3. Cel i podstawa prawna przetwarzania">
            <Ul>
              <Li>
                <strong>Świadczenie usługi</strong> (art. 6 ust. 1 lit. b RODO)
                — rejestracja konta, planowanie podróży, obsługa płatności,
                przypomnienie przed wylotem.
              </Li>
              <Li>
                <strong>Prawnie uzasadniony interes</strong> (art. 6 ust. 1 lit.
                f RODO) — bezpieczeństwo serwisu, limity nadużyć, liczniki kosztów,
                anonimowe statystyki kreatora i opinii, powiadomienie nas o nowym koncie
                i płatności.
              </Li>
              <Li>
                <strong>Zgoda</strong> (art. 6 ust. 1 lit. a RODO) — pliki
                cookie analityczne (Google Analytics) i linki partnerskie na stronie,
                jeśli wyraziłeś na nie zgodę w bannerze; newsletter i Czwartkowy
                zrzut (zapis z potwierdzeniem e-mailem, wypisanie jednym kliknięciem).
              </Li>
              <Li>
                <strong>Obowiązek prawny</strong> (art. 6 ust. 1 lit. c RODO)
                — przechowywanie danych księgowych i transakcyjnych zgodnie z
                polskim prawem podatkowym.
              </Li>
            </Ul>
          </Section>

          <Section title="4. Podmioty zewnętrzne (procesorzy danych)">
            <P>
              Korzystamy z zaufanych usług zewnętrznych, którym powierzamy dane
              wyłącznie w zakresie niezbędnym do świadczenia usługi:
            </P>
            <Ul>
              <Li>
                <strong>Supabase</strong> (Supabase Inc., USA) — baza danych i
                uwierzytelnianie. Dane są przechowywane w regionie EU (Frankfurt,
                eu-central-1). Umowa DPA zawarta.{" "}
                <a
                  href="https://supabase.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--accent)" }}
                >
                  Polityka prywatności Supabase ↗
                </a>
              </Li>
              <Li>
                <strong>Stripe</strong> (Stripe, Inc., USA) — obsługa płatności.
                Stripe posiada certyfikat PCI DSS Level 1.{" "}
                <a
                  href="https://stripe.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--accent)" }}
                >
                  Polityka prywatności Stripe ↗
                </a>
              </Li>
              <Li>
                <strong>Google (Gemini API)</strong> — AI generujące plany
                podróży i odpowiadające w czacie. Do Google trafiają preferencje
                podróży, plan oraz treść pytań z czatu. Nie wysyłamy tam adresu
                e-mail ani identyfikatora konta, ale w pytaniu do czatu możesz sam
                wpisać dowolne dane, więc nie wpisuj tam nic wrażliwego.{" "}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--accent)" }}
                >
                  Polityka prywatności Google ↗
                </a>
              </Li>
              <Li>
                <strong>Vercel</strong> (Vercel Inc., USA) — hosting aplikacji.
                Logi serwera przechowywane przez 30 dni.{" "}
                <a
                  href="https://vercel.com/legal/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--accent)" }}
                >
                  Polityka prywatności Vercel ↗
                </a>
              </Li>
              <Li>
                <strong>Google OAuth</strong> — logowanie przez konto Google.
                Zakres: adres e-mail i imię publiczne.
              </Li>
              <Li>
                <strong>Resend</strong> (Resend, Inc., USA) — wysyłka e-maili:
                potwierdzenie zapisu, Czwartkowy zrzut, przypomnienie przed wylotem.
                Resend dostaje adres odbiorcy i treść wiadomości.{" "}
                <a
                  href="https://resend.com/legal/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--accent)" }}
                >
                  Polityka prywatności Resend ↗
                </a>
              </Li>
              <Li>
                <strong>Google Analytics 4</strong> (Google Ireland Ltd.) —
                statystyki odwiedzin, tylko po Twojej zgodzie w bannerze (szczegóły w{" "}
                <Link href="/cookies" style={{ color: "var(--accent)" }}>
                  Polityce Cookies
                </Link>
                ).
              </Li>
              <Li>
                <strong>Slack</strong> i <strong>Notion</strong> — nasze wewnętrzne
                narzędzia. Do Slacka wysyłamy powiadomienie o nowym koncie (z adresem
                e-mail) i o płatności (kwota, rodzaj planu, skrót identyfikatora konta).
                Do Notiona trafia treść opinii, którą wpiszesz po planie, bez adresu e-mail.
              </Li>
              <Li>
                <strong>Dostawcy cen lotów i zdjęć</strong> — zapytania o ceny lotów
                (trasa, daty, liczba pasażerów) idą z naszego serwera do Travelpayouts
                i RapidAPI, a nazwa miasta do Unsplash po zdjęcie. Nie wysyłamy tam
                Twojego e-maila ani identyfikatora konta.
              </Li>
              <Li>
                <strong>Partnerzy afiliacyjni</strong> (Travelpayouts, Aviasales, Tiqets,
                Radical Storage) — dostają dane dopiero wtedy, gdy klikniesz ich link
                (patrz punkt „Jakie dane zbieramy” o linkach partnerskich). To odrębni
                administratorzy danych.
              </Li>
            </Ul>
            <P>
              Część tych firm ma siedzibę w USA. Przekazanie danych tam odbywa się na
              podstawie decyzji Komisji Europejskiej o adekwatności (EU-US Data Privacy
              Framework), jeśli dostawca jest na jej liście, albo Standardowych
              Klauzul Umownych (SCC) zatwierdzonych przez Komisję Europejską.
            </P>
          </Section>

          <Section title="5. Jak długo przechowujemy dane">
            <Ul>
              <Li>
                <strong>Dane konta i plany podróży:</strong> do usunięcia konta.
                Konto usuniesz sam w profilu albo na prośbę mailową; razem z nim znikają
                plany, preferencje i zapis płatności w naszej bazie.
              </Li>
              <Li>
                <strong>Dane transakcji:</strong> zapis płatności w naszej bazie znika
                z kontem. Dokumentację księgową i dane transakcji u Stripe przechowujemy
                tak długo, jak wymaga tego prawo (do 5 lat od końca roku podatkowego).
              </Li>
              <Li>
                <strong>Newsletter i Czwartkowy zrzut:</strong> do wypisania się
                (link w każdej wiadomości) albo do Twojej prośby o usunięcie.
              </Li>
              <Li>
                <strong>Opinie i statystyki kreatora:</strong> bez limitu czasu. Opinie
                w Notion usuwamy na Twoją prośbę. Statystyki nie zawierają e-maila,
                tylko losowy identyfikator sesji.
              </Li>
              <Li>
                <strong>Logi techniczne:</strong> maksymalnie 30 dni.
              </Li>
            </Ul>
          </Section>

          <Section title="6. Twoje prawa (RODO)">
            <P>
              Przysługują Ci następujące prawa, które możesz realizować pisząc na{" "}
              <a
                href={`mailto:${adminEmail}`}
                style={{ color: "var(--accent)" }}
              >
                {adminEmail}
              </a>
              :
            </P>
            <Ul>
              <Li>
                <strong>Dostęp</strong> — otrzymanie kopii swoich danych (art. 15
                RODO).
              </Li>
              <Li>
                <strong>Sprostowanie</strong> — poprawienie nieprawidłowych danych
                (art. 16 RODO).
              </Li>
              <Li>
                <strong>Usunięcie</strong> (&bdquo;prawo do bycia
                zapomnianym&rdquo;) — żądanie usunięcia danych (art. 17 RODO).
              </Li>
              <Li>
                <strong>Ograniczenie przetwarzania</strong> — wstrzymanie
                przetwarzania w określonych sytuacjach (art. 18 RODO).
              </Li>
              <Li>
                <strong>Przenoszenie danych</strong> — otrzymanie danych w
                formacie JSON/CSV (art. 20 RODO).
              </Li>
              <Li>
                <strong>Sprzeciw</strong> — wobec przetwarzania opartego na
                prawnie uzasadnionym interesie (art. 21 RODO).
              </Li>
              <Li>
                <strong>Cofnięcie zgody</strong> — w każdej chwili, bez wpływu na
                zgodność wcześniejszego przetwarzania.
              </Li>
            </Ul>
            <P>
              Odpowiedź udzielana jest w ciągu 30 dni. Masz też prawo złożyć
              skargę do Prezesa Urzędu Ochrony Danych Osobowych (UODO),
              ul. Stawki 2, 00-193 Warszawa,{" "}
              <a
                href="https://uodo.gov.pl"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--accent)" }}
              >
                uodo.gov.pl
              </a>
              .
            </P>
          </Section>

          <Section title="7. Bezpieczeństwo">
            <P>
              Stosujemy techniczne i organizacyjne środki ochrony danych, w tym:
            </P>
            <Ul>
              <Li>Szyfrowanie transmisji (HTTPS / TLS)</Li>
              <Li>
                Row Level Security (RLS) w bazie danych — każdy użytkownik
                widzi tylko swoje dane
              </Li>
              <Li>Limity zapytań na kosztownych endpointach API i dzienny limit zapytań do AI na konto</Li>
              <Li>
                Walidacja i sanityzacja danych wejściowych po stronie serwera
              </Li>
              <Li>
                Hasła nie są przechowywane — uwierzytelnianie przez magic link
                lub OAuth
              </Li>
            </Ul>
          </Section>

          <Section title="8. Pliki cookie">
            <P>
              Informacje o plikach cookie, ich rodzajach i sposobie zarządzania
              nimi znajdziesz w naszej{" "}
              <Link href="/cookies" style={{ color: "var(--accent)" }}>
                Polityce Cookies
              </Link>
              .
            </P>
          </Section>

          <Section title="9. Zmiany polityki">
            <P>
              Zastrzegamy prawo do aktualizacji niniejszej polityki. O istotnych
              zmianach poinformujemy przez e-mail lub powiadomienie w serwisie.
              Data ostatniej aktualizacji jest zawsze widoczna na górze strony.
            </P>
          </Section>

          <Section title="10. Kontakt">
            <P>
              We wszelkich sprawach związanych z ochroną danych osobowych
              prosimy o kontakt:{" "}
              <a
                href={`mailto:${adminEmail}`}
                style={{ color: "var(--accent)" }}
              >
                {adminEmail}
              </a>
            </P>
          </Section>
        </div>

        <div className="h-px mt-4 mb-8" style={{ background: "var(--border)" }} />

        <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
          Włóczykij · wloczykij.me ·{" "}
          <Link href="/cookies" style={{ color: "var(--accent)" }}>
            Polityka Cookies
          </Link>
        </p>
      </article>

      <SiteFooter />
    </>
  );
}
