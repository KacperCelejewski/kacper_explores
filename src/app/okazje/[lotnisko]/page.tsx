import type { Metadata } from "next";
import { Fragment } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteNav from "@/app/components/SiteNav";
import SiteFooter from "@/app/components/SiteFooter";
import DropSignup from "@/app/components/DropSignup";
import { PartnerNote } from "@/app/components/PartnerLinks";
import { AIRLINE_NAMES } from "@/lib/flights/airlines";
import { POLISH_AIRPORTS } from "@/lib/airports";
import { bookingLink, partnerLinkProps } from "@/lib/affiliate";
import { ORIGIN_GENITIVE, formatLocal, transfersLabel } from "@/lib/drop/email";
import { buildFlightLink, buildPlanUrl } from "@/lib/drop/links";
import { getDealsForOrigin, originFromSlug } from "@/lib/drop/read";
import { dealNotes, hoursInCity } from "@/lib/drop/stay";
import { AIRPORT_FACTS } from "@/lib/seo/airportFacts";
import { breadcrumbLd, faqLd, itemListLd, jsonLdScript } from "@/lib/seo/jsonld";
import { cityFromSlug } from "@/lib/seo/cities";
import { slugify } from "@/lib/seo/slug";

// Noce liczymy z dat lotu (pobyty trwają od 47 do 73 godzin), nie zakładamy na sztywno dwóch
function nightsLabel(dep: string, ret: string): string {
  const n = Math.max(1, Math.round((Date.UTC(+ret.slice(0, 4), +ret.slice(5, 7) - 1, +ret.slice(8, 10)) - Date.UTC(+dep.slice(0, 4), +dep.slice(5, 7) - 1, +dep.slice(8, 10))) / 86400000));
  return `Nocleg: ${n} ${n === 1 ? "noc" : n < 5 ? "noce" : "nocy"}`;
}

export const dynamic = "force-dynamic";

type Params = Promise<{ lotnisko: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const origin = originFromSlug((await params).lotnisko);
  if (!origin) return { title: "Okazje na weekend" };
  const from = ORIGIN_GENITIVE[origin] ?? origin;
  // Najniższa cena w opisie tylko wtedy, gdy ją mamy: opis nie obiecuje liczby, której nie ma
  const { deals } = await getDealsForOrigin(origin, 1);
  const lowest = deals[0] ? ` Teraz najtaniej: ${deals[0].city_name} od ${deals[0].price} zł w obie strony.` : "";
  return {
    title: `Tanie loty na weekend z ${from}`,
    description: `Najtańsze wyjazdy na najbliższy weekend z ${from}: cena lotu, daty i ile godzin zostaje na miejscu.${lowest} Ceny z wyszukiwań z ostatnich dni.`,
    alternates: { canonical: `https://wloczykij.me/okazje/${origin.toLowerCase()}` },
    // Modlin zwraca dane z Okęcia (kod miasta WAW), więc jego strona nie trafia do indeksu jako duplikat
    ...(origin === "WMI" ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function DealsPage({ params }: { params: Params }) {
  const origin = originFromSlug((await params).lotnisko);
  if (!origin) notFound();

  const from = ORIGIN_GENITIVE[origin] ?? origin;
  const { deals, teasers } = await getDealsForOrigin(origin);
  const marker = process.env.TRAVELPAYOUTS_MARKER;
  const hint = deals[0] ? { from, price: deals[0].price, thirdPrice: (deals[2] ?? deals[deals.length - 1]).price } : null;
  const seen = deals[0]
    ? new Date(deals[0].fetched_at).toLocaleDateString("pl-PL", { timeZone: "Europe/Warsaw", day: "numeric", month: "long" })
    : null;

  const facts = AIRPORT_FACTS[origin];
  const faq = [
    {
      q: `Skąd są ceny lotów z ${from}?`,
      a: "Z wyszukiwań w serwisie Aviasales (Travelpayouts) z ostatnich dni, nie z rezerwacji na żywo. Cena może się zmienić, więc zawsze sprawdź aktualną przed zakupem.",
    },
    {
      q: "Co znaczy „najbliższy weekend”?",
      a: "Lot tam i z powrotem z wylotem od czwartku wieczorem do piątku i powrotem w niedzielę albo poniedziałek. Pobyt na miejscu trwa zwykle od 47 do 73 godzin.",
    },
    {
      q: "Czy cena zawiera bagaż i nocleg?",
      a: "Nie. To cena samego lotu. Często obejmuje tylko małą torbę pod siedzeniem, a większy bagaż podręczny jest płatny. Przy każdej okazji dopisujemy, co wiemy o bagażu.",
    },
    {
      q: "Jak często okazje się odświeżają?",
      a: "Raz w tygodniu, w środę wieczorem. W czwartek rano trzy najlepsze lądują w mailu Czwartkowego zrzutu.",
    },
  ];
  const ld = [
    breadcrumbLd([
      { name: "Strona główna", path: "/" },
      { name: "Okazje na weekend", path: "/okazje" },
      { name: `Z ${from}`, path: `/okazje/${origin.toLowerCase()}` },
    ]),
    faqLd(faq),
    ...(deals.length > 0
      ? [itemListLd(deals.map((d) => ({ name: `${d.city_name}: weekend z ${from}`, path: `/okazje/${origin.toLowerCase()}#${d.city_code}` })))]
      : []),
  ];

  return (
    <>
      {ld.map((o, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(o) }} />
      ))}
      <SiteNav />
      <main className="max-w-2xl mx-auto w-full px-5 pb-12">
        <div className="pt-10 pb-6">
          <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: "var(--accent)" }}>Okazje na weekend</p>
          <h1 className="text-3xl font-bold leading-tight">Weekend z {from}</h1>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Najtańsze loty tam i z powrotem na najbliższy weekend. Cena to lot, bez noclegu i bagażu.
            {facts && <> Wylot z lotniska {facts.name} ({facts.place}).</>}
          </p>
          <nav aria-label="Lotnisko" className="flex flex-wrap gap-2 mt-4">
            {POLISH_AIRPORTS.map((a) => (
              <Link
                key={a.code}
                href={`/okazje/${a.code.toLowerCase()}`}
                aria-current={a.code === origin ? "page" : undefined}
                className="text-xs font-semibold px-3 py-1.5 rounded-full"
                style={{
                  background: a.code === origin ? "var(--accent)" : "var(--bg-surface)",
                  color: a.code === origin ? "#fff" : "var(--text-secondary)",
                  border: "1px solid var(--border)",
                }}
              >
                {a.city}
              </Link>
            ))}
          </nav>
        </div>

        {deals.length === 0 ? (
          <div className="rounded-2xl p-6 text-center" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <p className="font-bold mb-1">Świeżych okazji z {from} jeszcze nie ma</p>
            <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
              Szukamy ich co środę wieczorem. Zapisz się niżej, a w czwartek dostaniesz trzy najlepsze mailem.
            </p>
            <Link href="/quiz" className="text-sm font-bold" style={{ color: "var(--accent)" }}>Albo dobierz wyjazd quizem →</Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-4 list-none p-0">
            {deals.map((deal, index) => {
              const hours = hoursInCity(deal);
              const teaser = teasers.get(deal.city_code);
              const flight = buildFlightLink(deal, marker, deal.week, "web");
              const hotel = bookingLink({
                city: deal.city_name, country: "",
                checkin: deal.departure_at.slice(0, 10), checkout: deal.return_at.slice(0, 10),
                label: `okazje-${origin.toLowerCase()}`,
              });
              return (
                <Fragment key={deal.city_code}>
                <li id={deal.city_code} className="rounded-2xl p-5 scroll-mt-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="text-xl font-bold">{deal.city_name}</h2>
                    <p className="text-xl font-bold" style={{ color: "var(--accent)" }}>{deal.price} zł</p>
                  </div>
                  <p className="text-sm mt-2">{formatLocal(deal.departure_at)} → {formatLocal(deal.return_at)}</p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    {AIRLINE_NAMES[deal.airline] ?? deal.airline} · {transfersLabel(deal.transfers)}
                  </p>
                  {hours && <p className="text-sm font-semibold mt-2">ok. {hours} h na miejscu</p>}
                  {dealNotes(deal).map((n) => (
                    <p key={n} className="text-xs mt-1.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>{n}</p>
                  ))}
                  {teaser?.teaser && <p className="text-sm mt-3 leading-relaxed" style={{ color: "var(--text-secondary)" }}>{teaser.teaser}</p>}
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <a
                      {...partnerLinkProps(flight, "flight", deal.city_name)}
                      className="text-sm font-bold px-3 py-3 rounded-xl text-center"
                      style={{ background: "var(--accent)", color: "#fff", minHeight: 44 }}
                    >
                      Lot {deal.price} zł ↗
                    </a>
                    <a
                      {...partnerLinkProps(hotel, "hotel", deal.city_name)}
                      className="text-sm font-bold px-3 py-3 rounded-xl text-center"
                      style={{ background: "var(--accent)", color: "#fff", minHeight: 44 }}
                    >
                      {nightsLabel(deal.departure_at, deal.return_at)} ↗
                    </a>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3">
                    <Link
                      href={buildPlanUrl(deal, "", deal.week, "web")}
                      className="text-sm font-semibold py-2"
                      style={{ color: "var(--accent)" }}
                    >
                      Plan na ten weekend →
                    </Link>
                    <PartnerNote show={flight.paid || hotel.paid} />
                  </div>
                </li>
                {index === 2 && deals.length > 4 && (
                  <li className="list-none"><DropSignup collapsed defaultAirports={[origin]} cheapestHint={hint} /></li>
                )}
                </Fragment>
              );
            })}
          </ul>
        )}

        {seen && (
          <p className="text-xs mt-5 leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Ceny z wyszukiwań z okolic {seen}, nie z rezerwacji na żywo, więc mogą się zmienić. Zawsze sprawdź aktualną cenę przed zakupem.
            Linki do rezerwacji bywają partnerskie: jeśli zarezerwujesz, dostajemy prowizję, a Ty płacisz tyle samo.
          </p>
        )}

        <div className="mt-10"><DropSignup defaultAirports={[origin]} cheapestHint={hint} /></div>

        {deals.some((d) => cityFromSlug(slugify(d.city_name))) && (
          <section className="mt-12" aria-label="Przewodniki po miastach">
            <h2 className="text-xl font-bold mb-3">Dokąd teraz z {from}</h2>
            <ul className="flex flex-wrap gap-2 list-none p-0">
              {deals.filter((d) => cityFromSlug(slugify(d.city_name))).map((d) => (
                <li key={d.city_code}>
                  <Link
                    href={`/weekend/${slugify(d.city_name)}`}
                    className="text-sm font-semibold px-3 py-2 rounded-full inline-block"
                    style={{ border: "1px solid var(--border)", color: "var(--accent)", background: "var(--bg-surface)" }}
                  >
                    Weekend: {d.city_name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

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
