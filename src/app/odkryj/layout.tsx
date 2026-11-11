import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Odkryj plany podróży innych",
  description: "Galeria publicznych planów weekendów w Europie — zobacz, dokąd jadą inni, ile to kosztuje i jak wygląda plan godzina po godzinie.",
  alternates: { canonical: "https://wloczykij.me/odkryj" },
};

export default function OdkryjLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
