import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FEATURES } from "./features";
import { HOME_ANIMATION, homeAnimationPairs } from "./homeAnimation";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const scene = css.slice(css.indexOf("/* D: static final frame"), css.indexOf("/* A complete printed scene"));
const pct = (seconds: number) => `${Number((100 * seconds / HOME_ANIMATION.cycle).toFixed(4))}%`;

describe("messenger CSS timeline", () => {
  it("keeps the 16s cycle, three finite runs, 0.6s typing and complete answers within 1s", () => {
    expect(HOME_ANIMATION.cycle).toBe(16);
    expect(HOME_ANIMATION.loops).toBe(3);
    expect(HOME_ANIMATION.typing).toBe(.6);
    expect(homeAnimationPairs().map((p) => p.questionAt)).toEqual([1, 4, 7]);
    expect(scene).toContain("animation: home-chat-fade 16s linear 2;");
    expect(scene).toContain("animation: home-chat-dim 16s linear 3 forwards;");
    expect(scene).toContain("cubic-bezier(.16,1,.3,1)");
    expect(scene).not.toContain("infinite");
    for (const p of homeAnimationPairs()) {
      expect(p.questionAt - p.typingAt).toBeCloseTo(.6);
      expect(p.answerAt - p.questionAt + HOME_ANIMATION.arrival).toBeLessThanOrEqual(1);
      expect(scene).toContain(`@keyframes home-chat-q-${p.key} { 0%,${pct(p.questionAt)} { opacity: 0;`);
      expect(scene).toContain(`@keyframes home-chat-a-${p.key} { 0%,${pct(p.answerAt)} { opacity: 0;`);
      expect(scene).toContain(`${pct(p.typingAt)},${pct(p.questionAt - .01)} { opacity: 1; }`);
      expect(scene).toContain(`${pct(p.questionAt + HOME_ANIMATION.arrival)},100% { opacity: 1; transform: none; }`);
    }
    expect(HOME_ANIMATION.reactionAt).toBeGreaterThan(homeAnimationPairs().at(-1)!.answerAt + .6);
  });

  it("isolates all animation declarations and keyframes to no-preference", () => {
    const start = scene.indexOf("@media (prefers-reduced-motion: no-preference)");
    expect(start).toBeGreaterThan(0);
    expect(scene.slice(0, start)).not.toMatch(/@keyframes|animation:/);
    expect(scene).not.toMatch(/:has\(|@container|color-mix\(|text-wrap|[sd]vh/);
    expect(css).toContain("max-height: calc(100vh - 160px); max-height: calc(100svh - 160px);");
    expect(readFileSync(new URL("../../public/home-chat-static.css", import.meta.url), "utf8")).toContain("animation: none !important");
  });

  it.each(["datePoll", "groupFlights", "settlements"] as const)("adds only the enabled %s pair with a CSS slot", (key) => {
    const pairs = homeAnimationPairs({ ...FEATURES, [key]: true });
    expect(pairs).toHaveLength(4);
    const pair = pairs.find((p) => p.key === ({ datePoll: "date", groupFlights: "flight", settlements: "settlement" }[key]))!;
    expect(pair).toBeDefined();
    expect(pair.answerAt + HOME_ANIMATION.arrival).toBeLessThan(HOME_ANIMATION.dim);
    expect(scene).toContain(`@keyframes home-chat-q-${pair.key} { 0%,${pct(pair.questionAt)}`);
  });
});
