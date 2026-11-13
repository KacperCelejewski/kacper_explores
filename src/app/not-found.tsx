import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "./components/SiteNav";
import { IconCompass } from "./components/Icons";

export const metadata: Metadata = {
  title: "Nie znaleziono strony",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <>
      <SiteNav />
      <div className="flex flex-col flex-1 px-5 pb-8 justify-center items-center text-center">
        <span style={{ color: "var(--accent)" }}><IconCompass size={56} /></span>
        <h1 className="text-2xl font-bold mt-4">Nie znaleziono strony</h1>
        <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
          Wygląda na to, że ta trasa nie istnieje. Zacznij od czegoś, co działa.
        </p>
        <Link
          href="/okazje/wro"
          className="btn-primary"
          style={{ display: "block", textAlign: "center", textDecoration: "none", marginTop: "2rem" }}
        >
          Zobacz okazje na weekend →
        </Link>
        <Link href="/quiz" className="text-sm font-semibold mt-4 py-2" style={{ color: "var(--accent)" }}>
          Albo dobierz wyjazd quizem
        </Link>
      </div>
    </>
  );
}
