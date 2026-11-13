import { ImageResponse } from "next/og";
import { BRAND_MARK_DATA_URI, BRAND_MARK_RATIO } from "@/lib/brandMark";

export const alt = "Włóczykij: budżetowe weekendy w Europie. Obudź w sobie Włóczykija.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Cormorant Garamond z Google Fonts, pobrany przy generowaniu obrazka (obrazek powstaje przy buildzie).
// Bez sieci wraca do domyślnego kroju, żeby build się nie wywrócił.
async function loadCormorant(): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch("https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600", {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1" },
    }).then((r) => r.text());
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    return await fetch(url).then((r) => r.arrayBuffer());
  } catch {
    return null;
  }
}

export default async function OGImage() {
  const font = await loadCormorant();
  const markH = 330;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 72,
          background: "#F5EFE0",
          color: "#1C1008",
          fontFamily: font ? "Cormorant" : "sans-serif",
          position: "relative",
        }}
      >
        <img src={BRAND_MARK_DATA_URI} width={Math.round(markH * BRAND_MARK_RATIO)} height={markH} alt="" />
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 640 }}>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#A04B20",
              fontFamily: "sans-serif",
              marginBottom: 20,
            }}
          >
            Włóczykij
          </div>
          <div style={{ fontSize: 88, fontWeight: 600, lineHeight: 1.02, letterSpacing: "-0.02em" }}>
            Obudź w sobie Włóczykija.
          </div>
          <div style={{ fontSize: 30, color: "#7A5C44", marginTop: 28, lineHeight: 1.35, fontFamily: "sans-serif" }}>
            Okazje na weekend z polskich lotnisk i plan godzina po godzinie.
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 34,
            right: 56,
            fontSize: 22,
            color: "#7A5C44",
            letterSpacing: "0.05em",
            fontFamily: "sans-serif",
          }}
        >
          wloczykij.me
        </div>
      </div>
    ),
    {
      ...size,
      fonts: font ? [{ name: "Cormorant", data: font, weight: 600, style: "normal" }] : undefined,
    }
  );
}
