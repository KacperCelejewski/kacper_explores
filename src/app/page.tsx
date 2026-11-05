import type { Metadata } from "next";
import HomeClient from "./components/HomeClient";
import HomeFAQ, { FAQS } from "./components/HomeFAQ";
import SiteNav from "./components/SiteNav";
import SiteFooter from "./components/SiteFooter";
import { FEATURED_DESTINATIONS } from "@/lib/cityPhotos";
import { fetchCityPhotoUrl } from "@/lib/unsplashApi";

export const metadata: Metadata = {
  title: "Budżetowe podróże solo po Europie — AI planuje Twój wyjazd",
  description: "Budżetowe podróże solo po Europie — AI planuje Twój wyjazd godzina po godzinie. Restauracje, atrakcje, budżet. 5 planów za darmo.",
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
  description: "Budżetowe planowanie podróży solo — AI układa Twój plan godzina po godzinie. Restauracje, atrakcje, budżet. Zacznij za darmo.",
  applicationCategory: "TravelApplication",
  operatingSystem: "Web",
  inLanguage: "pl",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "PLN",
    description: "5 planów podróży za darmo po rejestracji",
  },
};

export default async function HomePage() {
  const galleryPhotos = await Promise.all(
    FEATURED_DESTINATIONS.map((d) => fetchCityPhotoUrl(d.city))
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <SiteNav />
      <HomeClient galleryPhotos={galleryPhotos} faq={<HomeFAQ />} />
      <SiteFooter />
    </>
  );
}
