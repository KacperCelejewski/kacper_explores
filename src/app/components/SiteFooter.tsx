import Link from "next/link";
import { POLISH_AIRPORTS } from "@/lib/airports";
import { ORIGIN_GENITIVE } from "@/lib/drop/email";

export default function SiteFooter() {
  return (
    <footer
      className="px-5 py-6 border-t mt-auto"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            © {new Date().getFullYear()} Włóczykij · Obudź w sobie Włóczykija.
          </p>
          <a
            href="mailto:hej@wloczykij.me"
            className="text-xs inline-block py-1.5"
            style={{ color: "var(--text-muted)", textDecoration: "none" }}
          >
            hej@wloczykij.me
          </a>
        </div>
        <nav aria-label="Okazje na weekend" className="w-full flex items-center flex-wrap gap-x-4 gap-y-1">
          <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Tanie loty na weekend z:</span>
          {POLISH_AIRPORTS.map((a) => (
            <Link
              key={a.code}
              href={`/okazje/${a.code.toLowerCase()}`}
              className="text-xs inline-block py-2"
              style={{ color: "var(--text-muted)", textDecoration: "none" }}
            >
              {ORIGIN_GENITIVE[a.code] ?? a.city}
            </Link>
          ))}
        </nav>
        <div className="flex items-center flex-wrap gap-x-4 gap-y-2">
          <Link
            href="/"
            className="text-xs inline-block py-1.5"
            style={{ color: "var(--text-muted)", textDecoration: "none" }}
          >
            Strona główna
          </Link>
          <Link
            href="/#zrzut"
            className="text-xs inline-block py-1.5"
            style={{ color: "var(--text-muted)", textDecoration: "none" }}
          >
            Czwartkowy zrzut
          </Link>
          <Link
            href="/blog"
            className="text-xs inline-block py-1.5"
            style={{ color: "var(--text-muted)", textDecoration: "none" }}
          >
            Blog
          </Link>
          <Link
            href="/pricing"
            className="text-xs inline-block py-1.5"
            style={{ color: "var(--text-muted)", textDecoration: "none" }}
          >
            Cennik
          </Link>
          <Link
            href="/regulamin"
            className="text-xs inline-block py-1.5"
            style={{ color: "var(--text-muted)", textDecoration: "none" }}
          >
            Regulamin
          </Link>
          <Link
            href="/privacy"
            className="text-xs inline-block py-1.5"
            style={{ color: "var(--text-muted)", textDecoration: "none" }}
          >
            Prywatność
          </Link>
          <Link
            href="/quiz"
            className="text-xs font-semibold inline-block py-1.5"
            style={{ color: "var(--accent)", textDecoration: "none" }}
          >
            Zaplanuj podróż →
          </Link>
        </div>
      </div>
    </footer>
  );
}
