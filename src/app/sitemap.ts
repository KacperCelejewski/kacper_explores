import { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";
import { POLISH_AIRPORTS } from "@/lib/airports";
import { createServiceClient } from "@/lib/supabase/service";
import { pickLatestWeek } from "@/lib/drop/read";
import { slugsWithDeals } from "@/lib/seo/cities";

const BASE = "https://wloczykij.me";

// Miasta z żywymi okazjami w ostatnim tygodniu; bez bazy sitemap działa dalej, tylko bez stron miast
async function citySlugsWithDeals(): Promise<string[]> {
  try {
    const { data } = await createServiceClient().from("drop_deals").select("city_name, week").order("week", { ascending: false }).limit(1500);
    if (!data) return [];
    return slugsWithDeals(pickLatestWeek(data as { week: string; city_name: string }[]).map((r) => r.city_name));
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = getAllPosts();
  const citySlugs = await citySlugsWithDeals();

  const blogEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${BASE}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  // Posty są posortowane od najnowszego — indeks bloga zmienia się razem z nimi.
  // Strony statyczne nie mają lastModified: zgadywana data jest gorsza niż jej brak.
  const latestPost = posts[0] ? new Date(posts[0].date) : undefined;

  return [
    { url: BASE, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/pricing`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/okazje`, changeFrequency: "weekly", priority: 0.9 },
    // Modlin odpowiada danymi z Okęcia (Travelpayouts zwraca kod miasta WAW), więc nie dublujemy go w indeksie
    ...POLISH_AIRPORTS.filter((a) => a.code !== "WMI").map((a) => ({
      url: `${BASE}/okazje/${a.code.toLowerCase()}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...citySlugs.map((slug) => ({ url: `${BASE}/weekend/${slug}`, changeFrequency: "weekly" as const, priority: 0.6 })),
    { url: `${BASE}/blog`, lastModified: latestPost, changeFrequency: "weekly", priority: 0.9 },
    ...blogEntries,
    { url: `${BASE}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE}/regulamin`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE}/cookies`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
