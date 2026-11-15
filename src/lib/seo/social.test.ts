import { describe, expect, it } from "vitest";
import { latestFetchedAt, postLastModified, socialMeta } from "./social";

describe("socialMeta", () => {
  it("daje obraz w Open Graph i w Twitterze oraz pełny adres", () => {
    const m = socialMeta("T", "D", "/okazje");
    expect(m.openGraph.images[0].url).toBe("/opengraph-image");
    expect(m.openGraph.url).toBe("https://wloczykij.me/okazje");
    expect(m.twitter.card).toBe("summary_large_image");
    expect(m.twitter.images).toEqual(["/opengraph-image"]);
  });
});

describe("latestFetchedAt", () => {
  it("bierze najnowszą datę pobrania", () => {
    const d = latestFetchedAt([{ fetched_at: "2026-11-10T10:00:00Z" }, { fetched_at: "2026-11-13T06:00:00Z" }, { fetched_at: null }]);
    expect(d?.toISOString()).toBe("2026-11-13T06:00:00.000Z");
  });
  it("bez danych zwraca undefined (lepszy brak niż zgadywana data)", () => {
    expect(latestFetchedAt([])).toBeUndefined();
    expect(latestFetchedAt([{ fetched_at: "nie-data" }])).toBeUndefined();
  });
});

describe("postLastModified", () => {
  it("preferuje updated", () => {
    expect(postLastModified({ date: "2026-11-01", updated: "2026-11-10" }).toISOString().slice(0, 10)).toBe("2026-11-10");
    expect(postLastModified({ date: "2026-11-01" }).toISOString().slice(0, 10)).toBe("2026-11-01");
  });
});
