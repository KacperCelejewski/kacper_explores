"use client";

import type { TravelEstimate } from "@/types";
import { routeSearchUrl, travelCopy, TRAVEL_ESTIMATE_NOTE } from "@/lib/transport";

/**
 * Dojazd lądowy na karcie kierunku i w planie: czas, odległość i koszt orientacyjny, jawnie jako szacunek.
 * Linki prowadzą do wyszukiwarki tras (Mapy Google), zwykłe, bez partnera i bez prowizji.
 */
export default function TravelBlock({
  estimates, origin, city, seats = 1, showRouteLinks = true,
}: { estimates: TravelEstimate[]; origin: string | null; city: string; seats?: number; showRouteLinks?: boolean }) {
  if (estimates.length === 0) return null;
  return (
    <div data-testid="travel-block">
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>Dojazd (szacunek)</p>
      <ul className="mt-1 space-y-2">
        {estimates.map((estimate) => {
          const copy = travelCopy(estimate, seats);
          return (
            <li key={estimate.mode}>
              <p className="font-bold text-sm" style={{ color: "var(--accent)" }}>{copy.title}: {copy.route}</p>
              {copy.cost && (
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {copy.cost}{copy.perPerson ? ` · ${copy.perPerson}` : ""}
                </p>
              )}
              {showRouteLinks && origin && (
                <a
                  href={routeSearchUrl(estimate.mode, origin, city)}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-route={estimate.mode}
                  className="text-xs font-medium px-3 mt-1 rounded-xl transition-opacity hover:opacity-70 inline-flex items-center"
                  style={{ background: "var(--bg-surface)", color: "var(--text-muted)", border: "1px solid var(--border)", minHeight: 44 }}
                >
                  Sprawdź trasę ↗
                </a>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>{TRAVEL_ESTIMATE_NOTE}</p>
    </div>
  );
}
