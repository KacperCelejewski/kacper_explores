"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import SiteNav from "@/app/components/SiteNav";

interface GalleryTrip {
  id: string;
  city: string;
  country: string;
  destination_data: { coverImage?: string; countryFlag?: string } | null;
  quiz_answers: { duration?: number; budget?: string } | null;
  created_at: string;
}

const SHORT_MONTHS = ["sty","lut","mar","kwi","maj","cze","lip","sie","wrz","paź","lis","gru"];
function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export default function OdkryjPage() {
  const [trips, setTrips] = useState<GalleryTrip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/gallery")
      .then((r) => r.json())
      .then((d) => setTrips(d.trips ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col flex-1">
      <SiteNav />
      <div className="px-5 pt-6 pb-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: "var(--accent)" }}>
            Odkryj
          </p>
          <h1 className="text-2xl font-bold mb-1">Plany innych podróżników</h1>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
            Przeglądaj trasy wygenerowane przez społeczność Włóczykij
          </p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div
              className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
            />
          </div>
        ) : trips.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">🗺️</p>
            <p className="text-sm font-medium">Brak publicznych planów</p>
            <p className="text-xs mt-1 mb-6" style={{ color: "var(--text-muted)" }}>
              Bądź pierwszy — udostępnij swój plan z planu podróży
            </p>
            <Link href="/quiz" className="btn-primary" style={{ display: "inline-block", width: "auto", padding: "12px 24px", textDecoration: "none" }}>
              Stwórz plan →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {trips.map((trip, i) => (
              <motion.div
                key={trip.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link
                  href={`/share/${trip.id}`}
                  style={{ textDecoration: "none" }}
                >
                  <div
                    className="glass-card p-4 flex items-center gap-4 transition-opacity hover:opacity-80"
                  >
                    <span className="text-3xl flex-shrink-0">
                      {trip.destination_data?.coverImage ?? "🗺️"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-base leading-tight">
                        {trip.city} {trip.destination_data?.countryFlag ?? ""}
                      </p>
                      <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
                        {trip.country}
                        {trip.quiz_answers?.duration ? ` · ${trip.quiz_answers.duration} dni` : ""}
                        {trip.quiz_answers?.budget === "low" ? " · 🎒 Backpacker" : " · 🧳 Komfort"}
                        {" · "}{formatDate(trip.created_at)}
                      </p>
                    </div>
                    <span className="text-xs font-semibold flex-shrink-0" style={{ color: "var(--accent)" }}>
                      Zobacz →
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
