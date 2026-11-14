// Generuje public/world/countries.geojson z danych Natural Earth (przez world-atlas, 110 m, domena publiczna).
// Uruchom: npm run world:build. Wynik jest w repozytorium, skrypt jest potrzebny tylko przy zmianie danych.
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { feature } from "topojson-client";
import countriesLib from "i18n-iso-countries";
import { COUNTRIES } from "../src/lib/world/countries.ts";

const require = createRequire(import.meta.url);
const topology = JSON.parse(readFileSync(require.resolve("world-atlas/countries-110m.json"), "utf8"));
const sovereign = new Set(COUNTRIES.map((c) => c.iso));

// Trzy miejsca po przecinku (ok. 100 m) wystarczą dla granic 110 m i zmniejszają plik kilkukrotnie
const round = (n) => Math.round(n * 1000) / 1000;
const roundCoords = (c) => (typeof c[0] === "number" ? c.map(round) : c.map(roundCoords));

const features = feature(topology, topology.objects.countries).features.map((f) => {
  const iso = f.id ? (countriesLib.numericToAlpha2(String(f.id).padStart(3, "0")) ?? null) : null;
  return {
    type: "Feature",
    properties: { iso, sovereign: iso !== null && sovereign.has(iso), name: f.properties?.name ?? null },
    geometry: { ...f.geometry, coordinates: roundCoords(f.geometry.coordinates) },
  };
});

writeFileSync("public/world/countries.geojson", JSON.stringify({ type: "FeatureCollection", features }));

const shaped = new Set(features.filter((f) => f.properties.sovereign).map((f) => f.properties.iso));
const missing = COUNTRIES.map((c) => c.iso).filter((iso) => !shaped.has(iso));
console.log(`cech: ${features.length}, państw z kształtem: ${shaped.size}, bez kształtu (${missing.length}): ${missing.join(" ")}`);
