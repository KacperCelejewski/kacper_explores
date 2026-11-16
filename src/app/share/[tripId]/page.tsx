import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { lookupPublicTrip } from "@/lib/shareTrip";
import { shareMetaText } from "@/lib/shareOg";
import ShareClient from "./ShareClient";

export async function generateMetadata(
  { params }: { params: Promise<{ tripId: string }> }
): Promise<Metadata> {
  const { tripId } = await params;
  const found = await lookupPublicTrip(tripId);

  if (found.status === "found") {
    const { title, description } = shareMetaText(found.model);
    const url = `https://wloczykij.me/share/${tripId}`;
    // Obrazek podglądu dokłada plik opengraph-image.tsx obok tej strony
    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: { type: "article", title: `${title} | Włóczykij`, description, url, siteName: "Włóczykij", locale: "pl_PL" },
      twitter: { card: "summary_large_image", title: `${title} | Włóczykij`, description },
    };
  }

  return {
    title: "Plan podróży",
    description: "Plan podróży wygenerowany przez Włóczykij.",
    // Nieistniejący lub prywatny plan nie ma czego robić w indeksie
    robots: { index: false, follow: false },
  };
}

export default async function SharePage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  // Prawdziwy 404 dla planu, którego nie ma albo który nie jest publiczny (wcześniej: 200 z komunikatem w kliencie).
  // Przy awarii bazy renderujemy klienta jak dawniej, żeby chwilowy błąd nie ogłaszał 404 poprawnego linku.
  const found = await lookupPublicTrip(tripId);
  if (found.status === "missing") notFound();
  return <ShareClient />;
}
