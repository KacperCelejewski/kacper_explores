import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteNav from "@/app/components/SiteNav";
import SiteFooter from "@/app/components/SiteFooter";
import DropSignup from "@/app/components/DropSignup";
import { ORIGIN_GENITIVE, formatLocal } from "@/lib/drop/email";
import { getDealsForCity } from "@/lib/drop/read";
import { cityAudience, cityFromSlug, citySlug, dealCityName, weekendCities } from "@/lib/seo/cities";
import { breadcrumbLd, faqLd, jsonLdScript } from "@/lib/seo/jsonld";

// Strony powstają dla wszystkich miast z listy, a ceny odświeżają się co godzinę (dane w bazie zmieniają się raz w tygodniu)
export const revalidate = 3600;

type Params = Promise<{ miasto: string }>;

export function generateStaticParams() {
  return weekendCities().map((c) => ({ miasto: citySlug(c) }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const city = cityFromSlug((await params).miasto);
  if (!city) return { title: "Weekend w europejskim mieście" };
  const hasDeals = (await getDealsForCity(dealCityName(city))).length > 0;
  const title = `${city.city} na weekend: loty z Polski i plan`;
  const description = `${city.description} Sprawdź ceny lotów z polskich lotnisk (kierunek: ${city.city}) i ułóż plan na weekend.`;
  const url = `https://wloczykij.me/weekend/${citySlug(city)}`;
  return {
    // Bez świeżych cen strona jest cienka, więc nie trafia do indeksu; wraca, gdy dane się pojawią
    ...(hasDeals ? {} : { robots: { index: false, follow: true } }),
    openGraph: { title, description, url, type: "website" },
    title: `${city.city} na weekend: loty z Polski i plan`,
    description: `${city.description} Sprawdź ceny lotów z polskich lotnisk (kierunek: ${city.city}) i ułóż plan na weekend.`,
    alternates: { canonical: `https://wloczykij.me/weekend/${citySlug(city)}` },
  };
}

export default async function WeekendCityPage({ params }: { params: Params }) {
  const city = cityFromSlug((await params).miasto);
  if (!city) notFound();

  const deals = await getDealsForCity(dealCityName(city));
  const audience = cityAudience(city);
  const slug = citySlug(city);
  const cheapest = deals[0];

  const faq = [
    {
      q: `Czy opłaca się lecieć na weekend, kierunek: ${city.city}?`,
      a: cheapest
        ? `W najnowszych wyszukiwaniach lot tam i z powrotem z ${ORIGIN_GENITIVE[cheapest.origin] ?? cheapest.origin} wychodzi od ${cheapest.price} zł. To cena samego lotu, bez noclegu i bagażu, więc przed zakupem sprawdź aktualną.`
        : `W tej chwili nie mamy świeżych cen lotów do tego miasta. Zapisz się na Czwartkowy zrzut, a dostaniesz mail, gdy pojawi się okazja z Twojego lotniska.`,
    },
    {
      q: `Z jakich polskich lotnisk polecisz, kierunek: ${city.city}?`,
      a: deals.length > 0
        ? `W ostatnich wyszukiwaniach loty były z: ${deals.map((d) => ORIGIN_GENITIVE[d.origin] ?? d.origin).join(", ")}. Lista zmienia się z tygodnia na tydzień.`
        : "Sprawdzamy loty z siedmiu polskich lotnisk. Gdy tylko pojawi się trasa do tego miasta, zobaczysz ją na tej stronie.",
    },
    {
      q: "Ile godzin zostaje na miejscu w weekend?",
      a: "Przy typowych wyjazdach od czwartku wieczorem do niedzieli albo poniedziałku pobyt na miejscu trwa dwa, góra trzy dni. Dokładną liczbę godzin podajemy przy każdej okazji.",
    },
  ];

  const ld = [
    breadcrumbLd([
      { name: "Strona główna", path: "/" },
      { name: "Okazje na weekend", path: "/okazje" },
      { name: city.city, path: `/weekend/${slug}` },
    ]),
    faqLd(faq),
  ];

  return (
    <>
      {ld.map((o, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(o) }} />
      ))}
      <SiteNav />
      <main className="max-w-2xl mx-auto w-full px-5 pb-12">
        <div className="pt-10 pb-6">
          <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: "var(--accent)" }}>{city.country}</p>
          <h1 className="text-3xl font-bold leading-tight">{city.city} na weekend</h1>
          <p className="text-base mt-3 leading-relaxed" style={{ color: "var(--text-muted)" }}>{city.description}</p>
        </div>

        {audience.length > 0 && (
          <section aria-label="Dla kogo" className="mb-8">
            <h2 className="text-xl font-bold mb-2">Czy to miasto na Twój weekend?</h2>
            <ul className="flex flex-col gap-1.5 list-none p-0 text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {audience.map((line) => <li key={line}>{line}</li>)}
            </ul>
          </section>
        )}

        <section aria-label="Loty w tym tygodniu" className="mb-8">
          <h2 className="text-xl font-bold mb-3">Loty w tym tygodniu, kierunek: {city.city}</h2>
          {deals.length > 0 ? (
            <>
              <ul className="flex flex-col gap-3 list-none p-0">
                {deals.map((d) => (
                  <li key={d.origin}>
                    <Link
                      href={`/okazje/${d.origin.toLowerCase()}#${d.city_code}`}
                      className="block rounded-2xl p-4"
                      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", textDecoration: "none", color: "inherit" }}
                    >
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="font-bold">Z {ORIGIN_GENITIVE[d.origin] ?? d.origin}</span>
                        <span className="font-bold" style={{ color: "var(--accent)" }}>{d.price} zł</span>
                      </span>
                      <span className="block text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                        {formatLocal(d.departure_at)} → {formatLocal(d.return_at)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="text-xs mt-3 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                Ceny lotu w obie strony, z wyszukiwań z ostatnich dni, bez noclegu i bagażu. Zawsze sprawdź aktualną cenę przed zakupem.
              </p>
            </>
          ) : (
            <p className="text-base leading-relaxed" style={{ color: "var(--text-muted)" }}>
              W tym tygodniu nie mamy świeżych cen lotów do tego miasta. Okazje odświeżamy co środę wieczorem.
            </p>
          )}
        </section>

        <section aria-label="Plan wyjazdu" className="mb-10 rounded-2xl p-5" style={{ background: "var(--accent-light)", border: "1px solid var(--border)" }}>
          <p className="text-lg font-bold">Plan na weekend: {city.city}</p>
          <p className="text-sm mt-1 mb-4" style={{ color: "var(--text-muted)" }}>
            Odpowiedz na 6 pytań, a dostaniesz plan godzina po godzinie z cenami i miejscami.
          </p>
          <Link href={`/quiz?city=${encodeURIComponent(city.city)}`} className="btn-primary" style={{ display: "inline-block", width: "auto", textDecoration: "none" }}>
            Zaplanuj wyjazd: {city.city} →
          </Link>
        </section>

        <DropSignup title={`Okazje, gdy lot na kierunek ${city.city} stanieje`} />

        <section className="mt-12" aria-label="Najczęstsze pytania">
          <h2 className="text-xl font-bold mb-4">Najczęstsze pytania</h2>
          <dl className="flex flex-col gap-4">
            {faq.map(({ q, a }) => (
              <div key={q}>
                <dt className="text-base font-semibold">{q}</dt>
                <dd className="text-sm mt-1 leading-relaxed" style={{ color: "var(--text-muted)" }}>{a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
