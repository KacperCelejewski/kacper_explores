import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "../components/SiteNav";
import SiteFooter from "../components/SiteFooter";

export const metadata: Metadata = {
  title: "Polityka Cookies | Włóczykij",
  description:
    "Informacje o plikach cookie używanych przez Włóczykij — co to są cookies, jakie stosujemy i jak nimi zarządzać.",
  alternates: { canonical: "https://wloczykij.me/cookies" },
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

type CookieRow = {
  name: string;
  provider: string;
  purpose: string;
  expiry: string;
};

const CookieTable = ({ rows }: { rows: CookieRow[] }) => (
  <div className="overflow-x-auto mb-4">
    <table
      className="w-full text-xs border-collapse"
      style={{ color: "var(--text-primary)" }}
    >
      <thead>
        <tr style={{ borderBottom: "1px solid var(--border)" }}>
          {["Nazwa", "Dostawca", "Cel", "Ważność"].map((h) => (
            <th
              key={h}
              className="text-left py-2 pr-4 font-semibold"
              style={{ color: "var(--text-muted)" }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr
            key={r.name}
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <td className="py-2 pr-4 font-mono">{r.name}</td>
            <td className="py-2 pr-4">{r.provider}</td>
            <td className="py-2 pr-4">{r.purpose}</td>
            <td className="py-2 pr-4 whitespace-nowrap">{r.expiry}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default function CookiesPage() {
  const updatedAt = "15 maja 2026";

  const necessaryCookies: CookieRow[] = [
    {
      name: "sb-*",
      provider: "Supabase",
      purpose: "Sesja użytkownika, uwierzytelnianie",
      expiry: "7 dni",
    },
    {
      name: "__Host-authjs.*",
      provider: "Włóczykij",
      purpose: "Bezpieczeństwo sesji OAuth",
      expiry: "Sesja",
    },
    {
      name: "cookie-consent",
      provider: "Włóczykij",
      purpose: "Zapamiętanie Twojej zgody na cookies",
      expiry: "12 miesięcy",
    },
  ];

  const functionalCookies: CookieRow[] = [
    {
      name: "quiz-state",
      provider: "Włóczykij",
      purpose: "Zachowanie stanu kreatora podróży (localStorage)",
      expiry: "LocalStorage",
    },
  ];

  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Polityka Cookies — Włóczykij",
    url: "https://wloczykij.me/cookies",
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
            🍪
          </div>
          <h1
            className="text-3xl font-bold leading-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Polityka Cookies
          </h1>
          <p
            className="text-sm mt-3 leading-relaxed"
            style={{ color: "var(--text-muted)" }}
          >
            Ostatnia aktualizacja: {updatedAt}
          </p>
        </header>

        <div className="h-px mb-6" style={{ background: "var(--border)" }} />

        <div className="flex flex-col">
          <Section title="1. Czym są pliki cookie?">
            <P>
              Pliki cookie to małe pliki tekstowe przechowywane w Twojej
              przeglądarce. Umożliwiają zapamiętanie Twoich ustawień i sesji,
              dzięki czemu nie musisz logować się przy każdej wizycie.
            </P>
          </Section>

          <Section title="2. Niezbędne pliki cookie">
            <P>
              Te pliki cookie są konieczne do działania serwisu i nie wymagają
              Twojej zgody. Bez nich logowanie i bezpieczna sesja nie byłyby
              możliwe.
            </P>
            <CookieTable rows={necessaryCookies} />
          </Section>

          <Section title="3. Funkcjonalne pliki cookie / localStorage">
            <P>
              Używamy localStorage (a nie cookies) do przechowywania stanu
              kreatora podróży — Twoje odpowiedzi na etapach quizu nie są
              wysyłane na serwer przed ukończeniem formularza.
            </P>
            <CookieTable rows={functionalCookies} />
          </Section>

          <Section title="4. Analityczne i marketingowe pliki cookie">
            <P>
              Aktualnie <strong>nie korzystamy</strong> z żadnych zewnętrznych
              narzędzi analitycznych (Google Analytics, Meta Pixel itp.) ani
              śledzenia reklamowego. Jeśli to się zmieni, zaktualizujemy
              niniejszą politykę i poprosimy o Twoją zgodę przed uruchomieniem
              takich plików cookie.
            </P>
          </Section>

          <Section title="5. Pliki cookie stron trzecich">
            <Ul>
              <Li>
                <strong>Stripe</strong> — przy kliknięciu &bdquo;Kup&rdquo;
                zostaniesz przekierowany na stronę Stripe, która może ustawiać
                własne pliki cookie zgodnie z{" "}
                <a
                  href="https://stripe.com/cookies-policy/legal"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--accent)" }}
                >
                  polityką Stripe ↗
                </a>
                .
              </Li>
              <Li>
                <strong>Google OAuth</strong> — przy logowaniu przez Google
                przeglądarka może otrzymać cookies Google zgodnie z{" "}
                <a
                  href="https://policies.google.com/technologies/cookies"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--accent)" }}
                >
                  polityką Google ↗
                </a>
                .
              </Li>
            </Ul>
          </Section>

          <Section title="6. Jak zarządzać plikami cookie?">
            <P>
              Możesz kontrolować i usuwać pliki cookie w ustawieniach
              przeglądarki:
            </P>
            <Ul>
              <Li>
                <strong>Chrome:</strong> Ustawienia → Prywatność i
                bezpieczeństwo → Pliki cookie i inne dane witryn
              </Li>
              <Li>
                <strong>Firefox:</strong> Ustawienia → Prywatność i
                bezpieczeństwo → Ciasteczka i dane witryn
              </Li>
              <Li>
                <strong>Safari:</strong> Preferencje → Prywatność → Zarządzaj
                danymi witryn
              </Li>
              <Li>
                <strong>Edge:</strong> Ustawienia → Pliki cookie i uprawnienia
                witryn
              </Li>
            </Ul>
            <P>
              Uwaga: wyłączenie niezbędnych cookies uniemożliwi logowanie do
              serwisu.
            </P>
          </Section>

          <Section title="7. Zmiany polityki">
            <P>
              O istotnych zmianach w tej polityce poinformujemy przez
              powiadomienie w serwisie lub e-mail. Data aktualizacji jest
              zawsze widoczna na górze strony.
            </P>
          </Section>

          <Section title="8. Kontakt">
            <P>
              Pytania dotyczące plików cookie kieruj na:{" "}
              <a
                href="mailto:kontakt@wloczykij.me"
                style={{ color: "var(--accent)" }}
              >
                kontakt@wloczykij.me
              </a>
            </P>
          </Section>
        </div>

        <div className="h-px mt-4 mb-8" style={{ background: "var(--border)" }} />

        <p
          className="text-xs text-center"
          style={{ color: "var(--text-muted)" }}
        >
          Włóczykij · wloczykij.me ·{" "}
          <Link href="/privacy" style={{ color: "var(--accent)" }}>
            Polityka Prywatności
          </Link>
        </p>
      </article>

      <SiteFooter />
    </>
  );
}
