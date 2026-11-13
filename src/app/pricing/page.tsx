import type { Metadata } from "next";
import CheckoutButton from "../components/CheckoutButton";
import SiteNav from "../components/SiteNav";
import SiteFooter from "../components/SiteFooter";
import DropSignup from "../components/DropSignup";
import { PRICES } from "@/lib/prices";

const pricingSchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Plany cenowe — Włóczykij",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      item: {
        "@type": "Product",
        name: "Free",
        description: "2 plany podróży co miesiąc, bez karty kredytowej.",
        offers: { "@type": "Offer", price: "0", priceCurrency: "PLN", availability: "https://schema.org/InStock" },
      },
    },
    {
      "@type": "ListItem",
      position: 2,
      item: {
        "@type": "Product",
        name: "Pack",
        description: "5 planów podróży bez wygasania.",
        offers: { "@type": "Offer", price: PRICES.pack.amount, priceCurrency: "PLN", availability: "https://schema.org/InStock" },
      },
    },
    {
      "@type": "ListItem",
      position: 3,
      item: {
        "@type": "Product",
        name: "Pro",
        description: "Nielimitowane plany podróży i historia wyjazdów.",
        offers: {
          "@type": "Offer",
          price: PRICES.proMonthly.amount,
          priceCurrency: "PLN",
          availability: "https://schema.org/InStock",
          priceSpecification: { "@type": "UnitPriceSpecification", price: PRICES.proMonthly.amount, priceCurrency: "PLN", unitCode: "MON" },
        },
      },
    },
  ],
};

export const metadata: Metadata = {
  title: "Plany cenowe",
  description: `2 wyjazdy w miesiącu za darmo. Potem Pack za ${PRICES.pack.label} (5 planów) albo Pro za ${PRICES.proMonthly.label}/mies. bez limitu.`,
  alternates: {
    canonical: "https://wloczykij.me/pricing",
  },
  openGraph: {
    title: "Plany cenowe | Włóczykij",
    description: `2 wyjazdy w miesiącu za darmo. Potem Pack za ${PRICES.pack.label} albo Pro za ${PRICES.proMonthly.label}/mies.`,
    url: "https://wloczykij.me/pricing",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
};

const PLANS = [
  {
    key: "pack_5",
    name: "Pack",
    price: PRICES.pack.label,
    period: "jednorazowo",
    priceBreakdown: null,
    badge: null,
    features: [
      "5 wyjazdów z lotem i planem dzień po dniu",
      "Każdy dzień rozpisany godzina po godzinie",
      "Ceny na miejscu i triki, jak wydać mniej",
      "Plany nie wygasają",
    ],
    highlight: false,
    cta: "Kup Pack →",
    emoji: "🎒",
  },
  {
    key: "pro_yearly",
    name: "Pro Roczny",
    price: PRICES.proYearly.label,
    period: "rocznie",
    priceBreakdown: `${PRICES.proYearly.perMonth} miesięcznie`,
    badge: `o ${PRICES.proYearly.savings} taniej niż miesięcznie`,
    features: [
      "Wyjazdy bez limitu",
      "Historia wszystkich wyjazdów",
      "Nowe funkcje trafiają do Ciebie najpierw",
    ],
    highlight: true,
    cta: "Zostań Pro →",
    emoji: "✦",
  },
  {
    key: "pro_monthly",
    name: "Pro Miesięczny",
    price: PRICES.proMonthly.label,
    period: "miesięcznie",
    priceBreakdown: null,
    badge: null,
    features: [
      "Wyjazdy bez limitu",
      "Historia wszystkich wyjazdów",
      "Odwołujesz, kiedy chcesz",
    ],
    highlight: false,
    cta: "Zostań Pro →",
    emoji: "✦",
  },
];

export default function PricingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingSchema) }}
      />
    <SiteNav />
    <div className="flex flex-col flex-1 px-5 pb-8">
      <div className="pt-10 pb-6">
        <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: "var(--accent)" }}>
          Plany
        </p>
        <h1 className="text-3xl font-bold leading-tight">
          2 wyjazdy w miesiącu masz za darmo. Potem wybierz, ile chcesz latać.
        </h1>
        <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--text-muted)" }}>
          Darmowe plany odnawiają się co miesiąc, bez podawania karty.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Free tier */}
        <div
          className="p-5 rounded-2xl flex items-center justify-between"
          style={{ background: "#F7F7F5", border: "1px solid var(--border)" }}
        >
          <div>
            <p className="font-bold text-sm">Free</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Co miesiąc od nowa · bez karty
            </p>
          </div>
          <span
            className="text-sm font-bold px-3 py-1 rounded-full"
            style={{ background: "var(--border)", color: "var(--text-secondary)" }}
          >
            2 plany / mies.
          </span>
        </div>

        {/* Paid plans */}
        {PLANS.map((plan) => (
          <div
            key={plan.key}
            className="rounded-2xl overflow-hidden"
            style={{
              background: "#FFFFFF",
              border: plan.highlight ? `2px solid var(--accent)` : "1px solid var(--border)",
              boxShadow: plan.highlight ? "0 4px 20px rgba(255,107,53,0.12)" : "0 1px 8px rgba(0,0,0,0.04)",
            }}
          >
            {plan.highlight && (
              <div
                className="px-5 py-2 text-xs font-bold text-center tracking-wider uppercase flex items-center justify-center gap-3"
                style={{ background: "var(--accent)", color: "white" }}
              >
                <span>Najtaniej</span>
                {plan.badge && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "rgba(255,255,255,0.25)" }}>
                    {plan.badge}
                  </span>
                )}
              </div>
            )}
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xl">{plan.emoji}</span>
                  <h2 className="font-bold text-lg mt-1">{plan.name}</h2>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold" style={{ color: "var(--accent)" }}>{plan.price}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{plan.period}</p>
                  {plan.priceBreakdown && (
                    <p className="text-xs font-semibold mt-0.5" style={{ color: "var(--green)" }}>{plan.priceBreakdown}</p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2.5">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-center gap-2.5">
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: "var(--accent-light)" }}
                    >
                      <span className="text-xs" style={{ color: "var(--accent)" }}>✓</span>
                    </div>
                    <p className="text-sm">{f}</p>
                  </div>
                ))}
              </div>

              <CheckoutButton planKey={plan.key} cta={plan.cta} gate="pricing" />
            </div>
          </div>
        ))}
      </div>

      {/* Zasady zwrotu, zgodnie z regulaminem §5 */}
      <div
        className="mt-5 p-4 rounded-2xl"
        style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}
      >
        <p className="text-sm font-bold" style={{ color: "#15803D" }}>Zwroty</p>
        <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "#4B5563" }}>
          Pro możesz zwrócić w ciągu 14 dni, dopóki nie wygenerujesz na nim planu. Wygenerowany plan
          jest już Twój, więc Packa po użyciu nie zwracamy. Szczegóły w{" "}
          <a href="/regulamin" style={{ color: "#15803D", textDecoration: "underline" }}>regulaminie</a>.
        </p>
      </div>

      <div className="mt-10">
        <DropSignup
          title="Nie chcesz płacić? Okazje co czwartek są za darmo"
          lead="Bez konta i bez karty: co czwartek 3 najtańsze wyjazdy z Twojego lotniska. Wypiszesz się jednym kliknięciem."
        />
      </div>

      <p className="text-xs text-center mt-5" style={{ color: "var(--text-muted)" }}>
        Płatności obsługuje Stripe. Nie widzimy ani nie przechowujemy danych Twojej karty.
      </p>
    </div>
    <SiteFooter />
    </>
  );
}
