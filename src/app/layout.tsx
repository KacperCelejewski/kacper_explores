import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "Kacper Explores — Budżetowe podróże solo",
  description: "Znajdź najtańszy lot i wygeneruj plan podróży dopasowany do Twoich preferencji.",
};

export const viewport: Viewport = {
  themeColor: "#0a0f1e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" className={geist.variable}>
      <body>
        <main className="app-shell">
          {children}
        </main>
      </body>
    </html>
  );
}
