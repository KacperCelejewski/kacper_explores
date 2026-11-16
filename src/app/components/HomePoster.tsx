"use client";

import { useEffect, useRef } from "react";

type PosterCity = "Budapeszt" | "Lizbona" | "Porto";

// Original poster shapes adapted from the A/B design studies. No remote assets.
const TOWNS: Record<PosterCity, React.ReactNode> = {
  Budapeszt: <>
    <path d="M65 330v-65h85v65m140 0v-65h85v65M150 330v-85h140v85M198 245v-35q22-42 44 0v35" />
    <path d="m65 265 18-30 18 30m13 0 18-30 18 30m140 0 18-30 18 30m13 0 18-30 18 30M220 177v-25" fill="none" stroke="#F5EFE0" strokeWidth="6" />
    <path d="M0 358h440m-380 15h320" stroke="#F5EFE0" strokeWidth="5" />
    <path d="M175 330v-48m30 48v-48m30 48v-48m30 48v-48" stroke="#18324F" strokeWidth="9" />
  </>,
  Lizbona: <>
    <path d="M70 330v-85h55v85m15 0V205h65v125m12 0v-95h52v95m15 0V185h65v145m15 0v-80h55v80" />
    <path d="m62 245 36-28 35 28m-1-40 42-30 40 30m62-20 40-30 40 30" fill="#EB531E" />
    <path d="M175 330v-65m130 65v-88" stroke="#18324F" strokeWidth="12" />
    <path d="m45 360 335-20m-340 30 345-20" stroke="#F5EFE0" strokeWidth="3" />
  </>,
  Porto: <>
    <path d="M30 330v-70h60v70m15 0V220h60v110m15 0v-80h65v80m15 0V205h60v125m15 0v-60h75v60" />
    <path d="M35 260h50m25-40h50m105-15h50" stroke="#EB531E" strokeWidth="12" />
    <path d="M95 377q150-100 290 0M155 355q55-70 130 0" fill="none" stroke="#F5EFE0" strokeWidth="7" />
  </>,
};

export default function HomePoster({ city }: { city: PosterCity }) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = ref.current;
    if (!svg || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        svg.classList.add("is-visible");
        observer.disconnect();
      }
    }, { threshold: 0.15 });
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  return (
    <svg ref={ref} className="home-poster-art" viewBox="0 30 440 360"
      width="440" height="360" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <rect width="440" height="430" fill="#18324F" />
      <circle className="home-poster-sun" cx="325" cy="105" r="64" fill="#EB531E" />
      <path d="m0 245 100-100 95 80 100-50 145 80v175H0" fill="#8299AB" />
      <path d="m0 290 90-60 110 65 110-55 130 65v125H0" fill="#4D6B82" />
      <g className="home-poster-town" fill="#F5EFE0">{TOWNS[city]}</g>
      <path d="M0 392q120-48 220-6t220-8v52H0" fill="#F5EFE0" />
      <path className="home-poster-route" pathLength="1" d="M60 420c-15-70 310-24 230-85"
        fill="none" stroke="#18324F" strokeWidth="7" />
      <path d="m20 110 18-18 18 18m-17-18v48" fill="none" stroke="#F5EFE0" strokeWidth="2" />
    </svg>
  );
}
