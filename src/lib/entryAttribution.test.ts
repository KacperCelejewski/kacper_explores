import { describe, expect, it } from "vitest";
import {
  captureEntry, contentRefFromPath, entryEventParams, entryFromUrl, entryUrlParams,
  loadEntry, parseEntryParams, resolveEntry, saveEntry, DIRECT_ENTRY,
} from "./entryAttribution";

const q = (s: string) => new URLSearchParams(s);
function mem() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); } };
}

describe("contentRefFromPath", () => {
  it("rozpoznaje artykuł, okazje i weekend", () => {
    expect(contentRefFromPath("/blog/lot-w-grupie")).toEqual({ channel: "blog", material: "blog:lot-w-grupie" });
    expect(contentRefFromPath("/okazje/WRO")).toEqual({ channel: "okazje", material: "okazje:wro" });
    expect(contentRefFromPath("/weekend/budapeszt?x=1")).toEqual({ channel: "weekend", material: "weekend:budapeszt" });
  });
  it("indeks daje sam kanał, inne strony null, śmieci nie trafiają do materiału", () => {
    expect(contentRefFromPath("/blog")).toEqual({ channel: "blog", material: "blog" });
    expect(contentRefFromPath("/pricing")).toBeNull();
    expect(contentRefFromPath("/blog/<script>")).toEqual({ channel: "blog", material: "blog" });
  });
});

describe("entryFromUrl", () => {
  it("IG z utm", () => {
    expect(entryFromUrl(q("utm_source=instagram&utm_medium=social&utm_campaign=bio&utm_content=ekipa"))).toEqual({ channel: "ig", material: "ig:bio:ekipa" });
  });
  it("zrzut", () => {
    expect(entryFromUrl(q("src=drop&utm_source=drop&utm_campaign=2026-W46&utm_content=BCN"))?.material).toBe("drop:2026-w46:bcn");
  });
  it("sam src i odrzucenie nieznanych", () => {
    expect(entryFromUrl(q("src=blog-ekipa"))).toEqual({ channel: "blog", material: "blog:blog-ekipa" });
    expect(entryFromUrl(q("src=x%3Cimg%3E&utm_source=a%20b"))).toBeNull();
  });
});

describe("filtr wartości", () => {
  it("odrzuca ciągi cyfr podobne do numeru telefonu i długie slugi nie giną", () => {
    expect(entryFromUrl(q("utm_source=instagram&utm_campaign=bio&utm_content=48555123456"))?.material).toBe("ig:bio");
    const slug = "a".repeat(80);
    expect(contentRefFromPath(`/blog/${slug}`)?.material).toBe(`blog:${slug}`);
  });
  it("src=drop bez utm daje sam kanał", () => {
    expect(entryFromUrl(q("src=drop"))?.material).toBe("drop:drop");
  });
});

describe("resolveEntry", () => {
  it("strona treści wygrywa z src, a direct nie nadpisuje zapamiętanego", () => {
    const ref = { channel: "blog", material: "blog:a" };
    expect(resolveEntry({ params: q("src=blog-ekipa"), contentRef: ref }).material).toBe("blog:a");
    expect(resolveEntry({ params: q("step=when"), stored: ref })).toEqual(ref);
    expect(resolveEntry({ params: q("") })).toEqual(DIRECT_ENTRY);
  });
  it("wejście z adresu po logowaniu", () => {
    const next = entryUrlParams({ channel: "ig", material: "ig:bio:ekipa" });
    expect(parseEntryParams(q(next.slice(1)))).toEqual({ channel: "ig", material: "ig:bio:ekipa" });
    expect(parseEntryParams(q("entry_channel=ig&entry_material=blog:x"))).toBeNull();
    expect(entryUrlParams(DIRECT_ENTRY)).toBe("");
  });
});

describe("pamięć", () => {
  it("zapisuje, wygasa i zużywa ślad kliknięcia", () => {
    const s = mem();
    const e = { channel: "ig", material: "ig:bio:ekipa" };
    saveEntry(s, e, 1000);
    expect(loadEntry(s, 2000)).toEqual(e);
    expect(loadEntry(s, 1000 + 4 * 3600_000)).toBeNull();
    const got = captureEntry(q(""), s, "https://wloczykij.me/blog/x", "https://wloczykij.me", 3000);
    expect(got.material).toBe("blog:x");
    expect(loadEntry(s, 3500)?.material).toBe("blog:x");
  });
  it("bez magazynu działa", () => {
    expect(captureEntry(q("src=home-solo"), null, null, "https://x").channel).toBe("home");
    expect(entryEventParams(null)).toEqual({});
  });
});
