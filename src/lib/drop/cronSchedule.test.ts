import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { weekKey } from "./dates";

const root = process.cwd();
const crons: { path: string; schedule: string }[] = JSON.parse(readFileSync(join(root, "vercel.json"), "utf8")).crons;
const byName = (name: string) => crons.find((c) => c.path === `/api/cron/${name}`);

describe("vercel.json crony Czwartkowego zrzutu", () => {
  it("każdy cron ma trasę w aplikacji", () => {
    for (const c of crons) {
      expect(existsSync(join(root, "src/app", c.path, "route.ts")), c.path).toBe(true);
    }
  });

  it("kolejność: środa prepare, środa teasers, czwartek send", () => {
    expect(byName("drop-prepare")?.schedule).toBe("0 21 * * 3");
    expect(byName("drop-teasers")?.schedule).toBe("0 22 * * 3");
    expect(byName("drop-send")?.schedule).toBe("0 16 * * 4");
  });

  it("środowy prepare i czwartkowy send liczą ten sam klucz tygodnia (UTC wg harmonogramu)", () => {
    // 2026-11-11 21:00 UTC (środa) i 2026-11-12 16:00 UTC (czwartek)
    expect(weekKey(new Date("2026-11-11T21:00:00Z"))).toBe(weekKey(new Date("2026-11-12T16:00:00Z")));
    // zmiana czasu: 2026-03-25 (środa, jeszcze zima) i 2026-03-26; 2026-10-28 i 2026-10-29
    expect(weekKey(new Date("2026-03-25T21:00:00Z"))).toBe(weekKey(new Date("2026-03-26T16:00:00Z")));
    expect(weekKey(new Date("2026-10-28T21:00:00Z"))).toBe(weekKey(new Date("2026-10-29T16:00:00Z")));
  });
});
