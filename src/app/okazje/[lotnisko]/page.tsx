import type { Metadata } from "next";
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

export const dynamic = "force-dynamic";

type Params = Promise<{ lotnisko: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const origin = originFromSlug((await params).lotnisko);
  if (!origin) return { title: "Okazje na weekend" };
  const from = ORIGIN_GENITIVE[origin] ?? origin;
  return {
    title: `Tanie loty na weekend z ${from}`,
    description: `Najtańsze wyjazdy na najbliższy weekend z ${from}: cena lotu, daty i ile godzin zostaje na miejscu. Ceny z wyszukiwań z ostatnich dni.`,
    alternates: { canonical: `https://wloczykij.me/okazje/${origin.toLowerCase()}` },
  };
}

export default async function DealsPage({ params }: { params: Params }) {
  const origin = originFromSlug((await params).lotnisko);
  if (!origin) notFound();

  const from = ORIGIN_GENITIVE[origin] ?? origin;
  const { deals, teasers } = await getDealsForOrigin(origin);
  const marker = process.env.TRAVELPAYOUTS_MARKER;
  const seen = deals[0]
    ? new Date(deals[0].fetched_at).toLocaleDateString("pl-PL", { timeZone: "Europe/Warsaw", day: "numeric", month: "long" })
    : null;

  return (
    <>
      <SiteNav />
      <main className="max-w-2xl mx-auto w-full px-5 pb-12">
        <div className="pt-10 pb-6">
          <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: "var(--accent)" }}>Okazje na weekend</p>
          <h1 className="text-3xl font-bold leading-tight">Weekend z {from}</h1>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Najtańsze loty tam i z powrotem na najbliższy weekend. Cena to lot, bez noclegu i bagażu.
          </p>
          <nav aria-label="Lotnisko" className="flex flex-wrap gap-2 mt-4">
            {POLISH_AIRPORTS.map((a) => (
              <Link
                key={a.code}
                href={`/okazje/${a.code.toLowerCase()}`}
                aria-current={a.code === origin ? "page" : undefined}
                className="text-xs font-semibold px-3 py-1.5 rounded-full"
                style={{
                  background: a.code === origin ? "var(--accent)" : "var(--surface)",
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
            {deals.map((deal) => {
              const hours = hoursInCity(deal);
              const teaser = teasers.get(deal.city_code);
              const flight = buildFlightLink(deal, marker, deal.week, "web");
              const hotel = bookingLink({
                city: deal.city_name, country: "",
                checkin: deal.departure_at.slice(0, 10), checkout: deal.return_at.slice(0, 10),
              });
              return (
                <li key={deal.city_code} className="rounded-2xl p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
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
                  <div className="flex flex-wrap items-center gap-2 mt-4">
                    <a
                      {...partnerLinkProps(flight, "flight", deal.city_name)}
                      className="text-sm font-bold px-4 py-2.5 rounded-xl"
                      style={{ background: "var(--accent)", color: "#fff" }}
                    >
                      Sprawdź cenę lotu ↗
                    </a>
                    <a
                      {...partnerLinkProps(hotel, "hotel", deal.city_name)}
                      className="text-sm font-semibold px-4 py-2.5 rounded-xl"
                      style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                    >
                      Nocleg ↗
                    </a>
                    <Link
                      href={buildPlanUrl(deal, "", deal.week, "web")}
                      className="text-sm font-semibold px-4 py-2.5 rounded-xl"
                      style={{ border: "1px solid var(--accent)", color: "var(--accent)" }}
                    >
                      Plan na 48 h →
                    </Link>
                    <PartnerNote show={flight.paid || hotel.paid} />
                  </div>
                </li>
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

        <div className="mt-10"><DropSignup /></div>
      </main>
      <SiteFooter />
    </>
  );
}
