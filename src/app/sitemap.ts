import { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";
import { POLISH_AIRPORTS } from "@/lib/airports";

const BASE = "https://wloczykij.me";

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts();

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
    { url: `${BASE}/blog`, lastModified: latestPost, changeFrequency: "weekly", priority: 0.9 },
    ...blogEntries,
    { url: `${BASE}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE}/regulamin`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE}/cookies`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
