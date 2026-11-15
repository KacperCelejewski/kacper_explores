import { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";
import { POLISH_AIRPORTS } from "@/lib/airports";
import { createServiceClient } from "@/lib/supabase/service";
import { pickLatestWeek } from "@/lib/drop/read";
import { slugsWithDeals } from "@/lib/seo/cities";
import { latestFetchedAt, postLastModified } from "@/lib/seo/social";

const BASE = "https://wloczykij.me";

// Lista miast zależy od danych, które zmieniają się co tydzień, więc sitemap odświeża się co godzinę
export const revalidate = 3600;

// Miasta z żywymi okazjami w ostatnim tygodniu i data ostatniego pobrania cen;
// bez bazy sitemap działa dalej, tylko bez stron miast i bez lastmod
async function dealsSitemapData(): Promise<{ slugs: string[]; fetchedAt: Date | undefined }> {
  try {
    const { data } = await createServiceClient().from("drop_deals").select("city_name, week, fetched_at").order("week", { ascending: false }).limit(1500);
    if (!data) return { slugs: [], fetchedAt: undefined };
    const latest = pickLatestWeek(data as { week: string; city_name: string; fetched_at: string }[]);
    return { slugs: slugsWithDeals(latest.map((r) => r.city_name)), fetchedAt: latestFetchedAt(latest) };
  } catch {
    return { slugs: [], fetchedAt: undefined };
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = getAllPosts();
  const { slugs: citySlugs, fetchedAt } = await dealsSitemapData();

  const blogEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${BASE}/blog/${post.slug}`,
    lastModified: postLastModified(post),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  // Indeks bloga zmienia się razem z najświeższym artykułem (data publikacji albo `updated`).
  // Strony statyczne nie mają lastModified: zgadywana data jest gorsza niż jej brak.
  const latestPost = posts.length ? new Date(Math.max(...posts.map((p) => postLastModified(p).getTime()))) : undefined;

  return [
    { url: BASE, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/pricing`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/okazje`, lastModified: fetchedAt, changeFrequency: "weekly", priority: 0.9 },
    // Modlin odpowiada danymi z Okęcia (Travelpayouts zwraca kod miasta WAW), więc nie dublujemy go w indeksie
    ...POLISH_AIRPORTS.filter((a) => a.code !== "WMI").map((a) => ({
      url: `${BASE}/okazje/${a.code.toLowerCase()}`,
      lastModified: fetchedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...citySlugs.map((slug) => ({ url: `${BASE}/weekend/${slug}`, lastModified: fetchedAt, changeFrequency: "weekly" as const, priority: 0.6 })),
    { url: `${BASE}/blog`, lastModified: latestPost, changeFrequency: "weekly", priority: 0.9 },
    ...blogEntries,
    { url: `${BASE}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE}/regulamin`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE}/cookies`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
