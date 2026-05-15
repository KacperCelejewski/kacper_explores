import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FF6B35",
          borderRadius: 8,
          fontSize: 20,
          fontWeight: 800,
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        W
      </div>
    ),
    { ...size }
  );
}
