import fs from "fs";
import path from "path";
import matter from "gray-matter";

const BLOG_DIR = path.join(process.cwd(), "src/content/blog");

export interface PostMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  coverIcon: string;
  tags: string[];
  readingTime: number;
  /** data ostatniej istotnej zmiany treści (frontmatter `updated`); używana w dateModified i sitemapie */
  updated?: string;
  /** pytania i odpowiedzi (frontmatter `faq`); muszą zgadzać się z widoczną sekcją artykułu */
  faq?: { q: string; a: string }[];
}

export interface Post extends PostMeta {
  content: string;
}

function parseMeta(slug: string, data: Record<string, unknown>): PostMeta {
  const faq = Array.isArray(data.faq)
    ? (data.faq as { q?: unknown; a?: unknown }[])
        .filter((f) => typeof f?.q === "string" && typeof f?.a === "string")
        .map((f) => ({ q: f.q as string, a: f.a as string }))
    : [];
  return {
    slug,
    title: (data.title as string) ?? "",
    description: (data.description as string) ?? "",
    date: (data.date as string) ?? "",
    coverIcon: (data.coverIcon as string) ?? "plane",
    tags: (data.tags as string[]) ?? [],
    readingTime: (data.readingTime as number) ?? 5,
    ...(typeof data.updated === "string" ? { updated: data.updated } : {}),
    ...(faq.length > 0 ? { faq } : {}),
  };
}

export function getAllPosts(): PostMeta[] {
  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith(".mdx"));

  return files
    .map((file) => {
      const slug = file.replace(/\.mdx$/, "");
      const raw = fs.readFileSync(path.join(BLOG_DIR, file), "utf-8");
      return parseMeta(slug, matter(raw).data);
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPost(slug: string): Post | null {
  const filePath = path.join(BLOG_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;

  const { data, content } = matter(fs.readFileSync(filePath, "utf-8"));
  return { ...parseMeta(slug, data), content };
}
