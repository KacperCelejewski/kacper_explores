"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { countryStats } from "@/lib/world/stats";
import { dealsLinkFor } from "@/lib/world/dealsLink";
import { SHARE_CARD_SIZE, drawShareCard, shareCardLines, shareMap } from "@/lib/world/shareCard";
import { loadVisited, saveVisited, toggleVisited } from "@/lib/world/storage";
import CountryList from "./CountryList";
import StatsPanel from "./StatsPanel";

// ssr: false działa tylko w komponencie klienta (dokumentacja Next 16, lazy-loading), a three.js ładuje się tylko tutaj
const WorldGlobe = dynamic(() => import("./WorldGlobe"), {
  ssr: false,
  loading: () => <div style={{ minHeight: 320 }} aria-hidden="true" />,
});

export default function WorldClient() {
  const [visited, setVisited] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [globeOn, setGlobeOn] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [dealsHref, setDealsHref] = useState(() => dealsLinkFor(null));
  const captureRef = useRef<(() => HTMLCanvasElement | null) | null>(null);
  const firstAction = useRef(true);

  // Zapis, ustawienia i zapamiętane lotnisko czytamy po zamontowaniu (po stronie przeglądarki)
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setVisited(loadVisited());
    setReady(true);
    if (new URLSearchParams(window.location.search).get("bez3d") === "1") setGlobeOn(false);
    try {
      setDealsHref(dealsLinkFor(window.localStorage.getItem("deals_origin")));
    } catch { /* storage zablokowany: zostaje domyślny */ }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const onToggle = useCallback((iso: string) => {
    setVisited((prev) => {
      const next = toggleVisited(prev, iso);
      if (!saveVisited(next)) setNotice("Przeglądarka blokuje zapis, więc mapa zniknie po odświeżeniu strony.");
      if (firstAction.current) {
        firstAction.current = false;
        trackEvent("world_first_action", { countries: next.length });
      }
      return next;
    });
  }, []);

  const onGlobeError = useCallback(() => {
    setGlobeOn(false);
    setNotice("Globus 3D nie działa na tym urządzeniu. Zaznaczaj kraje z listy.");
  }, []);
  const onSnapshot = useCallback((capture: () => HTMLCanvasElement | null) => { captureRef.current = capture; }, []);

  const stats = countryStats(visited);
  const visitedSet = new Set(visited);

  async function share() {
    const canvas = document.createElement("canvas");
    canvas.width = SHARE_CARD_SIZE.width;
    canvas.height = SHARE_CARD_SIZE.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawShareCard(ctx, shareCardLines(stats), captureRef.current?.() ?? null);
    const method = await shareMap(canvas);
    if (method !== "cancelled") trackEvent("world_share", { countries: stats.visited, method });
  }

  if (!ready) return <div style={{ minHeight: 480 }} aria-hidden="true" />;

  const label = `Globus świata: zaznaczono ${stats.visited} z ${stats.total} krajów.`;
  return (
    <div style={{ display: "grid", gap: 24 }}>
      {notice && <p role="status" style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>{notice}</p>}
      {globeOn && <WorldGlobe visited={visitedSet} onToggle={onToggle} onSnapshot={onSnapshot} onError={onGlobeError} label={label} />}
      <StatsPanel stats={stats} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <button
          type="button"
          onClick={share}
          disabled={stats.visited === 0}
          style={{ padding: "12px 20px", borderRadius: 12, border: "none", fontWeight: 700, background: "var(--accent)", color: "#fff", opacity: stats.visited === 0 ? 0.5 : 1, cursor: stats.visited === 0 ? "default" : "pointer" }}
        >
          Udostępnij obrazek
        </button>
        <Link href={dealsHref} style={{ fontSize: 14, fontWeight: 600, color: "var(--accent)" }}>
          Dokąd następny kraj? Zobacz okazje z Twojego lotniska →
        </Link>
      </div>
      <CountryList visited={visitedSet} onToggle={onToggle} />
    </div>
  );
}
