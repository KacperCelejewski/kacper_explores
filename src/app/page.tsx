import type { Metadata } from "next";
import HomeClient from "./components/HomeClient";
import HomeFAQ, { FAQS } from "./components/HomeFAQ";
import SiteNav from "./components/SiteNav";
import SiteFooter from "./components/SiteFooter";
import { FEATURED_DESTINATIONS } from "@/lib/cityPhotos";
import { fetchCityPhotoUrl } from "@/lib/unsplashApi";

export const metadata: Metadata = {
  // absolute, bo szablon "%s | Włóczykij" z layoutu nie obejmuje strony głównej
  title: { absolute: "Włóczykij — budżetowy weekend solo w Europie w 3 minuty" },
  description: "Odpowiedz na 6 pytań, a dostaniesz 6 kierunków w Twoim budżecie, ceny lotów z polskich lotnisk i plan godzina po godzinie. 5 planów za darmo.",
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
    description: "5 planów podróży za darmo po rejestracji",
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Włóczykij",
  alternateName: ["Wloczykij", "wloczykij.me"],
  url: "https://wloczykij.me",
  logo:"https://wloczykij.me/logo.svg",
};

const webSiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Włóczykij",
  alternateName: ["Wloczykij", "wloczykij.me"],
  url: "https://wloczykij.me",
  inLanguage: "pl",
};

export default async function HomePage() {
  const galleryPhotos = await Promise.all(
    FEATURED_DESTINATIONS.map((d) => fetchCityPhotoUrl(d.city))
  );

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
      <HomeClient galleryPhotos={galleryPhotos} faq={<HomeFAQ />} />
      <SiteFooter />
    </>
  );
}
