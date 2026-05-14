import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "Kacper Explores — Budżetowe podróże solo",
  description: "Znajdź najtańszy lot i wygeneruj plan podróży dopasowany do Twoich preferencji.",
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
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
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){var s=document.createElement("script");s.async=1;s.src="https://emrldco.com/NTI4ODcz.js?t=528873";document.head.appendChild(s);})();`,
          }}
        />
      </body>
    </html>
  );
}
