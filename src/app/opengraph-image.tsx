import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Włóczykij — Budżetowe podróże solo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#FAFAF8",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Accent bar top */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 8,
            background: "#FF6B35",
          }}
        />

        {/* Brand label */}
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#FF6B35",
            marginBottom: 24,
          }}
        >
          WŁÓCZYKIJ
        </div>

        {/* Main headline */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: "#1A1A1A",
            textAlign: "center",
            lineHeight: 1.15,
            maxWidth: 900,
          }}
        >
          Budżetowe podróże{" "}
          <span style={{ color: "#FF6B35" }}>solo</span>
          {" "}po Europie
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            color: "#666",
            marginTop: 24,
            textAlign: "center",
            maxWidth: 700,
            lineHeight: 1.4,
          }}
        >
          AI planuje Twój wyjazd godzina po godzinie
        </div>

        {/* Flags */}
        <div style={{ display: "flex", gap: 12, marginTop: 48, fontSize: 40 }}>
          {["🇵🇹", "🇪🇸", "🇬🇷", "🇮🇹", "🇭🇷", "🇨🇿"].map((f) => (
            <span key={f}>{f}</span>
          ))}
        </div>

        {/* URL */}
        <div
          style={{
            position: "absolute",
            bottom: 36,
            fontSize: 20,
            color: "#999",
            letterSpacing: "0.05em",
          }}
        >
          wloczykij.me
        </div>
      </div>
    ),
    { ...size }
  );
}
