import { ImageResponse } from "next/og";
import { BRAND_MARK_DATA_URI, BRAND_MARK_RATIO } from "@/lib/brandMark";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Znak na piasku, zaokrąglony kwadrat: bez okrągłego „W” (BRAND.md tego zabrania)
export default function Icon() {
  const h = 26;
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F5EFE0",
          borderRadius: 8,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BRAND_MARK_DATA_URI} width={Math.round(h * BRAND_MARK_RATIO)} height={h} alt="" />
      </div>
    ),
    { ...size }
  );
}
