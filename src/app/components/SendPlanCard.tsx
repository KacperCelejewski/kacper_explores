"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { IconCheck, IconLink } from "@/app/components/Icons";
import { CREW_COPY, shareUrl } from "@/lib/groupFlow";

interface Props {
  tripId: string;
  city: string;
  title: string;
  isPublic: boolean;
  /** Włącza publiczny link (ta sama flaga co galeria Odkryj); zwraca true, gdy się udało. */
  onMakePublic: () => Promise<boolean>;
}

type Notice = { kind: "ok" | "error"; text: string } | null;

// Główna akcja po wygenerowaniu planu: wyślij go ekipie. Link otwiera plan bez konta.
// Plan prywatny najpierw prosimy o zgodę na publiczność, bo jedna flaga `is_public` otwiera i link, i galerię.
export default function SendPlanCard({ tripId, city, title, isPublic, onMakePublic }: Props) {
  // Systemowe okno udostępniania jest tylko na części przeglądarek; na serwerze zakładamy, że go nie ma
  const canShare = useSyncExternalStore(
    () => () => {},
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
    () => false,
  );
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const descId = useId();
  const linkRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const flash = (n: Notice) => {
    setNotice(n);
    if (timer.current) clearTimeout(timer.current);
    if (n?.kind === "ok") timer.current = setTimeout(() => setNotice(null), 6000);
  };

  const url = typeof window === "undefined" ? "" : shareUrl(window.location.origin, tripId);

  const sendLink = async () => {
    if (canShare) {
      try {
        await navigator.share({ title: `Plan: ${city}`, url });
        flash({ kind: "ok", text: CREW_COPY.sendCopied });
        return;
      } catch (err) {
        // Zamknięcie okna udostępniania to nie błąd; inne awarie przechodzą na kopiowanie
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      flash({ kind: "ok", text: CREW_COPY.sendCopied });
    } catch {
      flash({ kind: "error", text: CREW_COPY.sendCopyFailed });
      linkRef.current?.select();
    }
  };

  const onPrimary = async () => {
    if (!isPublic) {
      setConfirming(true);
      setNotice(null);
      return;
    }
    await sendLink();
  };

  const onConfirm = async () => {
    setBusy(true);
    const ok = await onMakePublic();
    setBusy(false);
    if (!ok) {
      flash({ kind: "error", text: CREW_COPY.sendFailed });
      return;
    }
    setConfirming(false);
    // Kopiowanie i systemowe udostępnianie wymagają świeżego stuknięcia, więc po włączeniu linku
    // użytkownik dostaje ten sam przycisk jeszcze raz zamiast automatycznej próby po zapytaniu do serwera.
    flash({ kind: "ok", text: CREW_COPY.sendNowPublic });
  };

  return (
    <section
      className="rounded-2xl p-4 no-print"
      style={{ background: "var(--accent-light)", border: "1px solid var(--border)" }}
      aria-labelledby={`${descId}-title`}
    >
      <h2 id={`${descId}-title`} className="text-xl font-bold" style={{ color: "var(--accent)" }}>
        {title}
      </h2>
      <p id={descId} className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
        {CREW_COPY.sendHelp}
      </p>

      {confirming && !isPublic ? (
        <div className="mt-3" role="group" aria-label={CREW_COPY.sendConfirmTitle}>
          <p className="text-sm font-semibold">{CREW_COPY.sendConfirmTitle}</p>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {CREW_COPY.sendConfirmBody}
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              className="rounded-xl px-4 text-sm font-bold disabled:opacity-50"
              style={{ background: "var(--accent)", color: "#fff", minHeight: 48 }}
            >
              {busy ? "…" : CREW_COPY.sendConfirmYes}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={busy}
              className="rounded-xl px-4 text-sm font-semibold"
              style={{ background: "var(--bg-surface)", color: "var(--text-secondary)", border: "1px solid var(--border)", minHeight: 48 }}
            >
              {CREW_COPY.sendConfirmNo}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onPrimary}
          aria-describedby={descId}
          className="mt-3 w-full rounded-xl text-sm font-bold flex items-center justify-center gap-2"
          style={{ background: "var(--accent)", color: "#fff", minHeight: 48 }}
        >
          <IconLink size={16} />
          {canShare ? CREW_COPY.sendButtonShare : CREW_COPY.sendButton}
        </button>
      )}

      <div role="status" aria-live="polite" className="text-sm mt-2" style={{ minHeight: 20 }}>
        {notice && (
          <span
            className="inline-flex items-center gap-1.5 font-semibold"
            style={{ color: notice.kind === "ok" ? "var(--success)" : "var(--error)" }}
          >
            {notice.kind === "ok" && <IconCheck size={14} />}
            {notice.text}
          </span>
        )}
      </div>

      {isPublic && (
        <label className="block mt-2">
          <span className="sr-only">Publiczny link do planu</span>
          <input
            ref={linkRef}
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full rounded-xl px-3 text-xs"
            style={{
              minHeight: 44,
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
            }}
          />
        </label>
      )}
    </section>
  );
}
