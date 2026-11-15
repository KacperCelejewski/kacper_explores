const BASE = "https://wloczykij.me";

// Wspólny obraz podglądu (app/opengraph-image) dla stron, które nie mają własnego
export const OG_IMAGE = { url: "/opengraph-image", width: 1200, height: 630 } as const;

export function socialMeta(title: string, description: string, path: string) {
  return {
    openGraph: { title, description, url: `${BASE}${path}`, type: "website" as const, images: [OG_IMAGE] },
    twitter: { card: "summary_large_image" as const, title, description, images: [OG_IMAGE.url] },
  };
}

// Najświeższa data pobrania cen: kiedy dane stron okazji naprawdę się zmieniły (do sitemapy)
export function latestFetchedAt(rows: { fetched_at?: string | null }[]): Date | undefined {
  let max = 0;
  for (const r of rows) {
    const t = r.fetched_at ? Date.parse(r.fetched_at) : NaN;
    if (!Number.isNaN(t) && t > max) max = t;
  }
  return max > 0 ? new Date(max) : undefined;
}

// Artykuł: data ostatniej zmiany, a bez niej data publikacji
export function postLastModified(post: { date: string; updated?: string }): Date {
  return new Date(post.updated ?? post.date);
}
