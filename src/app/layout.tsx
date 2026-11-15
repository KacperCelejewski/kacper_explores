import type { Metadata, Viewport } from "next";
import { Geist, Cormorant_Garamond } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import GlobalMenu from "@/app/components/GlobalMenu";
import CookieBanner from "@/app/components/CookieBanner";
import NewsletterPopup from "@/app/components/NewsletterPopup";
import MotionProvider from "@/app/components/MotionProvider";
import Analytics from "@/app/components/Analytics";
import { META } from "@/lib/homeCopy";
import { AffiliateProvider } from "@/app/components/AffiliateProvider";
import { readAffiliateConfig } from "@/lib/affiliate";


const geist = Geist({ subsets: ["latin"], variable: "--font-body" });
const cormorant = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  manifest: "/manifest.webmanifest",
  title: {
    default: META.titleDefault,
    template: "%s | Włóczykij",
  },
  description: META.description,
  metadataBase: new URL("https://wloczykij.me"),
  openGraph: {
    type: "website",
    locale: "pl_PL",
    url: "https://wloczykij.me",
    siteName: "Włóczykij",
    title: META.titleDefault,
    description: META.shortDescription,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: META.ogAlt }],
  },
  twitter: {
    card: "summary_large_image",
    title: META.titleDefault,
    description: META.shortDescription,
    images: ["/opengraph-image"],
  },
};

export const viewport: Viewport = {
  // The site has no dark theme, so the browser bar stays sand in both modes
  themeColor: "#F5EFE0",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" className={`${geist.variable} ${cormorant.variable}`}>
      <body>
        <a href="#main-content" className="skip-link">Przejdź do treści</a>
        <MotionProvider>
          <AffiliateProvider config={readAffiliateConfig()}>
          <main id="main-content" className="app-shell">
            {children}
            <GlobalMenu />
            <CookieBanner />
            <NewsletterPopup />
          </main>
          </AffiliateProvider>
        </MotionProvider>
        <Analytics />
        <Script
          id="sw-register"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            // W dev SW trzyma stare pliki i psuje HMR, więc tam go tylko wyrejestrowujemy
            __html: process.env.NODE_ENV === "production"
              ? `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(()=>{})}`
              : `if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(function(r){r.forEach(function(x){x.unregister()})})}`,
          }}
        />
      </body>
    </html>
  );
}
