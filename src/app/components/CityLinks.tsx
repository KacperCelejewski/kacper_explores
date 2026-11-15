import Link from "next/link";
import type { CatalogEntry } from "@/lib/destinations/catalog";
import { citySlug } from "@/lib/seo/cities";

// Spis linków do stron miast (/weekend/[miasto]); renderuje się tylko wtedy, gdy są miasta z cenami
export default function CityLinks({ cities, title, limit }: { cities: CatalogEntry[]; title: string; limit?: number }) {
  const shown = limit ? cities.slice(0, limit) : cities;
  if (shown.length === 0) return null;
  return (
    <section aria-label={title} className="max-w-2xl mx-auto w-full px-5 pt-10 pb-4">
      <h2 className="text-xl font-bold mb-3">{title}</h2>
      <ul className="flex flex-wrap gap-x-5 gap-y-2 list-none p-0">
        {shown.map((c) => (
          <li key={c.city}>
            <Link href={`/weekend/${citySlug(c)}`} className="font-semibold underline underline-offset-2" style={{ color: "var(--accent)" }}>
              {c.city}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
