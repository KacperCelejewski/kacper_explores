const BASE = "https://wloczykij.me";

export function breadcrumbLd(items: { name: string; path: string }[]): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${BASE}${it.path}`,
    })),
  };
}

export function faqLd(items: { q: string; a: string }[]): object {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}

export function itemListLd(items: { name: string; path: string }[]): object {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      url: `${BASE}${it.path}`,
    })),
  };
}

// JSON do znacznika <script type="application/ld+json">: < zamieniamy, żeby tekst nie zamknął znacznika
export function jsonLdScript(obj: object): string {
  return JSON.stringify(obj).replace(/</g, "\\u003c");
}
