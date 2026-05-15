import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getAllPosts, getPost } from "@/lib/blog";
import SiteNav from "../../components/SiteNav";
import SiteFooter from "../../components/SiteFooter";

export async function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `https://wloczykij.me/blog/${slug}` },
    openGraph: {
      title: `${post.title} | Włóczykij`,
      description: post.description,
      url: `https://wloczykij.me/blog/${slug}`,
      type: "article",
      publishedTime: post.date,
      tags: post.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: `${post.title} | Włóczykij`,
      description: post.description,
    },
  };
}

const mdxComponents = {
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="text-xl font-bold mt-8 mb-3 leading-snug" style={{ color: "var(--text-primary)" }} {...props} />
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="text-base font-bold mt-6 mb-2" style={{ color: "var(--text-primary)" }} {...props} />
  ),
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--text-primary)" }} {...props} />
  ),
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="flex flex-col gap-2 mb-4 pl-1" {...props} />
  ),
  li: (props: React.HTMLAttributes<HTMLLIElement>) => (
    <li className="flex items-start gap-2 text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
      <span style={{ color: "var(--accent)", flexShrink: 0, marginTop: 2 }}>✦</span>
      <span {...props} />
    </li>
  ),
  strong: (props: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-semibold" style={{ color: "var(--text-primary)" }} {...props} />
  ),
  blockquote: (props: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote
      className="px-4 py-3 rounded-2xl my-4 text-sm leading-relaxed italic"
      style={{ background: "var(--accent-light)", borderLeft: "3px solid var(--accent)", color: "var(--text-primary)" }}
      {...props}
    />
  ),
  hr: () => <hr className="my-6" style={{ borderColor: "var(--border)" }} />,
};

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    inLanguage: "pl",
    url: `https://wloczykij.me/blog/${slug}`,
    author: { "@type": "Person", name: "Kacper", url: "https://wloczykij.me" },
    publisher: { "@type": "Organization", name: "Włóczykij", url: "https://wloczykij.me" },
    keywords: post.tags.join(", "),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <SiteNav />
      <article className="flex flex-col flex-1 px-5 pb-10">
        {/* Back */}
        <div className="pt-6 pb-2">
          <Link
            href="/blog"
            className="text-xs font-semibold"
            style={{ color: "var(--accent)", textDecoration: "none" }}
          >
            ← Wszystkie artykuły
          </Link>
        </div>

        {/* Header */}
        <header className="pt-4 pb-6">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-5"
            style={{ background: "var(--accent-light)" }}
          >
            {post.coverEmoji}
          </div>
          <h1 className="text-3xl font-bold leading-tight">{post.title}</h1>
          <p className="text-sm mt-3 leading-relaxed" style={{ color: "var(--text-muted)" }}>
            {post.description}
          </p>
          <div className="flex items-center gap-3 mt-4">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {new Date(post.date).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" })}
            </span>
            <span style={{ color: "var(--text-muted)" }}>·</span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{post.readingTime} min czytania</span>
          </div>
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs font-semibold px-3 py-1 rounded-full"
                  style={{ background: "var(--accent-light)", color: "var(--accent)" }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </header>

        <div className="h-px mb-6" style={{ background: "var(--border)" }} />

        {/* Content */}
        <div className="flex flex-col">
          <MDXRemote source={post.content} components={mdxComponents} />
        </div>

        <div className="h-px mt-6 mb-8" style={{ background: "var(--border)" }} />

        {/* CTA */}
        <div
          className="p-5 rounded-2xl text-center"
          style={{ background: "var(--accent-light)", border: "1px solid rgba(255,107,53,0.2)" }}
        >
          <p className="text-sm font-bold" style={{ color: "var(--accent)" }}>
            Gotowy na swoją podróż? →
          </p>
          <p className="text-xs mt-1 mb-4" style={{ color: "var(--text-muted)" }}>
            AI znajdzie najtańszy lot i zaplanuje Twój wyjazd godzina po godzinie
          </p>
          <Link
            href="/quiz"
            className="btn-primary"
            style={{ display: "inline-block", textDecoration: "none", fontSize: "0.875rem" }}
          >
            Zaplanuj podróż za darmo →
          </Link>
        </div>
      </article>
      <SiteFooter />
    </>
  );
}
