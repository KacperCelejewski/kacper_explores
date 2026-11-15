"use client";

import { useEffect, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { setAnalyticsConsent } from "@/lib/analytics";
import { saveConsent, subscribeConsent } from "@/lib/cookieConsent";
import { useCookieConsent } from "./AffiliateProvider";

export default function CookieBanner() {
  const consent = useCookieConsent();
  const hydrated = useSyncExternalStore(subscribeConsent, () => true, () => false);
  const visible = hydrated && consent === null;

  // Dopóki baner jest widoczny, przycisk menu jest schowany (CSS: body.has-cookie-banner)
  useEffect(() => {
    document.body.classList.toggle("has-cookie-banner", visible);
    return () => document.body.classList.remove("has-cookie-banner");
  }, [visible]);

  const handleAccept = () => {
    saveConsent("accepted");
    setAnalyticsConsent(true);
  };

  const handleReject = () => {
    saveConsent("rejected");
    setAnalyticsConsent(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 280 }}
          role="dialog"
          aria-label="Zgoda na pliki cookie"
          style={{
            position: "fixed",
            // Przyklejony do dołu na całą szerokość i niski, żeby nie zasłaniał przycisków w hero
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            background: "var(--bg-primary)",
            borderTop: "1.5px solid var(--border)",
            padding: "12px 16px max(12px, env(safe-area-inset-bottom))",
            boxShadow: "0 -6px 24px rgba(28,16,8,0.10)",
          }}
        >
          <div style={{ maxWidth: 880, margin: "0 auto", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px 20px" }}>
          <div style={{ flex: "1 1 340px", minWidth: 0 }}>
          <p style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
            Używamy plików cookie
          </p>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.45, color: "var(--text-muted)" }}>
            Niezbędne działają zawsze. Za Twoją zgodą włączamy linki partnerskie do lotów, biletów i przechowalni oraz cookies analityczne (Google Analytics).{" "}
            <a
              href="/cookies"
              style={{ color: "var(--accent)", textDecoration: "underline" }}
            >
              Polityka cookies
            </a>
          </p>
          </div>
          <div style={{ display: "flex", gap: 8, flex: "0 1 320px", minWidth: 260 }}>
            <button
              onClick={handleAccept}
              style={{
                flex: 1,
                padding: "12px 0",
                borderRadius: 12,
                border: "none",
                background: "var(--accent)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Akceptuj wszystkie
            </button>
            <button
              onClick={handleReject}
              style={{
                flex: 1,
                padding: "12px 0",
                borderRadius: 12,
                border: "1.5px solid var(--border)",
                background: "transparent",
                color: "var(--text-secondary)",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Tylko niezbędne
            </button>
          </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
