import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer
      className="px-5 py-6 border-t mt-auto"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            © {new Date().getFullYear()} Włóczykij
          </p>
          <a
            href="mailto:hej@wloczykij.me"
            className="text-xs"
            style={{ color: "var(--text-muted)", textDecoration: "none" }}
          >
            hej@wloczykij.me
          </a>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-xs"
            style={{ color: "var(--text-muted)", textDecoration: "none" }}
          >
            Strona główna
          </Link>
          <Link
            href="/blog"
            className="text-xs"
            style={{ color: "var(--text-muted)", textDecoration: "none" }}
          >
            Blog
          </Link>
          <Link
            href="/pricing"
            className="text-xs"
            style={{ color: "var(--text-muted)", textDecoration: "none" }}
          >
            Cennik
          </Link>
          <Link
            href="/regulamin"
            className="text-xs"
            style={{ color: "var(--text-muted)", textDecoration: "none" }}
          >
            Regulamin
          </Link>
          <Link
            href="/privacy"
            className="text-xs"
            style={{ color: "var(--text-muted)", textDecoration: "none" }}
          >
            Prywatność
          </Link>
          <Link
            href="/quiz"
            className="text-xs font-semibold"
            style={{ color: "var(--accent)", textDecoration: "none" }}
          >
            Zaplanuj podróż →
          </Link>
        </div>
      </div>
    </footer>
  );
}
