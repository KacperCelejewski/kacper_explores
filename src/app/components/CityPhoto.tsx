"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { CITY_ILLUSTRATION, cityPhotoAlt, getCityPhoto, isBrokenImage, type CityPhoto as Photo } from "@/lib/cityPhotos";

/**
 * Keep credits outside navigation links; children are overlays on the image only.
 * The frame is never empty: the brand poster is the backdrop under every photo, so a slow,
 * blocked or failed load still shows an illustration instead of a blank box.
 */
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
  const imgRef = useRef<HTMLImageElement>(null);
  const shown = failedUrl === candidate.url ? CITY_ILLUSTRATION : candidate;

  // An image that failed before hydration never fires onError in React: check it once on mount.
  useEffect(() => {
    const img = imgRef.current;
    if (img && isBrokenImage(img) && candidate.source === "unsplash") setFailedUrl(candidate.url);
  }, [candidate.url, candidate.source]);

  return (
    <figure style={{ margin: 0, height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{
        position: "relative", flex: 1, minHeight: 0, overflow: "hidden",
        backgroundColor: "var(--bg-surface)",
        backgroundImage: `url(${CITY_ILLUSTRATION.url})`, backgroundSize: "cover", backgroundPosition: "center",
      }}>
        <Image
          ref={imgRef}
          src={shown.url}
          alt={cityPhotoAlt(shown, city)}
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
