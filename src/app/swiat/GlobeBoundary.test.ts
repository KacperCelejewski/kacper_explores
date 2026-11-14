import { describe, expect, it, vi } from "vitest";
import GlobeBoundary from "./GlobeBoundary";

describe("GlobeBoundary", () => {
  it("turns a render error into the failed state", () => {
    expect(GlobeBoundary.getDerivedStateFromError()).toEqual({ failed: true });
  });

  it("tells the page to fall back to the list when the globe throws", () => {
    const onError = vi.fn();
    const boundary = new GlobeBoundary({ onError, children: null });
    boundary.componentDidCatch();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("renders nothing once it has failed, so the page keeps working", () => {
    const boundary = new GlobeBoundary({ onError: () => {}, children: "globus" });
    expect(boundary.render()).toBe("globus");
    boundary.state = { failed: true };
    expect(boundary.render()).toBeNull();
  });
});
