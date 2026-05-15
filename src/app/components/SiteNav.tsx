import Link from "next/link";

export default function SiteNav() {
  return (
    <nav
      className="flex items-center justify-between px-5 py-3 border-b"
      style={{ borderColor: "var(--border)" }}
      aria-label="Nawigacja główna"
    >
      <Link
        href="/"
        className="text-sm font-bold tracking-wide"
        style={{ color: "var(--accent)", textDecoration: "none" }}
      >
        Kacper Explores
      </Link>
      <div className="flex items-center gap-4">
        <Link
          href="/blog"
          className="text-xs font-semibold"
          style={{ color: "var(--text-muted)", textDecoration: "none" }}
        >
          Blog
        </Link>
        <Link
          href="/pricing"
          className="text-xs font-semibold"
          style={{ color: "var(--text-muted)", textDecoration: "none" }}
        >
          Cennik
        </Link>
        <Link
          href="/login"
          className="text-xs font-semibold px-3 py-1.5 rounded-full"
          style={{ background: "var(--accent)", color: "white", textDecoration: "none" }}
        >
          Zaloguj się
        </Link>
      </div>
    </nav>
  );
}
