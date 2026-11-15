import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name === "route.ts") out.push(full);
  }
  return out;
}

// Trasy publiczne nie oddają klientowi surowych komunikatów dostawców ani bazy (kluczy, URL-i, zapytań).
// Crony za CRON_SECRET są pominięte: odpowiadają tylko harmonogramowi.
describe("odpowiedzi API bez surowych błędów", () => {
  it("żadna trasa poza cronami nie zwraca error.message / msg / detail", () => {
    const root = path.resolve(__dirname, "../app/api");
    const offenders = walk(root)
      .filter((f) => !f.includes(`${path.sep}cron${path.sep}`))
      .filter((f) =>
        /json\(\s*\{\s*error:\s*(?:\w+\.message|msg|message)\b|detail:\s*(?:\w+\.message|msg|message)\b/.test(
          readFileSync(f, "utf8"),
        ),
      )
      .map((f) => path.relative(root, f));
    expect(offenders).toEqual([]);
  });
});
