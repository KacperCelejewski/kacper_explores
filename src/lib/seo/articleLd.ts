import { breadcrumbLd } from "./jsonld";

const BASE = "https://wloczykij.me";

export const BLOG_NAME = "Blog Włóczykija";
export const EDITORIAL_AUTHOR = "Redakcja Włóczykija";

interface ArticleLdInput {
  title: string;
  description: string;
  date: string;
  /** data ostatniej istotnej zmiany treści; bez niej dateModified = data publikacji */
  updated?: string;
  tags: string[];
}

// Autor to zawsze redakcja marki (Organization): kanał marki nie podaje imienia ani twarzy
export function articleLd(post: ArticleLdInput, slug: string): object {
  const url = `${BASE}/blog/${slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.updated ?? post.date,
    inLanguage: "pl",
    url,
    mainEntityOfPage: url,
    image: `${BASE}/opengraph-image`,
    author: { "@type": "Organization", name: EDITORIAL_AUTHOR, url: BASE },
    publisher: {
      "@type": "Organization",
      name: "Włóczykij",
      url: BASE,
      logo: { "@type": "ImageObject", url: `${BASE}/logo.svg` },
    },
    keywords: post.tags.join(", "),
  };
}

export function articleBreadcrumbLd(title: string, slug: string): object {
  return breadcrumbLd([
    { name: "Strona główna", path: "/" },
    { name: BLOG_NAME, path: "/blog" },
    { name: title, path: `/blog/${slug}` },
  ]);
}
