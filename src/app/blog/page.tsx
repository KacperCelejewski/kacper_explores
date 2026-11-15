import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/lib/blog";
import { BLOG_NAME } from "@/lib/seo/articleLd";
import { breadcrumbLd, jsonLdScript } from "@/lib/seo/jsonld";
import SiteNav from "../components/SiteNav";
import SiteFooter from "../components/SiteFooter";
import {
  IconCompass,
  IconGlobe,
  IconCoin,
  IconPlane,
  IconMountain,
} from "@/app/components/Icons";

type IconFC = React.FC<{ size?: number }>;

const COVER_ICONS: Record<string, IconFC> = {
  compass: IconCompass,
  globe: IconGlobe,
  coin: IconCoin,
  plane: IconPlane,
  mountain: IconMountain,
};

export const metadata: Metadata = {
  title: BLOG_NAME,
  description: "Praktyczne przewodniki po budżetowych wyjazdach po Europie: wyjazd ze znajomymi, solo i we dwoje. Budżet, loty, kierunki i plany na weekend.",
  alternates: { canonical: "https://wloczykij.me/blog" },
  openGraph: {
    title: `${BLOG_NAME} | Włóczykij`,
    description: "Praktyczne przewodniki po budżetowych wyjazdach po Europie: budżet, loty, kierunki i plany na weekend.",
    url: "https://wloczykij.me/blog",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
};

const blogSchema = {
  "@context": "https://schema.org",
  "@type": "Blog",
  name: BLOG_NAME,
  url: "https://wloczykij.me/blog",
  description: "Praktyczne przewodniki po budżetowych wyjazdach po Europie: budżet, loty, kierunki i plany na weekend.",
  inLanguage: "pl",
  publisher: {
    "@type": "Organization",
    name: "Włóczykij",
    url: "https://wloczykij.me",
  },
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <>
      {[blogSchema, breadcrumbLd([{ name: "Strona główna", path: "/" }, { name: BLOG_NAME, path: "/blog" }])].map((s, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(s) }} />
      ))}
      <SiteNav />
      <div className="flex flex-col flex-1 px-5 pb-10">
        <div className="pt-10 pb-6">
          <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: "var(--accent)" }}>
            Blog
          </p>
          <h1 className="text-3xl font-bold leading-tight">
            {BLOG_NAME}
          </h1>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Praktyczne przewodniki, triki budżetowe i inspiracje na wyjazd w ekipie, solo albo we dwoje.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              style={{ textDecoration: "none" }}
            >
              <article
                className="p-5 rounded-2xl transition-all hover:shadow-md"
                style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{ background: "var(--accent-light)", color: "var(--accent)" }}
                  >
                    {(() => { const Icon = COVER_ICONS[post.coverIcon] ?? IconPlane; return <Icon size={22} />; })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-bold leading-snug" style={{ color: "var(--text-primary)" }}>
                      {post.title}
                    </h2>
                    <p className="text-xs mt-1 leading-relaxed line-clamp-2" style={{ color: "var(--text-muted)" }}>
                      {post.description}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {new Date(post.date).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" })}
                      </span>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>·</span>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{post.readingTime} min czytania</span>
                    </div>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>

        <div className="mt-10 p-5 rounded-2xl text-center" style={{ background: "var(--accent-light)", border: "1px solid var(--border)" }}>
          <p className="text-sm font-bold" style={{ color: "var(--accent)" }}>Gotowe na wyjazd?</p>
          <p className="text-xs mt-1 mb-4" style={{ color: "var(--text-muted)" }}>
            Twój weekend w 3 minuty: lot i plan z cenami
          </p>
          <Link
            href="/quiz"
            className="btn-primary"
            style={{ display: "inline-block", textDecoration: "none", fontSize: "0.875rem" }}
          >
            Zaplanuj podróż →
          </Link>
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
