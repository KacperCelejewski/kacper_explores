"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { formatPlans } from "@/lib/formatPlans";
import { resolveOrigin } from "@/lib/drop/defaults";

interface UserStatus {
  authenticated: boolean;
  credits_remaining?: number;
  is_pro?: boolean;
}

export default function SiteNav() {
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  // Link „Okazje” prowadzi na ostatnio wybrane lotnisko (to samo, co zapamiętuje pasek na stronie głównej)
  const [dealsOrigin, setDealsOrigin] = useState("WRO");

  useEffect(() => {
    try { setDealsOrigin(resolveOrigin(window.localStorage.getItem("deals_origin"))); } catch { /* storage zablokowany */ }
  }, []);

  useEffect(() => {
    const supabase = createSupabaseClient();
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
  const noCredits = loggedIn && !isPro && credits === 0;

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
          href={`/okazje/${dealsOrigin.toLowerCase()}`}
          className="text-xs font-semibold py-2"
          style={{ color: "var(--text-muted)", textDecoration: "none" }}
        >
          Okazje
        </Link>
        {/* Na wąskich ekranach Blog jest w menu pod przyciskiem, tu się nie mieści */}
        <Link
          href="/blog"
          className="hidden sm:inline text-xs font-semibold py-2"
          style={{ color: "var(--text-muted)", textDecoration: "none" }}
        >
          Blog
        </Link>
        <Link
          href="/pricing"
          className="text-xs font-semibold py-2"
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
                Pro
              </Link>
            ) : (
              <Link
                href="/profile"
                className="text-xs font-bold px-3 py-1.5 rounded-full"
                style={{
                  background: noCredits ? "var(--error-bg)" : "var(--accent-light)",
                  color: noCredits ? "var(--error)" : "var(--accent)",
                  textDecoration: "none",
                  border: `1px solid ${noCredits ? "var(--error)" : "var(--border)"}`,
                }}
              >
                {formatPlans(credits)}
              </Link>
            )}
          </>
        ) : (
          <Link
            href="/login"
            className="text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap"
            style={{ background: "var(--accent)", color: "white", textDecoration: "none" }}
          >
            Zaloguj się
          </Link>
        )}
      </div>
    </nav>
  );
}
