"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
    loadTrackingScript();
    setVisible(false);
  };

  const handleReject = () => {
    saveConsent("rejected");
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
            bottom: 80, // above GlobalMenu nav
            left: "50%",
            transform: "translateX(-50%)",
            width: "calc(100% - 32px)",
            maxWidth: 480,
            zIndex: 100,
            background: "var(--background, #fff)",
            border: "1.5px solid var(--border, #e5e5e5)",
            borderRadius: 20,
            padding: "16px 18px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          }}
        >
          <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
            🍪 Używamy plików cookie
          </p>
          <p style={{ margin: "0 0 14px", fontSize: 12, lineHeight: 1.5, color: "var(--text-muted)" }}>
            Niezbędne cookies działają zawsze. Za Twoją zgodą używamy też cookies partnerskich (linki afiliacyjne do lotów).{" "}
            <a
              href="/cookies"
              style={{ color: "var(--accent)", textDecoration: "underline" }}
            >
              Polityka cookies
            </a>
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleAccept}
              style={{
                flex: 1,
                padding: "10px 0",
                borderRadius: 12,
                border: "none",
                background: "var(--accent, #FF6B35)",
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
                padding: "10px 0",
                borderRadius: 12,
                border: "1.5px solid var(--border, #e5e5e5)",
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}
