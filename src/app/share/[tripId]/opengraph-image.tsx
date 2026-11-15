import { ImageResponse } from "next/og";
import { lookupPublicTrip } from "@/lib/shareTrip";
import { SHARE_OG_FALLBACK, type ShareOgModel } from "@/lib/shareOg";

export const alt = "Plan wyjazdu od Włóczykija";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// Podgląd żyje chwilę w pamięci podręcznej: plan, który autor wyłączył z udostępniania, przestaje się pokazywać po kilku minutach
export const revalidate = 300;

const CREAM = "#F5EFE0";
const NAVY = "#18324F";
const ORANGE = "#EB531E";
const MUTED = "#4A5A6E";

// Cormorant Garamond z Google Fonts; wynik trzymamy w pamięci procesu, żeby kolejne obrazki nie czekały na sieć.
// Bez sieci wraca do domyślnego kroju, a obrazek i tak powstaje.
let fontPromise: Promise<ArrayBuffer | null> | null = null;
function loadCormorant(): Promise<ArrayBuffer | null> {
  fontPromise ??= (async () => {
    try {
      const css = await fetch("https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600", {
        signal: AbortSignal.timeout(4000),
        headers: { "User-Agent": "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1" },
      }).then((r) => (r.ok ? r.text() : ""));
      const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
      if (!url) return null;
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      return res.ok ? await res.arrayBuffer() : null;
    } catch {
      return null;
    }
  })().then((font) => {
    // Nieudane pobranie nie zostaje na stałe w pamięci
    if (!font) fontPromise = null;
    return font;
  });
  return fontPromise;
}

function cityFontSize(city: string): number {
  if (city.length <= 9) return 150;
  if (city.length <= 14) return 118;
  if (city.length <= 22) return 88;
  return 68;
}

function Chip({ text }: { text: string }) {
  return (
    <div
      style={{
        display: "flex",
        padding: "10px 22px",
        borderRadius: 999,
        border: `2px solid ${NAVY}`,
        color: NAVY,
        fontSize: 28,
        fontWeight: 600,
        fontFamily: "sans-serif",
      }}
    >
      {text}
    </div>
  );
}

export default async function ShareOgImage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const [lookup, font] = await Promise.all([lookupPublicTrip(tripId), loadCormorant()]);
  const model: ShareOgModel = lookup.status === "found" ? lookup.model : SHARE_OG_FALLBACK;
  const isPlan = lookup.status === "found";
  const serif = font ? "Cormorant" : "serif";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: CREAM,
          color: NAVY,
          fontFamily: serif,
        }}
      >
        {/* Plakatowe słońce i wzgórza po prawej, jak z kolejowych plakatów z lat 50. */}
        <div style={{ position: "absolute", right: -70, top: 70, width: 430, height: 430, borderRadius: 215, background: ORANGE, display: "flex" }} />
        <div style={{ position: "absolute", right: -220, bottom: -190, width: 760, height: 360, borderRadius: 380, background: NAVY, display: "flex" }} />
        <div style={{ position: "absolute", right: 250, bottom: -250, width: 620, height: 330, borderRadius: 310, background: "#244766", display: "flex" }} />

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "58px 64px", width: 780 }}>
          <div
            style={{
              display: "flex",
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              fontFamily: "sans-serif",
              color: NAVY,
            }}
          >
            Włóczykij
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {isPlan && (
              <div style={{ display: "flex", fontSize: 30, color: MUTED, fontFamily: "sans-serif", marginBottom: 6 }}>
                Plan wyjazdu
              </div>
            )}
            <div style={{ display: "flex", fontSize: cityFontSize(model.city), fontWeight: 600, lineHeight: 1, letterSpacing: "-0.02em" }}>
              {model.city}
            </div>
            {model.country && (
              <div style={{ display: "flex", fontSize: 40, color: MUTED, marginTop: 10, fontWeight: 600 }}>{model.country}</div>
            )}
            {(model.when || model.crewLine) && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 30 }}>
                {model.when && <Chip text={model.when} />}
                {model.crewLine && <Chip text={model.crewLine} />}
              </div>
            )}
            {model.budgetLine && (
              <div style={{ display: "flex", fontSize: 30, marginTop: 20, fontFamily: "sans-serif", color: NAVY }}>
                {model.budgetLine}
              </div>
            )}
            {!isPlan && (
              <div style={{ display: "flex", fontSize: 44, marginTop: 14, color: NAVY, fontWeight: 600, lineHeight: 1.15 }}>
                {model.tagline}
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", fontSize: 30, fontWeight: 600 }}>
            <div style={{ display: "flex" }}>{isPlan ? model.tagline : "Obudź w sobie Włóczykija."}</div>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            right: 48,
            bottom: 30,
            display: "flex",
            fontSize: 26,
            color: CREAM,
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
