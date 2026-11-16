"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { CITY_ILLUSTRATION, getCityPhoto, type CityPhoto as Photo } from "@/lib/cityPhotos";

/** Keep credits outside navigation links; children are overlays on the image only. */
export default function CityPhoto({ city, photo, width = 800, sizes = "100vw", eager = false, children }: {
  city: string;
  photo?: Photo;
  width?: number;
  sizes?: string;
  eager?: boolean;
  children?: ReactNode;
}) {
  const candidate = photo ?? getCityPhoto(city, width);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const shown = failedUrl === candidate.url ? CITY_ILLUSTRATION : candidate;
  return (
    <figure style={{ margin: 0, height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ position: "relative", flex: 1, minHeight: 0, overflow: "hidden" }}>
        <Image
          src={shown.url}
          alt={shown.source === "unsplash" ? city : "Ilustracja podróży: droga przez wzgórza"}
          fill
          sizes={sizes}
          unoptimized
          loading={eager ? "eager" : "lazy"}
          className="object-cover"
          onError={() => setFailedUrl(candidate.url)}
        />
        {children}
      </div>
      <figcaption style={{ background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 11, lineHeight: 1.4, padding: "4px 8px", flexShrink: 0 }}>
        {shown.source === "unsplash" ? <>
          Zdjęcie: <a href={shown.authorUrl} style={{ textDecoration: "underline" }}>{shown.authorName}</a>, {" "}
          <a href={shown.photoUrl} style={{ textDecoration: "underline" }}>Unsplash</a>
        </> : "Ilustracja Włóczykija"}
      </figcaption>
    </figure>
  );
}
