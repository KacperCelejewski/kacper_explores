"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { setAnalyticsConsent } from "@/lib/analytics";

const STORAGE_KEY = "cookie_consent";

type Consent = "accepted" | "rejected";

function loadConsent(): Consent | null {
  try {
    return localStorage.getItem(STORAGE_KEY) as Consent | null;
  } catch {
    return null;
  }
}

function saveConsent(value: Consent) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch { /* ignore */ }
}

function loadTrackingScript() {
  if (document.getElementById("tp-drive")) return;
  const s = document.createElement("script");
  s.id = "tp-drive";
  s.async = true;
  s.src = "https://emrldco.com/NTI4ODcz.js?t=528873";
  document.head.appendChild(s);
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = loadConsent();
    if (consent === "accepted") {
      loadTrackingScript();
    } else if (!consent) {
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    saveConsent("accepted");
    setAnalyticsConsent(true);
    loadTrackingScript();
    setVisible(false);
  };

  const handleReject = () => {
    saveConsent("rejected");
    setAnalyticsConsent(false);
    setVisible(false);
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
            Niezbędne działają zawsze. Za Twoją zgodą dodajemy partnerskie (linki do lotów) i analityczne (Google Analytics).{" "}
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
