import type { Metadata } from "next";
import CheckoutButton from "../components/CheckoutButton";
import SiteNav from "../components/SiteNav";
import SiteFooter from "../components/SiteFooter";

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
        description: "5 planów podróży po rejestracji, bez karty kredytowej.",
        offers: { "@type": "Offer", price: "0", priceCurrency: "PLN", availability: "https://schema.org/InStock" },
      },
    },
    {
      "@type": "ListItem",
      position: 2,
      item: {
        "@type": "Product",
        name: "Pack",
        description: "5 planów podróży AI bez wygasania.",
        offers: { "@type": "Offer", price: "5", priceCurrency: "PLN", availability: "https://schema.org/InStock" },
      },
    },
    {
      "@type": "ListItem",
      position: 3,
      item: {
        "@type": "Product",
        name: "Pro",
        description: "Nielimitowane plany podróży AI, historia wyjazdów, priorytetowe generowanie.",
        offers: {
          "@type": "Offer",
          price: "19",
          priceCurrency: "PLN",
          availability: "https://schema.org/InStock",
          priceSpecification: { "@type": "UnitPriceSpecification", price: "19", priceCurrency: "PLN", unitCode: "MON" },
        },
      },
    },
  ],
};

export const metadata: Metadata = {
  title: "Plany cenowe",
  description: "Zacznij za darmo — 5 planów podróży po rejestracji. Pack za 5 zł (5 planów) lub Pro za 19 zł/mies. (nielimitowane plany AI).",
  alternates: {
    canonical: "https://wloczykij.me/pricing",
  },
  openGraph: {
    title: "Plany cenowe | Włóczykij",
    description: "Zacznij za darmo — 5 planów podróży po rejestracji. Pack za 5 zł lub Pro za 19 zł/mies.",
    url: "https://wloczykij.me/pricing",
  },
};

const PLANS = [
  {
    key: "pack_5",
    name: "Pack",
    price: "14,99 PLN",
    period: "jednorazowo",
    priceBreakdown: null,
    badge: null,
    features: [
      "5 kompletnych planów z lotem i dniem po dniu",
      "Pełny itinerary godzina po godzinie",
      "Triki budżetowe i lokalne polecenia AI",
      "Plany nie wygasają — zostają na zawsze",
    ],
    highlight: false,
    cta: "Kup Pack →",
    emoji: "🎒",
  },
  {
    key: "pro_yearly",
    name: "Pro Roczny",
    price: "149,99 PLN",
    period: "rocznie",
    priceBreakdown: "tylko 12,50 PLN/mies.",
    badge: "Oszczędzasz 90 PLN vs miesięczny",
    features: [
      "Nielimitowane plany podróży",
      "Historia wszystkich wyjazdów",
      "Priorytetowe generowanie AI",
      "Dostęp do nowych funkcji jako pierwszy",
    ],
    highlight: true,
    cta: "Zostań Pro →",
    emoji: "✦",
  },
  {
    key: "pro_monthly",
    name: "Pro Miesięczny",
    price: "19,99 PLN",
    period: "miesięcznie",
    priceBreakdown: null,
    badge: null,
    features: [
      "Nielimitowane plany podróży",
      "Historia wszystkich wyjazdów",
      "Priorytetowe generowanie AI",
      "Dostęp do nowych funkcji",
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
          Planer podróży solo — wybierz swój plan
        </h1>
        <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--text-muted)" }}>
          Zaczynasz z 5 darmowymi planami po rejestracji. Bez karty.
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
              Po rejestracji · bez karty · bez limitu czasu
            </p>
          </div>
          <span
            className="text-sm font-bold px-3 py-1 rounded-full"
            style={{ background: "var(--border)", color: "var(--text-muted)" }}
          >
            5 planów
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
                <span>🌟 Najlepszy wybór</span>
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
                    <p className="text-xs font-semibold mt-0.5" style={{ color: "#16A34A" }}>{plan.priceBreakdown}</p>
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

              <CheckoutButton planKey={plan.key} cta={plan.cta} />
            </div>
          </div>
        ))}
      </div>

      {/* Guarantee */}
      <div
        className="mt-5 p-4 rounded-2xl flex items-start gap-3"
        style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}
      >
        <span className="text-xl flex-shrink-0">🛡️</span>
        <div>
          <p className="text-sm font-bold" style={{ color: "#15803D" }}>Gwarancja zwrotu 7 dni</p>
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "#4B5563" }}>
            Jeśli nie jesteś zadowolony w ciągu 7 dni od zakupu — oddamy Ci pieniądze bez pytań.
          </p>
        </div>
      </div>

      <p className="text-xs text-center mt-5" style={{ color: "var(--text-muted)" }}>
        Płatności obsługuje Stripe · Bezpieczne i szyfrowane
      </p>
    </div>
    <SiteFooter />
    </>
  );
}
