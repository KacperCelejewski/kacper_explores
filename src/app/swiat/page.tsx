import type { Metadata } from "next";
import SiteNav from "@/app/components/SiteNav";
import SiteFooter from "@/app/components/SiteFooter";
import WorldClient from "./WorldClient";

export const metadata: Metadata = {
  title: "Mapa świata: gdzie już byłeś",
  description: "Zaznacz kraje, w których byłeś, na globusie 3D. Zobacz, ile procent świata i każdego kontynentu zwiedziłeś, i wrzuć wynik na Instagram.",
  alternates: { canonical: "https://wloczykij.me/swiat" },
};

export default function WorldPage() {
  return (
    <>
      <SiteNav />
      <main className="max-w-2xl mx-auto w-full px-5 pb-12">
        <div className="pt-10 pb-6">
          <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: "var(--accent)" }}>Mapa świata</p>
          <h1 className="text-3xl font-bold leading-tight">Ile świata już zobaczyłeś?</h1>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Dotknij kraju na globusie albo znajdź go na liście. Mapa zapisuje się w Twojej przeglądarce, bez konta.
          </p>
        </div>
        <WorldClient />
      </main>
      <SiteFooter />
    </>
  );
}
