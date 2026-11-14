import { CONTINENT_LABELS } from "./countries";
import { formatPercent, type Stats } from "./stats";

// Format relacji na Instagramie
export const SHARE_CARD_SIZE = { width: 1080, height: 1920 } as const;

export interface ShareCardLines {
  brand: string;
  headline: string;
  subline: string;
  bars: { label: string; fraction: number; text: string }[];
  footer: string;
}

// Tekst obrazka jako czysta funkcja, żeby dało się go przetestować bez canvasa
export function shareCardLines(stats: Stats): ShareCardLines {
  return {
    brand: "Włóczykij",
    headline: `${formatPercent(stats.percent)} świata`,
    subline: `${stats.visited} z ${stats.total} krajów`,
    bars: stats.continents.map((c) => ({
      label: CONTINENT_LABELS[c.continent],
      fraction: Math.min(1, Math.max(0, c.percent / 100)),
      text: `${c.visited}/${c.total}`,
    })),
    footer: "wloczykij.me/swiat",
  };
}

// Kolory marki z globals.css (na canvasie nie ma zmiennych CSS)
const COLORS = { bg: "#F5EFE0", track: "#EDE8D8", accent: "#A04B20", text: "#1C1008", muted: "#7A5C44" };

// Rysuje kartę 1080×1920: marka, globus (jeśli jest), duża liczba, liczba krajów, paski kontynentów, adres
export function drawShareCard(ctx: CanvasRenderingContext2D, lines: ShareCardLines, globe: CanvasImageSource | null): void {
  const { width, height } = SHARE_CARD_SIZE;
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = "center";

  ctx.fillStyle = COLORS.accent;
  ctx.font = "700 56px Georgia, serif";
  ctx.fillText(lines.brand, width / 2, 130);

  if (globe) {
    const size = 880;
    ctx.drawImage(globe, (width - size) / 2, 200, size, size);
  }

  ctx.fillStyle = COLORS.text;
  ctx.font = "700 150px Georgia, serif";
  ctx.fillText(lines.headline, width / 2, 1270);
  ctx.fillStyle = COLORS.muted;
  ctx.font = "500 52px system-ui, sans-serif";
  ctx.fillText(lines.subline, width / 2, 1350);

  ctx.textAlign = "left";
  lines.bars.forEach((bar, i) => {
    const y = 1440 + i * 56;
    ctx.fillStyle = COLORS.text;
    ctx.font = "500 32px system-ui, sans-serif";
    ctx.fillText(bar.label, 110, y);
    ctx.fillStyle = COLORS.track;
    ctx.fillRect(430, y - 28, 380, 30);
    ctx.fillStyle = COLORS.accent;
    ctx.fillRect(430, y - 28, 380 * bar.fraction, 30);
    ctx.fillStyle = COLORS.muted;
    ctx.fillText(bar.text, 830, y);
  });

  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.muted;
  ctx.font = "500 40px system-ui, sans-serif";
  ctx.fillText(lines.footer, width / 2, 1860);
}

interface ShareNav {
  canShare?: (data: { files: File[] }) => boolean;
  share?: (data: { files: File[]; title?: string }) => Promise<void>;
}

// Okno udostępniania telefonu (z Instagramem), gdy przeglądarka potrafi udostępnić plik; w innym razie pobranie
export function chooseShareMethod(nav: ShareNav, file: File): "native" | "download" {
  try {
    return typeof nav.share === "function" && typeof nav.canShare === "function" && nav.canShare({ files: [file] })
      ? "native"
      : "download";
  } catch {
    return "download";
  }
}

const FILE_NAME = "moja-mapa-swiata.png";

export async function shareMap(
  canvas: HTMLCanvasElement,
  nav: ShareNav = typeof navigator === "undefined" ? {} : (navigator as ShareNav),
): Promise<"native" | "download" | "cancelled"> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return "cancelled";
  const file = new File([blob], FILE_NAME, { type: "image/png" });

  if (chooseShareMethod(nav, file) === "native") {
    try {
      await nav.share!({ files: [file], title: "Moja mapa świata" });
      return "native";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
      // inny błąd udostępniania: schodzimy do pobrania
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = FILE_NAME;
  a.click();
  URL.revokeObjectURL(url);
  return "download";
}
