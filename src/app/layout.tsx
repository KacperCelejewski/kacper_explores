import type { Metadata, Viewport } from "next";
import { Geist, Cormorant_Garamond } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import GlobalMenu from "@/app/components/GlobalMenu";
import CookieBanner from "@/app/components/CookieBanner";
import NewsletterPopup from "@/app/components/NewsletterPopup";
import MotionProvider from "@/app/components/MotionProvider";
import Analytics from "@/app/components/Analytics";


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
    default: "Włóczykij — budżetowe weekendy solo w Europie",
    template: "%s | Włóczykij",
  },
  description: "Odpowiedz na 6 pytań, a dostaniesz 6 kierunków w Twoim budżecie, ceny lotów z polskich lotnisk i plan godzina po godzinie. 5 planów za darmo.",
  metadataBase: new URL("https://wloczykij.me"),
  openGraph: {
    type: "website",
    locale: "pl_PL",
    url: "https://wloczykij.me",
    siteName: "Włóczykij",
    title: "Włóczykij — budżetowe weekendy solo w Europie",
    description: "Odpowiedz na 6 pytań i dostań lot oraz plan godzina po godzinie. Ceny, knajpy i triki — w Twoim budżecie.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Włóczykij — budżetowy weekend w Europie" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Włóczykij — budżetowe weekendy solo w Europie",
    description: "Odpowiedz na 6 pytań i dostań lot oraz plan godzina po godzinie. Ceny, knajpy i triki — w Twoim budżecie.",
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
          <main id="main-content" className="app-shell">
            {children}
            <GlobalMenu />
            <CookieBanner />
            <NewsletterPopup />
          </main>
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
