import type { Partner } from "@/lib/affiliate";
import type { FlightPassengers } from "@/lib/group";

// Skyscanner dostaje tylko dorosłych, Aviasales dorosłych i dzieci; reszta wypada z linku.
export function droppedPassengersNote(partner: Partner, passengers: FlightPassengers | undefined): string | null {
  if (!passengers) return null;
  const dropped = partner === "skyscanner" ? passengers.children + passengers.infants
    : partner === "aviasales" ? passengers.infants
    : 0;
  return dropped > 0 ? "Dzieci dodasz na stronie wyszukiwarki." : null;
}
