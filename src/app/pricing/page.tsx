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
        description: "1 plan podróży po rejestracji, bez karty kredytowej.",
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
  description: "Zacznij za darmo — 1 plan podróży po rejestracji. Pack za 5 zł (5 planów) lub Pro za 19 zł/mies. (nielimitowane plany AI).",
  alternates: {
    canonical: "https://wloczykij.me/pricing",
  },
  openGraph: {
    title: "Plany cenowe | Włóczykij",
    description: "Zacznij za darmo — 1 plan podróży po rejestracji. Pack za 5 zł lub Pro za 19 zł/mies.",
    url: "https://wloczykij.me/pricing",
  },
};

const PLANS = [
  {
    key: "pack_5",
    name: "Pack",
    price: "5 PLN",
    period: "jednorazowo",
    features: [
      "5 planów podróży",
      "Pełny itinerary godzina po godzinie",
      "Triki budżetowe AI",
      "Bez wygasania",
    ],
    highlight: false,
    cta: "Kup Pack →",
    emoji: "🎒",
  },
  {
    key: "pro_monthly",
    name: "Pro",
    price: "19 PLN",
    period: "miesięcznie",
    features: [
      "Nielimitowane plany podróży",
      "Historia wszystkich wyjazdów",
      "Priorytetowe generowanie",
      "Dostęp do nowych funkcji",
    ],
    highlight: true,
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
          Zaczynasz z 1 darmowym planem po rejestracji.
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
              Po rejestracji · bez karty
            </p>
          </div>
          <span
            className="text-sm font-bold px-3 py-1 rounded-full"
            style={{ background: "var(--border)", color: "var(--text-muted)" }}
          >
            1 plan
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
                className="px-5 py-2 text-xs font-bold text-center tracking-wider uppercase"
                style={{ background: "var(--accent)", color: "white" }}
              >
                Najlepszy wybór
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

      <p className="text-xs text-center mt-6" style={{ color: "var(--text-muted)" }}>
        Płatności obsługuje Stripe · Bezpieczne i szyfrowane
      </p>
    </div>
    <SiteFooter />
    </>
  );
}
