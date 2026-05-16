"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import {
  IconHome,
  IconCompass,
  IconPerson,
  IconTag,
  IconBook,
} from "@/app/components/Icons";

type IconComponent = React.FC<{ size?: number }>;

function MenuItem({ href, Icon, label, onClick }: {
  href: string; Icon: IconComponent; label: string; onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 py-3.5 border-b text-sm font-medium transition-opacity hover:opacity-70"
      style={{ borderColor: "var(--border)", color: "var(--text-primary)", textDecoration: "none" }}
    >
      <span className="w-7 flex-shrink-0 flex items-center justify-center" style={{ color: "var(--text-muted)" }}>
        <Icon size={18} />
      </span>
      {label}
    </Link>
  );
}

export default function GlobalMenu() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();
  const fabRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Focus first element in sheet when opened
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      const focusable = sheetRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      focusable?.[0]?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [open]);

  // Escape key + focus trap
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { close(); return; }
      if (e.key !== "Tab" || !sheetRef.current) return;
      const focusable = Array.from(
        sheetRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    close();
    router.push("/");
    router.refresh();
  };

  const close = () => {
    setOpen(false);
    setTimeout(() => fabRef.current?.focus(), 50);
  };

  return (
    <>
      {/* FAB */}
      <button
        ref={fabRef}
        onClick={() => setOpen(true)}
        aria-label="Otwórz menu"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="no-print fixed z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95"
        style={{
          bottom: "1.5rem",
          right: "max(1.25rem, calc(50vw - 224px + 1.25rem))",
          background: "var(--green)",
          color: "white",
        }}
      >
        <IconCompass size={20} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="no-print fixed inset-0 z-40 bg-black/40"
              onClick={close}
            />

            {/* Bottom sheet */}
            <motion.div
              ref={sheetRef}
              key="sheet"
              role="dialog"
              aria-modal="true"
              aria-label="Menu nawigacji"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 320 }}
              className="no-print fixed bottom-0 left-1/2 -translate-x-1/2 w-full z-50 rounded-t-3xl"
              style={{ maxWidth: 448, background: "var(--bg-primary)", borderTop: "1px solid var(--border)" }}
            >
              {/* Drag handle (decorative) */}
              <div className="flex justify-center pt-3 pb-1" aria-hidden="true">
                <div className="w-10 h-1 rounded-full" style={{ background: "var(--border)" }} />
              </div>

              {/* User chip */}
              {email && (
                <div className="mx-5 mt-3 mb-2 px-4 py-3 rounded-2xl flex items-center gap-3" style={{ background: "var(--accent-light)", border: "1px solid rgba(196,98,45,0.2)" }}>
                  <span className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ background: "var(--accent)" }}>
                    {email.slice(0, 1).toUpperCase()}
                  </span>
                  <p className="text-sm font-semibold truncate">{email}</p>
                </div>
              )}

              {/* Nav links */}
              <nav className="px-5 mt-2">
                <MenuItem href="/"        Icon={IconHome}    label="Strona główna"  onClick={close} />
                <MenuItem href="/quiz"    Icon={IconCompass} label="Planuj wyjazd"  onClick={close} />
                {email && <MenuItem href="/profile" Icon={IconPerson} label="Moje konto" onClick={close} />}
                <MenuItem href="/pricing" Icon={IconTag}     label="Cennik"         onClick={close} />
                <MenuItem href="/blog"    Icon={IconBook}    label="Blog"           onClick={close} />
              </nav>

              {/* Auth action */}
              <div className="px-5 pt-3 pb-8 mt-2">
                {email ? (
                  <button
                    onClick={handleSignOut}
                    className="w-full text-sm font-semibold py-3 rounded-2xl transition-opacity hover:opacity-70"
                    style={{ background: "var(--bg-surface)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
                  >
                    Wyloguj się
                  </button>
                ) : (
                  <Link
                    href="/login"
                    onClick={close}
                    className="w-full text-sm font-semibold py-3.5 rounded-2xl flex items-center justify-center transition-opacity hover:opacity-90"
                    style={{ background: "var(--accent)", color: "white", textDecoration: "none" }}
                  >
                    Zaloguj się →
                  </Link>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
