import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

describe("redirects", () => {
  it("sends /ig to the home page with Instagram UTM parameters", async () => {
    const rules = await nextConfig.redirects!();
    const ig = rules.find((r) => r.source === "/ig");
    expect(ig).toBeDefined();
    expect(ig!.destination).toBe("/?utm_source=instagram&utm_medium=social&utm_campaign=bio");
  });

  it("is temporary, so the bio link can be pointed elsewhere later without browsers caching it", async () => {
    const rules = await nextConfig.redirects!();
    const ig = rules.find((r) => r.source === "/ig");
    expect(ig!.permanent).toBe(false);
  });
});
