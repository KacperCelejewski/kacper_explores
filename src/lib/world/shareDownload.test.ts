import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { shareMap } from "./shareCard";

describe("shareMap download path", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("document", { createElement: () => ({ click: () => {}, href: "", download: "" }) });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("does not revoke the object URL before the browser has started the download", async () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:x");
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const canvas = { toBlob: (cb: (b: Blob | null) => void) => cb(new Blob(["x"], { type: "image/png" })) } as unknown as HTMLCanvasElement;

    expect(await shareMap(canvas, {})).toBe("download");
    expect(revoke).not.toHaveBeenCalled();

    vi.advanceTimersByTime(10_000);
    expect(revoke).toHaveBeenCalledWith("blob:x");
  });
});
