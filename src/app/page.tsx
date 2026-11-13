import type { Metadata } from "next";
import HomeClient from "./components/HomeClient";
import HomeFAQ, { FAQS } from "./components/HomeFAQ";
import SiteNav from "./components/SiteNav";
import SiteFooter from "./components/SiteFooter";
import { FEATURED_DESTINATIONS } from "@/lib/cityPhotos";
import { fetchCityPhotoUrl } from "@/lib/unsplashApi";
import { getDealsForOrigin } from "@/lib/drop/read";
import { hoursInCity } from "@/lib/drop/stay";
import type { StripDeal } from "./components/DealsStrip";

export const metadata: Metadata = {
  title: "Budżetowy weekend solo w Europie — lot i plan w 3 minuty",
  description: "Odpowiedz na 6 pytań, a dostaniesz 6 kierunków w Twoim budżecie, ceny lotów z polskich lotnisk i plan godzina po godzinie. 2 plany za darmo co miesiąc.",
  alternates: {
    canonical: "https://wloczykij.me",
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  // Z tej samej tablicy co widoczne FAQ, żeby Google i strona mówiły to samo
  mainEntity: FAQS.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

const webAppSchema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Włóczykij",
  url: "https://wloczykij.me",
  description: "Budżetowe weekendy solo w Europie: lot z Polski i plan godzina po godzinie z cenami, knajpami i trikami, jak wydać mniej.",
  applicationCategory: "TravelApplication",
  operatingSystem: "Web",
  inLanguage: "pl",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "PLN",
    description: "2 plany podróży za darmo co miesiąc",
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Włóczykij",
  url: "https://wloczykij.me",
  logo: "https://wloczykij.me/logo.svg",
};

const webSiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Włóczykij",
  url: "https://wloczykij.me",
  inLanguage: "pl",
};

// Okazje w pasku odświeżają się co 10 minut; cron zapisuje je raz w tygodniu, więc częściej nie ma po co
export const revalidate = 600;

const DEFAULT_ORIGIN = "WRO";

// Okazje do paska na stronie głównej; bez bazy albo bez danych strona działa dalej, tylko bez paska
async function loadStripDeals(): Promise<StripDeal[]> {
  try {
    const { deals } = await getDealsForOrigin(DEFAULT_ORIGIN, 3);
    return deals.map((d) => ({
      city_code: d.city_code,
      city: d.city_name,
      price: d.price,
      departure_at: d.departure_at,
      return_at: d.return_at,
      hours: hoursInCity(d),
      fetched_at: d.fetched_at,
    }));
  } catch (err) {
    console.error("[home] okazje", err instanceof Error ? err.message : err);
    return [];
  }
}

export default async function HomePage() {
  const [galleryPhotos, initialDeals] = await Promise.all([
    Promise.all(FEATURED_DESTINATIONS.map((d) => fetchCityPhotoUrl(d.city))),
    loadStripDeals(),
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <SiteNav />
      <HomeClient galleryPhotos={galleryPhotos} faq={<HomeFAQ />} initialDeals={initialDeals} initialDealsOrigin={DEFAULT_ORIGIN} />
      <SiteFooter />
    </>
  );
}
