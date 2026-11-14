"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import { MeshLambertMaterial } from "three";
import { countryName } from "@/lib/world/countries";

interface Props {
  visited: ReadonlySet<string>;
  onToggle: (iso: string) => void;
  onSnapshot: (capture: () => HTMLCanvasElement | null) => void;
  onError: () => void;
  // Opis dla czytników ekranu z aktualnymi liczbami
  label: string;
}

interface Shape {
  properties: { iso: string | null; sovereign: boolean; name: string | null };
}

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function cssColor(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export default function WorldGlobe({ visited, onToggle, onSnapshot, onError, label }: Props) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const boxRef = useRef<HTMLDivElement>(null);
  const [shapes, setShapes] = useState<Shape[] | null>(null);
  const [width, setWidth] = useState(0);
  const [palette, setPalette] = useState<{ accent: string; land: string; territory: string; sea: string; atmosphere: string } | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Kolory ze strony i ustawienia ruchu czytamy raz, po zamontowaniu (po stronie przeglądarki)
  useEffect(() => {
    if (!hasWebGL()) {
      onError();
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPalette({
      accent: cssColor("--accent", "#A04B20"),
      land: cssColor("--border", "#CFC0A4"),
      territory: cssColor("--bg-surface", "#EDE8D8"),
      sea: cssColor("--bg-primary", "#F5EFE0"),
      atmosphere: cssColor("--accent-light", "#F0DFD0"),
    });
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, [onError]);

  useEffect(() => {
    let cancelled = false;
    fetch("/world/countries.geojson")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((geo: { features: Shape[] }) => { if (!cancelled) setShapes(geo.features); })
      .catch(() => { if (!cancelled) onError(); });
    return () => { cancelled = true; };
  }, [onError]);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setWidth(el.clientWidth));
    observer.observe(el);
    setWidth(el.clientWidth);
    return () => observer.disconnect();
  }, []);

  const seaMaterial = useMemo(() => (palette ? new MeshLambertMaterial({ color: palette.sea }) : undefined), [palette]);

  // Obrót wyłączamy przy ustawieniu „ogranicz ruch” i po pierwszym dotknięciu globusu
  const onReady = useCallback(() => {
    const controls = globeRef.current?.controls();
    if (controls) {
      controls.autoRotate = !reducedMotion;
      controls.autoRotateSpeed = 0.5;
      controls.enableZoom = false;
    }
    onSnapshot(() => globeRef.current?.renderer().domElement ?? null);
  }, [reducedMotion, onSnapshot]);

  const stopRotation = () => {
    const controls = globeRef.current?.controls();
    if (controls) controls.autoRotate = false;
  };

  if (!palette) return <div ref={boxRef} style={{ width: "100%", minHeight: 320 }} />;

  const size = Math.min(width || 480, 640);
  return (
    <div
      ref={boxRef}
      role="img"
      aria-label={label}
      onPointerDown={stopRotation}
      style={{ width: "100%", display: "flex", justifyContent: "center", touchAction: "pan-y" }}
    >
      {shapes && (
        <Globe
          ref={globeRef}
          width={size}
          height={size}
          backgroundColor="rgba(0,0,0,0)"
          globeMaterial={seaMaterial}
          showAtmosphere
          atmosphereColor={palette.accent}
          atmosphereAltitude={0.12}
          rendererConfig={{ preserveDrawingBuffer: true, antialias: true, alpha: true }}
          polygonsData={shapes}
          polygonCapColor={(d) => {
            const { iso, sovereign } = (d as Shape).properties;
            if (!sovereign) return palette.territory;
            return iso && visited.has(iso) ? palette.accent : palette.land;
          }}
          polygonSideColor={() => "rgba(0,0,0,0)"}
          polygonStrokeColor={() => palette.sea}
          polygonAltitude={(d) => {
            const { iso, sovereign } = (d as Shape).properties;
            return sovereign && iso && visited.has(iso) ? 0.02 : 0.006;
          }}
          polygonsTransitionDuration={200}
          polygonLabel={(d) => {
            const { iso, sovereign, name } = (d as Shape).properties;
            return sovereign && iso ? countryName(iso) : `${iso ? countryName(iso) : (name ?? "")} (terytorium zależne)`;
          }}
          onPolygonClick={(d) => {
            const { iso, sovereign } = (d as Shape).properties;
            if (sovereign && iso) onToggle(iso);
          }}
          onGlobeReady={onReady}
        />
      )}
    </div>
  );
}
