import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/lib/blog";
import SiteNav from "../components/SiteNav";
import SiteFooter from "../components/SiteFooter";

export const metadata: Metadata = {
  title: "Blog o podróżach solo",
  description: "Praktyczne przewodniki po budżetowych podróżach solo po Europie. Jak podróżować tanio, bezpiecznie i na własnych zasadach.",
  alternates: { canonical: "https://wloczykij.me/blog" },
  openGraph: {
    title: "Blog o podróżach solo | Kacper Explores",
    description: "Praktyczne przewodniki po budżetowych podróżach solo po Europie.",
    url: "https://wloczykij.me/blog",
  },
};

const blogSchema = {
  "@context": "https://schema.org",
  "@type": "Blog",
  name: "Kacper Explores — Blog",
  url: "https://wloczykij.me/blog",
  description: "Praktyczne przewodniki po budżetowych podróżach solo po Europie.",
  inLanguage: "pl",
  publisher: {
    "@type": "Organization",
    name: "Kacper Explores",
    url: "https://wloczykij.me",
  },
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogSchema) }}
      />
      <SiteNav />
      <div className="flex flex-col flex-1 px-5 pb-10">
        <div className="pt-10 pb-6">
          <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: "var(--accent)" }}>
            Blog
          </p>
          <h1 className="text-3xl font-bold leading-tight">
            Podróże solo po Europie
          </h1>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Praktyczne przewodniki, triki budżetowe i inspiracje dla solo travelerów.
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
                    className="flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                    style={{ background: "var(--accent-light)" }}
                  >
                    {post.coverEmoji}
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

        <div className="mt-10 p-5 rounded-2xl text-center" style={{ background: "var(--accent-light)", border: "1px solid rgba(255,107,53,0.2)" }}>
          <p className="text-sm font-bold" style={{ color: "var(--accent)" }}>Gotowy na swoją podróż?</p>
          <p className="text-xs mt-1 mb-4" style={{ color: "var(--text-muted)" }}>
            AI znajdzie najtańszy lot i ułoży plan godzina po godzinie
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
