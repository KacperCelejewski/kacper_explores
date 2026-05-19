"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { IconHome, IconCompass, IconTag, IconPerson } from "@/app/components/Icons";

type IconFC = React.FC<{ size?: number }>;

const NAV_ITEMS: { href: string; Icon: IconFC; label: string; authOnly?: boolean }[] = [
  { href: "/",        Icon: IconHome,    label: "Główna" },
  { href: "/quiz",    Icon: IconCompass, label: "Planuj" },
  { href: "/pricing", Icon: IconTag,     label: "Cennik" },
  { href: "/profile", Icon: IconPerson,  label: "Konto",  authOnly: true },
];

const LOGIN_ITEM = { href: "/login", Icon: IconPerson, label: "Zaloguj" };

export default function BottomNav() {
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setLoggedIn(!!data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setLoggedIn(!!session?.user);
    });
    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const items = [
    ...NAV_ITEMS.filter((item) => !item.authOnly),
    loggedIn ? NAV_ITEMS.find((i) => i.authOnly)! : LOGIN_ITEM,
  ];

  return (
    <nav
      className="no-print fixed bottom-0 left-1/2 -translate-x-1/2 w-full z-40"
      style={{
        maxWidth: 448,
        background: "var(--bg-primary)",
        borderTop: "1px solid var(--border)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
      aria-label="Nawigacja główna"
    >
      <div className="flex">
        {items.map(({ href, Icon, label }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-opacity"
              style={{ textDecoration: "none", opacity: active ? 1 : 0.5 }}
              aria-current={active ? "page" : undefined}
            >
              <span style={{ color: active ? "var(--accent)" : "var(--text-muted)" }}>
                <Icon size={22} />
              </span>
              <span
                className="text-[10px] font-semibold leading-none"
                style={{ color: active ? "var(--accent)" : "var(--text-muted)" }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
