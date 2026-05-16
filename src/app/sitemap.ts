import { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts();

  const blogEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `https://wloczykij.me/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [
    {
      url: "https://wloczykij.me",
      lastModified: new Date("2025-05-10"),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://wloczykij.me/pricing",
      lastModified: new Date("2025-05-10"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://wloczykij.me/blog",
      lastModified: new Date("2025-05-10"),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...blogEntries,
  ];
}
