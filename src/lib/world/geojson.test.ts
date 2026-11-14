import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { COUNTRIES } from "./countries";

interface Feature { properties: { iso: string | null; sovereign: boolean; name: string | null } }

const file = path.join(process.cwd(), "public/world/countries.geojson");
const geo = JSON.parse(readFileSync(file, "utf8")) as { type: string; features: Feature[] };

// Państwa na tyle małe, że dane o rozdzielczości 110 m nie mają dla nich kształtu: są dostępne tylko z listy
const NO_SHAPE_EXPECTED = new Set<string>(
  "AD AG BB BH CV DM FM GD KI KM KN LC LI MC MH MT MU MV NR PW SC SG SM ST TO TV VA VC WS".split(" "),
);

describe("countries.geojson", () => {
  it("is a feature collection", () => {
    expect(geo.type).toBe("FeatureCollection");
  });

  it("marks every feature as sovereign or not", () => {
    for (const f of geo.features) expect(typeof f.properties.sovereign).toBe("boolean");
  });

  it("gives every sovereign feature an ISO code from the country list", () => {
    const known = new Set(COUNTRIES.map((c) => c.iso));
    for (const f of geo.features.filter((x) => x.properties.sovereign)) {
      expect(f.properties.iso && known.has(f.properties.iso)).toBeTruthy();
    }
  });

  it("covers at least 160 sovereign states", () => {
    expect(geo.features.filter((f) => f.properties.sovereign).length).toBeGreaterThanOrEqual(160);
  });

  it("lacks a shape only for the small states we expect to be list-only", () => {
    const shaped = new Set(geo.features.filter((f) => f.properties.sovereign).map((f) => f.properties.iso));
    const missing = COUNTRIES.map((c) => c.iso).filter((iso) => !shaped.has(iso));
    expect(missing.filter((iso) => !NO_SHAPE_EXPECTED.has(iso))).toEqual([]);
  });
});
