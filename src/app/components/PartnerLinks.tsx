"use client";

import type { DayActivity, FlightOffer } from "@/types";
import {
  bookingLink, flightLink, hostelworldLink, isFreeCost, luggageLink, partnerLinkProps, ticketsLink,
} from "@/lib/affiliate";

export function PartnerNote({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
      link partnerski
    </span>
  );
}

export function HotelLinks({
  city, country, checkin, checkout,
}: { city: string; country: string; checkin?: string; checkout?: string }) {
  const booking = bookingLink({ city, country, checkin, checkout });
  const hostelworld = hostelworldLink(city);
  const options = [
    { label: "🛏️ Booking.com", sub: "Hotele i apartamenty", link: booking, color: "#003580", bg: "#EEF3FF" },
    { label: "🏕️ Hostelworld", sub: "Hostele dla backpackerów", link: hostelworld, color: "#FF6C2F", bg: "#FFF0E8" },
  ];

  return (
    <div className="px-5 mb-4 no-print">
      <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: "var(--text-muted)" }}>
        Noclegi w {city}
      </p>
      <div className="flex flex-col gap-2">
        {options.map((opt) => (
          <a
            key={opt.label}
            {...partnerLinkProps(opt.link, "hotel", city)}
            className="flex items-center justify-between p-4 rounded-2xl transition-opacity hover:opacity-80"
            style={{ background: opt.bg, textDecoration: "none", border: `1px solid ${opt.color}22` }}
          >
            <div>
              <p className="text-sm font-bold" style={{ color: opt.color }}>{opt.label}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{opt.sub}</p>
            </div>
            <span className="text-xs font-semibold" style={{ color: opt.color }}>Szukaj →</span>
          </a>
        ))}
      </div>
      <div className="mt-2">
        <PartnerNote show={booking.paid || hostelworld.paid} />
      </div>
    </div>
  );
}

function shortDate(iso?: string): string | null {
  return iso && /^\d{4}-\d{2}-\d{2}/.test(iso) ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}` : null;
}

export function FlightCard({ offer, city }: { offer: FlightOffer | undefined; city: string }) {
  const link = flightLink(offer);
  if (!offer || !link) return null;

  const from = shortDate(offer.departureDate);
  const to = shortDate(offer.returnDate);
  const dates = from && to ? ` · ${from}–${to}` : "";

  return (
    <div className="px-5 mb-4 no-print">
      <a
        {...partnerLinkProps(link, "flight", city)}
        className="flex items-center justify-between p-4 rounded-2xl transition-opacity hover:opacity-80"
        style={{ background: "#F0F7FF", textDecoration: "none", border: "1px solid #1A73E822" }}
      >
        <div>
          <p className="text-sm font-bold" style={{ color: "#1A56B0" }}>✈️ Lot do {city}</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {offer.origin.city} ({offer.origin.code}) · {offer.price} zł{dates}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            cena z ostatnich wyszukiwań, może się zmienić
          </p>
        </div>
        <span className="text-xs font-semibold" style={{ color: "#1A56B0" }}>Sprawdź lot →</span>
      </a>
      <div className="mt-2">
        <PartnerNote show={link.paid} />
      </div>
    </div>
  );
}

export function TicketsLink({ activity, city }: { activity: DayActivity; city: string }) {
  if (activity.type !== "attraction" || isFreeCost(activity.cost)) return null;
  const link = ticketsLink({ title: activity.title, city });
  return (
    <div className="flex items-center gap-2 mt-1.5 no-print">
      <a
        {...partnerLinkProps(link, "tickets", city)}
        onClick={(e) => e.stopPropagation()}
        className="text-xs font-semibold transition-opacity hover:opacity-70"
        style={{ color: "#1A73E8", textDecoration: "none" }}
      >
        Sprawdź bilety ↗
      </a>
      <PartnerNote show={link.paid} />
    </div>
  );
}

export function LuggageTile({ city }: { city: string }) {
  const link = luggageLink();
  return (
    <div
      className="ml-11 mt-3 rounded-2xl px-4 py-3 no-print"
      style={{ background: "#F7F7F5", border: "1px solid var(--border)" }}
    >
      <p className="text-sm font-semibold">Wymeldowanie przed wylotem?</p>
      <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text-muted)" }}>
        Zostaw bagaż na kilka godzin i zwiedzaj bez plecaka.
      </p>
      <div className="flex items-center gap-2 mt-1.5">
        <a
          {...partnerLinkProps(link, "luggage", city)}
          className="text-xs font-semibold transition-opacity hover:opacity-70"
          style={{ color: "#1A73E8", textDecoration: "none" }}
        >
          Znajdź przechowalnię ↗
        </a>
        <PartnerNote show={link.paid} />
      </div>
    </div>
  );
}
