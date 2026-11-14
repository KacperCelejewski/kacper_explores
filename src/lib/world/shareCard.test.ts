import { describe, expect, it } from "vitest";
import { COUNTRIES } from "./countries";
import { SHARE_CARD_SIZE, chooseShareMethod, shareCardLines } from "./shareCard";
import { countryStats } from "./stats";

const first = (n: number) => COUNTRIES.slice(0, n).map((c) => c.iso);

describe("shareCardLines", () => {
  it("writes the headline, the country count, the brand and the address", () => {
    const lines = shareCardLines(countryStats(first(41)));
    expect(lines.brand).toBe("Włóczykij");
    expect(lines.headline).toBe("21% świata");
    expect(lines.subline).toBe("41 z 195 krajów");
    expect(lines.footer).toBe("wloczykij.me/swiat");
  });

  it("gives six continent bars with a fraction between 0 and 1", () => {
    const { bars } = shareCardLines(countryStats(first(41)));
    expect(bars).toHaveLength(6);
    for (const bar of bars) {
      expect(bar.fraction).toBeGreaterThanOrEqual(0);
      expect(bar.fraction).toBeLessThanOrEqual(1);
      expect(bar.label.length).toBeGreaterThan(0);
    }
  });

  it("does not break for an empty map", () => {
    expect(shareCardLines(countryStats([])).headline).toBe("0% świata");
  });
});

describe("SHARE_CARD_SIZE", () => {
  it("is an Instagram story", () => {
    expect(SHARE_CARD_SIZE).toEqual({ width: 1080, height: 1920 });
  });
});

describe("chooseShareMethod", () => {
  const file = new File(["x"], "mapa.png", { type: "image/png" });

  it("shares natively when the browser can share this file", () => {
    expect(chooseShareMethod({ canShare: () => true, share: () => Promise.resolve() }, file)).toBe("native");
  });

  it("downloads when sharing files is missing, refused or unsupported", () => {
    expect(chooseShareMethod({}, file)).toBe("download");
    expect(chooseShareMethod({ canShare: () => false, share: () => Promise.resolve() }, file)).toBe("download");
    expect(chooseShareMethod({ canShare: () => true }, file)).toBe("download");
    expect(chooseShareMethod({ canShare: () => { throw new Error("blocked"); }, share: () => Promise.resolve() }, file)).toBe("download");
  });
});
