"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAppStore } from "@/lib/store";
import type { DayPlan, TripPlan, DestinationRecommendation } from "@/types";

const DAY_COLORS = [
  "#C4622D","#2D6BC4","#2DC45A","#C42DB9","#C4A82D",
  "#2DC4B9","#C42D3A","#6B2DC4","#2D8CC4","#C47B2D",
];

interface GeocodedActivity {
  lat: number;
  lon: number;
  title: string;
  time: string;
  emoji: string;
  type: string;
  dayIndex: number;
  dayNum: number;
  color: string;
}

async function geocodePhoton(location: string, city: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const q = encodeURIComponent(`${location}, ${city}`);
    const res = await fetch(
      `https://photon.komoot.io/api/?q=${q}&limit=1&lang=en`,
      { signal: AbortSignal.timeout(5000) }
    );
    const data = await res.json();
    const feat = data.features?.[0];
    if (!feat) return null;
    const [lon, lat] = feat.geometry.coordinates;
    return { lat, lon };
  } catch {
    return null;
  }
}

export default function MapPage() {
  const router = useRouter();
  const params = useParams<{ tripId: string }>();
  const { currentTrip, setCurrentTrip, updateTripActivity } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [points, setPoints] = useState<GeocodedActivity[]>([]);
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const geocodingStarted = useRef(false);

  // Load trip if not in store
  useEffect(() => {
    const tripId = params?.tripId;
    if (!tripId) { router.replace("/"); return; }
    if (currentTrip?.id === tripId && currentTrip.plan) return;

    setLoading(true);
    fetch(`/api/trips/${tripId}`)
      .then((r) => {
        if (!r.ok) { router.replace("/"); return null; }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        setCurrentTrip({
          id: data.id,
          destination: data.destination,
          quizAnswers: data.quizAnswers,
          plan: data.plan as TripPlan,
          createdAt: new Date().toISOString(),
        });
      })
      .finally(() => setLoading(false));
  }, [params?.tripId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Geocode — parallel Photon, cache results in store
  useEffect(() => {
    const plan = currentTrip?.plan;
    if (!plan || geocodingStarted.current) return;
    geocodingStarted.current = true;

    // Collect activities that need geocoding (or already have coords)
    type WorkItem = {
      loc: string;
      city: string;
      dayIndex: number;
      actIndex: number;
      day: DayPlan;
      act: DayPlan["activities"][number];
    };

    const cached: GeocodedActivity[] = [];
    const toFetch: WorkItem[] = [];

    plan.days.forEach((day, dayIndex) => {
      day.activities.forEach((act, actIndex) => {
        if (!act.location || act.type === "tip" || act.type === "transport") return;
        if (act.lat != null && act.lon != null) {
          cached.push({
            lat: act.lat,
            lon: act.lon,
            title: act.title,
            time: act.time,
            emoji: act.emoji,
            type: act.type,
            dayIndex,
            dayNum: day.day,
            color: DAY_COLORS[dayIndex % DAY_COLORS.length],
          });
        } else {
          toFetch.push({ loc: act.location, city: plan.city, dayIndex, actIndex, day, act });
        }
      });
    });

    if (toFetch.length === 0) {
      setPoints(cached);
      return;
    }

    setGeocoding(true);
    setProgress(0);

    let done = 0;
    const fetched: GeocodedActivity[] = [];

    Promise.all(
      toFetch.map(async ({ loc, city, dayIndex, actIndex, day, act }) => {
        const coords = await geocodePhoton(loc, city);
        done++;
        setProgress(Math.round((done / toFetch.length) * 100));
        if (!coords) return;

        // Cache into store so next map open is instant
        updateTripActivity(dayIndex, actIndex, { ...act, lat: coords.lat, lon: coords.lon });

        fetched.push({
          lat: coords.lat,
          lon: coords.lon,
          title: act.title,
          time: act.time,
          emoji: act.emoji,
          type: act.type,
          dayIndex,
          dayNum: day.day,
          color: DAY_COLORS[dayIndex % DAY_COLORS.length],
        });
      })
    ).then(() => {
      setPoints([...cached, ...fetched]);
      setGeocoding(false);
    });
  }, [currentTrip?.plan]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapRef.current || points.length === 0 || mapInstanceRef.current) return;

    import("leaflet").then((L) => {
      if (!mapRef.current || mapInstanceRef.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const lats = points.map((p) => p.lat);
      const lons = points.map((p) => p.lon);
      const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      const centerLon = (Math.min(...lons) + Math.max(...lons)) / 2;

      const map = L.map(mapRef.current!).setView([centerLat, centerLon], 13);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      points.forEach((pt) => {
        const icon = L.divIcon({
          className: "",
          html: `<div style="background:${pt.color};width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:14px;line-height:1;">${pt.emoji}</span></div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -34],
        });

        L.marker([pt.lat, pt.lon], { icon })
          .addTo(map)
          .bindPopup(`<b>Dzień ${pt.dayNum} · ${pt.time}</b><br>${pt.title}`);
      });

      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lon]));
      map.fitBounds(bounds, { padding: [32, 32] });
    });

    return () => {
      if (mapInstanceRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mapInstanceRef.current as any).remove();
        mapInstanceRef.current = null;
      }
    };
  }, [points]);

  const plan = currentTrip?.plan;
  const dest = currentTrip?.destination as DestinationRecommendation | null;

  if (loading || !plan) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center gap-3">
        <span className="text-3xl animate-pulse">🗺️</span>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Ładowanie…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <button
          onClick={() => router.push(`/plan/${params?.tripId}`)}
          className="text-sm font-medium transition-opacity hover:opacity-60"
          style={{ color: "var(--text-muted)" }}
        >
          ← Plan
        </button>
        <p className="text-sm font-bold">
          {dest?.coverImage ?? "🗺️"} {plan.city} — mapa
        </p>
        <div />
      </div>

      {/* Day filter */}
      <div className="px-5 mb-3">
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          <button
            onClick={() => setActiveDay(null)}
            className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: activeDay === null ? "var(--accent)" : "#F0F0F0",
              color: activeDay === null ? "white" : "var(--text-secondary)",
            }}
          >
            Wszystkie
          </button>
          {plan.days.map((day, i) => (
            <button
              key={day.day}
              onClick={() => setActiveDay(i)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: activeDay === i ? DAY_COLORS[i % DAY_COLORS.length] : "#F0F0F0",
                color: activeDay === i ? "white" : "var(--text-secondary)",
              }}
            >
              Dzień {day.day}
            </button>
          ))}
        </div>
      </div>

      {/* Geocoding progress */}
      {geocoding && (
        <div className="px-5 mb-3">
          <div
            className="p-3 rounded-2xl flex items-center gap-3"
            style={{ background: "var(--accent-light)", border: "1px solid rgba(196,98,45,0.2)" }}
          >
            <div
              className="w-4 h-4 rounded-full border-2 animate-spin flex-shrink-0"
              style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
            />
            <div className="flex-1">
              <p className="text-xs font-semibold" style={{ color: "var(--accent)" }}>
                Szukam lokalizacji… {progress}%
              </p>
              <div className="mt-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(196,98,45,0.15)" }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress}%`, background: "var(--accent)" }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Map */}
      <div
        className="relative mx-5 mb-5 rounded-2xl overflow-hidden"
        style={{ height: "calc(100dvh - 280px)", minHeight: 320, border: "1px solid var(--border)" }}
      >
        {points.length === 0 && !geocoding && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Brak lokalizacji do wyświetlenia
            </p>
          </div>
        )}
        <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
      </div>

      {/* Legend */}
      {plan.days.length > 0 && (
        <div className="px-5 mb-5">
          <div className="flex flex-wrap gap-2">
            {plan.days.map((day, i) => (
              <div key={day.day} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: DAY_COLORS[i % DAY_COLORS.length] }} />
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>Dzień {day.day}: {day.theme}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
