import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
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
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Włóczykij" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Włóczykij — Budżetowe podróże solo",
    description: "Odpowiedz na 6 pytań — AI znajdzie najtańszy lot i zaplanuje Twój wyjazd godzina po godzinie.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#1A1A1A" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" className={geist.variable}>
      <body>
        <main className="app-shell">
          {children}
        </main>
        <Script
          id="tp-drive"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `(function(){var s=document.createElement("script");s.async=1;s.src="https://emrldco.com/NTI4ODcz.js?t=528873";document.head.appendChild(s);})();`,
          }}
        />
      </body>
    </html>
  );
}
