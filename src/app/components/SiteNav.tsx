"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface UserStatus {
  authenticated: boolean;
  credits_remaining?: number;
  is_pro?: boolean;
}

export default function SiteNav() {
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const loadStatus = () => {
      supabase.auth.getSession().then(({ data }) => {
        if (!data.session) { setUserStatus({ authenticated: false }); return; }
        fetch("/api/profile").then((r) => r.json()).then(setUserStatus).catch(() => {});
      });
    };
    loadStatus();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => loadStatus());
    return () => subscription.unsubscribe();
  }, []);

  const loggedIn = userStatus?.authenticated ?? false;
  const credits = userStatus?.credits_remaining ?? 0;
  const isPro = userStatus?.is_pro ?? false;
  const lowCredits = loggedIn && !isPro && credits <= 2;

  return (
    <nav
      className="flex items-center justify-between px-5 py-3 border-b"
      style={{ borderColor: "var(--border)" }}
      aria-label="Nawigacja główna"
    >
      <Link href="/" style={{ textDecoration: "none", lineHeight: 0 }} aria-label="Włóczykij – strona główna">
        <img src="/logo.svg" alt="Włóczykij" height={28} style={{ height: 28, width: "auto" }} />
      </Link>
      <div className="flex items-center gap-3">
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
          <>
            {isPro ? (
              <Link
                href="/profile"
                className="text-xs font-bold px-3 py-1.5 rounded-full"
                style={{ background: "var(--accent)", color: "white", textDecoration: "none" }}
              >
                ✦ Pro
              </Link>
            ) : (
              <Link
                href="/profile"
                className="text-xs font-bold px-3 py-1.5 rounded-full"
                style={{
                  background: lowCredits ? "#FEE2E2" : "var(--accent-light)",
                  color: lowCredits ? "#DC2626" : "var(--accent)",
                  textDecoration: "none",
                  border: `1px solid ${lowCredits ? "#FECACA" : "rgba(196,98,45,0.25)"}`,
                }}
              >
                {credits} {credits === 1 ? "plan" : credits <= 4 ? "plany" : "planów"}
              </Link>
            )}
          </>
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
