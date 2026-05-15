import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer
      className="px-5 py-6 border-t mt-auto"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          © {new Date().getFullYear()} Kacper Explores
        </p>
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
