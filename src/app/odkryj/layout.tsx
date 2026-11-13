import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Odkryj plany podróży innych",
  description: "Galeria publicznych planów weekendów w Europie — zobacz, dokąd jadą inni, ile to kosztuje i jak wygląda plan godzina po godzinie.",
  // Galeria jest pusta, dopóki nie ma publicznych planów, więc nie trafia do wyszukiwarki
  robots: { index: false, follow: true },
  alternates: { canonical: "https://wloczykij.me/odkryj" },
};

export default function OdkryjLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
