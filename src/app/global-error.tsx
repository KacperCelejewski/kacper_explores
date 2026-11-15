"use client";

import { useEffect } from "react";
import { EDGE_COPY } from "@/lib/edgeCopy";

// Błąd w samym układzie głównym: ta strona zastępuje cały dokument, więc nie ma tu stylów globalnych ani czcionek.
// Kolory ze znaku marki (krem, ciemna czekolada, cegła) są wpisane na sztywno.
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="pl">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "0 20px",
          background: "#F5EFE0",
          color: "#1C1008",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        <title>{EDGE_COPY.error.pageTitle}</title>
        <main role="alert" style={{ maxWidth: 360 }}>
          <h1 style={{ fontSize: 28, margin: "0 0 8px" }}>{EDGE_COPY.error.title}</h1>
          <p style={{ fontSize: 15, lineHeight: 1.5, color: "#7A5C44", margin: 0 }}>{EDGE_COPY.error.body}</p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              marginTop: 28,
              minHeight: 48,
              padding: "0 28px",
              borderRadius: 16,
              border: 0,
              background: "#A04B20",
              color: "#FFFFFF",
              fontSize: 16,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {EDGE_COPY.error.retry}
          </button>
          <p style={{ marginTop: 20 }}>
            {/* Zwykły link: po błędzie w układzie głównym potrzebne jest pełne przeładowanie, nie nawigacja klienta */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ color: "#A04B20", fontWeight: 600, display: "inline-block", padding: "12px 8px" }}>
              {EDGE_COPY.error.home}
            </a>
          </p>
        </main>
      </body>
    </html>
  );
}
