"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SiteNav() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setLoggedIn(!!data.session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setLoggedIn(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

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
        Włóczykij
      </Link>
      <div className="flex items-center gap-4">
        <Link
          href="/odkryj"
          className="text-xs font-semibold"
          style={{ color: "var(--text-muted)", textDecoration: "none" }}
        >
          Odkryj
        </Link>
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
        {loggedIn ? (
          <Link
            href="/profile"
            className="text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{ background: "var(--accent)", color: "white", textDecoration: "none" }}
          >
            Mój profil
          </Link>
        ) : (
          <Link
            href="/login"
            className="text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{ background: "var(--accent)", color: "white", textDecoration: "none" }}
          >
            Zaloguj się
          </Link>
        )}
      </div>
    </nav>
  );
}
