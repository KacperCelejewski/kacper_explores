"use client";

import Link from "next/link";
import { useEffect } from "react";
import { IconCompass } from "@/app/components/Icons";
import { EDGE_COPY } from "@/lib/edgeCopy";

// Błąd w renderze strony: ciepły komunikat, ponowienie i droga na początek. Szczegółów nie pokazujemy.
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error("[error-boundary]", error);
  }, [error]);

  return (
    <div role="alert" className="flex flex-col flex-1 px-5 pb-8 justify-center items-center text-center">
      <title>{EDGE_COPY.error.pageTitle}</title>
      <span style={{ color: "var(--accent)" }}><IconCompass size={56} /></span>
      <h1 className="text-2xl font-bold mt-4">{EDGE_COPY.error.title}</h1>
      <p className="text-sm mt-2" style={{ color: "var(--text-muted)", maxWidth: 320 }}>
        {EDGE_COPY.error.body}
      </p>
      <button type="button" onClick={() => retry()} className="btn-primary" style={{ marginTop: "2rem", maxWidth: 280 }}>
        {EDGE_COPY.error.retry}
      </button>
      <Link
        href="/"
        className="text-sm font-semibold mt-4 inline-flex items-center"
        style={{ color: "var(--accent)", minHeight: 44 }}
      >
        {EDGE_COPY.error.home}
      </Link>
    </div>
  );
}
