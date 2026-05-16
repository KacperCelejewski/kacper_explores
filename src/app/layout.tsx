import type { Metadata, Viewport } from "next";
import { Geist, Cormorant_Garamond } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import GlobalMenu from "@/app/components/GlobalMenu";
import CookieBanner from "@/app/components/CookieBanner";


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
    default: "Włóczykij — Budżetowe podróże solo",
    template: "%s | Włóczykij",
  },
  description: "Budżetowe podróże solo z Polski — AI planuje Twój wyjazd godzina po godzinie. Najtańsze loty z WRO i nie tylko. Zacznij za darmo.",
  metadataBase: new URL("https://wloczykij.me"),
  alternates: {
    canonical: "https://wloczykij.me",
  },
  openGraph: {
    type: "website",
    locale: "pl_PL",
    url: "https://wloczykij.me",
    siteName: "Włóczykij",
    title: "Włóczykij — Budżetowe podróże solo",
    description: "Odpowiedz na 6 pytań — AI znajdzie najtańszy lot i zaplanuje Twój wyjazd godzina po godzinie.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Włóczykij — Budżetowe podróże solo po Europie" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Włóczykij — Budżetowe podróże solo",
    description: "Odpowiedz na 6 pytań — AI znajdzie najtańszy lot i zaplanuje Twój wyjazd godzina po godzinie.",
    images: ["/opengraph-image"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5EFE0" },
    { media: "(prefers-color-scheme: dark)", color: "#1C1008" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" className={`${geist.variable} ${cormorant.variable}`}>
      <body>
        <a href="#main-content" className="skip-link">Przejdź do treści</a>
        <main id="main-content" className="app-shell">
          {children}
          <GlobalMenu />
          <CookieBanner />
        </main>
        <Script
          id="sw-register"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(()=>{})}`,
          }}
        />
      </body>
    </html>
  );
}
