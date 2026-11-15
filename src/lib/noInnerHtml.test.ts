import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\./.test(name)) out.push(full);
  }
  return out;
}

// Dane z AI i od użytkowników nie mogą trafiać do DOM-u jako HTML (DOM XSS).
describe("brak zapisu innerHTML", () => {
  it("żaden plik w src nie przypisuje innerHTML/outerHTML ani nie wywołuje insertAdjacentHTML", () => {
    const offenders = walk(path.resolve(__dirname, "..")).filter((f) =>
      /\.(innerHTML|outerHTML)\s*(\+?=)(?!=)|insertAdjacentHTML\s*\(/.test(readFileSync(f, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
