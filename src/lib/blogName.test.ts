import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { BLOG_NAME } from "./seo/articleLd";

const ROOT = path.join(process.cwd(), "src");

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "content" ? [] : walk(p);
    return /\.(tsx?|mdx?)$/.test(e.name) && !/\.test\./.test(e.name) ? [p] : [];
  });
}

describe("nazwa bloga", () => {
  it("to „Blog Włóczykija”", () => {
    expect(BLOG_NAME).toBe("Blog Włóczykija");
  });
  it("w kodzie nie zostało stare „Blog o podróżach solo” ani „Włóczykij — Blog”", () => {
    for (const f of walk(ROOT)) {
      const txt = fs.readFileSync(f, "utf-8");
      expect(txt, f).not.toMatch(/Blog o podróżach solo|Włóczykij — Blog|Podróże solo po Europie/);
    }
  });
  it("strona /blog używa BLOG_NAME w tytule i nagłówku", () => {
    const src = fs.readFileSync(path.join(ROOT, "app/blog/page.tsx"), "utf-8");
    expect(src).toMatch(/title: BLOG_NAME/);
    expect(src).toMatch(/\{BLOG_NAME\}/);
  });
});
