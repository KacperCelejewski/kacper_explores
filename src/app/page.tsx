import type { Metadata } from "next";
import HomeClient from "./components/HomeClient";
import SiteNav from "./components/SiteNav";
import SiteFooter from "./components/SiteFooter";

export const metadata: Metadata = {
  title: "Budżetowe podróże solo po Europie — AI planuje Twój wyjazd",
  description: "Budżetowe podróże solo z Polski — AI planuje Twój wyjazd godzina po godzinie. Najtańsze loty z WRO i nie tylko. Zacznij za darmo.",
  alternates: {
    canonical: "https://wloczykij.me",
  },
};

const webAppSchema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Kacper Explores",
  url: "https://wloczykij.me",
  description: "Budżetowe planowanie podróży solo — najtańsze loty i plany AI godzina po godzinie.",
  applicationCategory: "TravelApplication",
  operatingSystem: "Web",
  inLanguage: "pl",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "PLN",
    description: "1 plan podróży za darmo po rejestracji",
  },
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppSchema) }}
      />
      <SiteNav />
      <HomeClient />
      <SiteFooter />
    </>
  );
}
