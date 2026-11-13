import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/app/components/SiteNav";
import SiteFooter from "@/app/components/SiteFooter";
import DropSignup from "@/app/components/DropSignup";
import { POLISH_AIRPORTS } from "@/lib/airports";
import { ORIGIN_GENITIVE } from "@/lib/drop/email";
import { getDealsForOrigin } from "@/lib/drop/read";
import { AIRPORT_FACTS } from "@/lib/seo/airportFacts";
import { breadcrumbLd, itemListLd, jsonLdScript } from "@/lib/seo/jsonld";

// Okazje zmieniają się raz w tygodniu; godzina cache wystarcza i oszczędza zapytania do bazy
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Tanie loty na weekend z polskich lotnisk",
  description: "Najtańsze wyjazdy na najbliższy weekend z Wrocławia, Katowic, Krakowa, Warszawy, Poznania i Gdańska. Ceny lotów, daty i ile godzin zostaje na miejscu, odświeżane co tydzień.",
  alternates: { canonical: "https://wloczykij.me/okazje" },
  openGraph: {
    title: "Tanie loty na weekend z polskich lotnisk",
    description: "Najtańsze wyjazdy na najbliższy weekend z polskich lotnisk, odświeżane co tydzień.",
    url: "https://wloczykij.me/okazje",
    type: "website",
  },
};

// Modlin pokazuje dane z Okęcia (kod miasta WAW), więc nie jest tu osobną pozycją
const AIRPORTS = POLISH_AIRPORTS.filter((a) => a.code !== "WMI");

export default async function DealsHubPage() {
  const rows = await Promise.all(
    AIRPORTS.map(async (a) => {
      try {
        const { deals } = await getDealsForOrigin(a.code, 1);
        return { airport: a, cheapest: deals[0] ?? null };
      } catch {
        return { airport: a, cheapest: null };
      }
    }),
  );

  const ld = [
    breadcrumbLd([{ name: "Strona główna", path: "/" }, { name: "Okazje na weekend", path: "/okazje" }]),
    itemListLd(AIRPORTS.map((a) => ({ name: `Tanie loty na weekend z ${ORIGIN_GENITIVE[a.code] ?? a.city}`, path: `/okazje/${a.code.toLowerCase()}` }))),
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
          <h1 className="text-3xl font-bold leading-tight">Tanie loty na weekend z polskich lotnisk</h1>
          <p className="text-base mt-3 leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Co tydzień sprawdzamy najtańsze loty tam i z powrotem na najbliższy weekend. Wybierz lotnisko, a zobaczysz kierunki,
            daty i to, ile godzin zostaje na miejscu. Ceny pochodzą z wyszukiwań z ostatnich dni, więc przed zakupem sprawdź aktualną.
          </p>
        </div>

        <ul className="flex flex-col gap-3 list-none p-0">
          {rows.map(({ airport, cheapest }) => {
            const from = ORIGIN_GENITIVE[airport.code] ?? airport.city;
            const facts = AIRPORT_FACTS[airport.code];
            return (
              <li key={airport.code}>
                <Link
                  href={`/okazje/${airport.code.toLowerCase()}`}
                  className="block rounded-2xl p-4"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", textDecoration: "none", color: "inherit" }}
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="text-lg font-bold">Weekend z {from}</span>
                    {cheapest && <span className="font-bold" style={{ color: "var(--accent)" }}>od {cheapest.price} zł</span>}
                  </span>
                  <span className="block text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                    {cheapest ? `Teraz najtaniej: ${cheapest.city_name}. ` : "Świeże okazje pojawią się w środę wieczorem. "}
                    {facts ? facts.name : ""}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-12"><DropSignup /></div>
      </main>
      <SiteFooter />
    </>
  );
}
