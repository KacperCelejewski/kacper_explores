"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// No timers or JS animation: every moving layer inherits this one play state.
export default function HomeAnimationControl({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(true);
  const [motion, setMotion] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: no-preference)");
    const update = () => { setMotion(media.matches); setFinished(false); };
    update();
    media.addEventListener("change", update);
    const observer = "IntersectionObserver" in window ? new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting);
    }) : null;
    if (ref.current) observer?.observe(ref.current);
    return () => { media.removeEventListener("change", update); observer?.disconnect(); };
  }, []);

  return (
    <div ref={ref} className="home-chat-animation" data-paused={paused || !inView}
      onAnimationEnd={(event) => {
        if (event.animationName === "home-chat-dim") setFinished(true);
      }}>
      {children}
      <div className="home-chat-caption">
        <p>Przykład, nie Wasz wyjazd</p>
        <button type="button" disabled={!motion || finished} aria-pressed={paused}
          aria-label={paused ? "Odtwórz" : "Wstrzymaj"}
          onClick={() => setPaused((value) => !value)}>
          {paused ? "Odtwórz" : "Wstrzymaj"}
        </button>
      </div>
      <span className="sr-only" role="status">{finished ? "Animacja zakończona. Widoczny jest kadr końcowy." : ""}</span>
    </div>
  );
}
