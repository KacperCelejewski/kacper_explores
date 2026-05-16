import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "../components/SiteNav";
import SiteFooter from "../components/SiteFooter";

export const metadata: Metadata = {
  title: "Polityka Prywatności | Włóczykij",
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
  const updatedAt = "15 maja 2026";
  const adminEmail = "kontakt@wloczykij.me";

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
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-5"
            style={{ background: "var(--accent-light)" }}
          >
            🔒
          </div>
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
              Administratorem Twoich danych osobowych jest Kacper Celejewski,
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
                podróży, miesiąc wyjazdu, czas trwania) oraz wygenerowane plany
                podróży — zbierane podczas korzystania z kreatora.
              </Li>
              <Li>
                <strong>Dane płatności:</strong> informacje o transakcjach
                (kwota, data, status). Numery kart i pełne dane płatnicze są
                przetwarzane wyłącznie przez Stripe — my ich nie przechowujemy.
              </Li>
              <Li>
                <strong>Dane techniczne:</strong> adres IP, typ przeglądarki,
                system operacyjny, czas wizyty — zbierane automatycznie przez
                infrastrukturę serwerową (Vercel).
              </Li>
              <Li>
                <strong>Pliki cookie:</strong> szczegóły w{" "}
                <Link href="/cookies" style={{ color: "var(--accent)" }}>
                  Polityce Cookies
                </Link>
                .
              </Li>
            </Ul>
          </Section>

          <Section title="3. Cel i podstawa prawna przetwarzania">
            <Ul>
              <Li>
                <strong>Świadczenie usługi</strong> (art. 6 ust. 1 lit. b RODO)
                — rejestracja konta, planowanie podróży, obsługa płatności.
              </Li>
              <Li>
                <strong>Prawnie uzasadniony interes</strong> (art. 6 ust. 1 lit.
                f RODO) — bezpieczeństwo serwisu, wykrywanie nadużyć, analityka
                techniczna.
              </Li>
              <Li>
                <strong>Zgoda</strong> (art. 6 ust. 1 lit. a RODO) — pliki
                cookie analityczne i marketingowe, jeśli wyraziłeś na nie zgodę.
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
                podróży. Do Google przekazywane są Twoje preferencje podróży (bez
                danych osobowych).{" "}
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
            </Ul>
            <P>
              Przekazywanie danych do USA odbywa się na podstawie Standardowych
              Klauzul Umownych (SCC) zatwierdzonych przez Komisję Europejską.
            </P>
          </Section>

          <Section title="5. Jak długo przechowujemy dane">
            <Ul>
              <Li>
                <strong>Dane konta:</strong> do momentu usunięcia konta lub
                cofnięcia zgody, nie dłużej niż 3 lata od ostatniego logowania.
              </Li>
              <Li>
                <strong>Plany podróży:</strong> do 12 miesięcy od wygenerowania,
                chyba że konto zostanie wcześniej usunięte.
              </Li>
              <Li>
                <strong>Dane płatności (faktury):</strong> 5 lat od końca roku
                podatkowego — wymóg prawa podatkowego.
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
              <Li>Szyfrowanie transmisji (HTTPS / TLS 1.3)</Li>
              <Li>
                Row Level Security (RLS) w bazie danych — każdy użytkownik
                widzi tylko swoje dane
              </Li>
              <Li>Rate limiting na wszystkich endpointach API</Li>
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
