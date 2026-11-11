import { describe, expect, it } from "vitest";
import { runPool } from "./runPool";

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

describe("runPool", () => {
  it("przetwarza wszystkie elementy i zwraca wyniki w kolejności", async () => {
    const res = await runPool([1, 2, 3, 4, 5], 2, Date.now() + 5000, async (n) => n * 2);
    expect(res).toEqual([2, 4, 6, 8, 10]);
  });

  it("nie uruchamia więcej niż size naraz", async () => {
    let active = 0;
    let peak = 0;
    await runPool([1, 2, 3, 4, 5, 6], 3, Date.now() + 5000, async () => {
      active++;
      peak = Math.max(peak, active);
      await wait(10);
      active--;
    });
    expect(peak).toBe(3);
  });

  it("po terminie nie zaczyna nowych, ale kończy już rozpoczęte", async () => {
    const started: number[] = [];
    const res = await runPool([1, 2, 3, 4], 2, Date.now() + 30, async (n) => {
      started.push(n);
      await wait(60);
      return n;
    });
    expect(started).toEqual([1, 2]);
    expect(res).toEqual([1, 2, undefined, undefined]);
  });
});
