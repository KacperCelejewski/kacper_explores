import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "./components/SiteNav";
import { IconCompass } from "./components/Icons";
import { EDGE_COPY } from "@/lib/edgeCopy";

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
        <h1 className="text-2xl font-bold mt-4">{EDGE_COPY.notFound.title}</h1>
        <p className="text-sm mt-2" style={{ color: "var(--text-muted)", maxWidth: 320 }}>
          {EDGE_COPY.notFound.body}
        </p>
        <Link
          href="/okazje/wro"
          className="btn-primary"
          style={{ display: "block", textAlign: "center", textDecoration: "none", marginTop: "2rem" }}
        >
          {EDGE_COPY.notFound.primary}
        </Link>
        <Link href="/quiz" className="text-sm font-semibold mt-4 inline-flex items-center" style={{ color: "var(--accent)", minHeight: 44 }}>
          {EDGE_COPY.notFound.secondary}
        </Link>
      </div>
    </>
  );
}
