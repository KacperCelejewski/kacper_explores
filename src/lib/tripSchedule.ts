import type { FlightOffer } from "@/types";

export interface DaySchedule {
  dayNumber: number;
  type: "arrival" | "full" | "departure" | "arrival_and_departure";
  availableFrom: string; // "10:00"
  availableTo: string;   // "22:00"
  instruction: string;   // injected into AI prompt
}

export interface TripSchedule {
  days: DaySchedule[];
  arrivalTime: string;
  arrivalDate: string | null;
  returnDate: string | null;
  usefulDays: number; // days with meaningful time (>= 4h)
}

function parseHour(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h + (m ?? 0) / 60;
}

function addHours(time: string, hours: number): string {
  const total = parseHour(time) + hours;
  const h = Math.min(Math.floor(total), 23);
  const m = Math.round((total - Math.floor(total)) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatTime(time: string): string {
  // Normalize "8:45" → "08:45"
  const [h, m] = time.split(":");
  return `${String(Number(h)).padStart(2, "0")}:${m ?? "00"}`;
}

// Day 1: arrival day — usable time starts after landing + transfer (~1.5h)
function calcArrivalDay(arrivalTime: string, dayNumber: number): DaySchedule {
  const arrHour = parseHour(arrivalTime);
  const availableFromHour = arrHour + 1.5; // transfer to city center

  if (availableFromHour >= 21) {
    return {
      dayNumber,
      type: "arrival",
      availableFrom: formatTime(addHours(arrivalTime, 1.5)),
      availableTo: "23:00",
      instruction: `DZIEŃ ${dayNumber} — PRZYLOT o ${arrivalTime}. Dojazd do centrum ~1.5h. Dostępny dopiero od ~${formatTime(addHours(arrivalTime, 1.5))}. Zaplanuj TYLKO: zameldowanie w hotelu/hostelu, kolację w pobliżu, ewentualnie nocny spacer. BEZ zwiedzania. Maksymalnie 3 aktywności.`,
    };
  }

  if (availableFromHour >= 15) {
    const from = formatTime(addHours(arrivalTime, 1.5));
    return {
      dayNumber,
      type: "arrival",
      availableFrom: from,
      availableTo: "23:00",
      instruction: `DZIEŃ ${dayNumber} — PRZYLOT o ${arrivalTime}. Dojazd do centrum ~1.5h, dostępny od ~${from}. Zaplanuj popołudnie i wieczór: zameldowanie, spacer po okolicy, kolacja. Nie planuj wczesnych atrakcji. 4-5 aktywności od ${from}.`,
    };
  }

  if (availableFromHour >= 11) {
    const from = formatTime(addHours(arrivalTime, 1.5));
    return {
      dayNumber,
      type: "arrival",
      availableFrom: from,
      availableTo: "23:00",
      instruction: `DZIEŃ ${dayNumber} — PRZYLOT o ${arrivalTime}. Dojazd do centrum ~1.5h, dostępny od ~${from}. Pełne popołudnie i wieczór — zameldowanie, pierwsze atrakcje w centrum, kolacja. 5-6 aktywności od ${from}.`,
    };
  }

  // Early arrival (before 11) — nearly full day
  const from = formatTime(addHours(arrivalTime, 1.5));
  return {
    dayNumber,
    type: "arrival",
    availableFrom: from,
    availableTo: "23:00",
    instruction: `DZIEŃ ${dayNumber} — PRZYLOT o ${arrivalTime}. Dojazd do centrum ~1.5h, dostępny od ~${from}. Prawie pełny dzień — szybkie zameldowanie, intensywne zwiedzanie od południa. 6-7 aktywności od ${from}.`,
  };
}

// Last day: departure day — need to leave accommodation early
// Without exact return flight time we use conservative 10:00 checkout
function calcDepartureDay(dayNumber: number, returnDate: string | null): DaySchedule {
  return {
    dayNumber,
    type: "departure",
    availableFrom: "07:00",
    availableTo: "10:00",
    instruction: `DZIEŃ ${dayNumber} — POWRÓT (${returnDate ?? "ostatni dzień"}). Nieznana godzina lotu — zaplanuj TYLKO poranek do 10:00: śniadanie, krótki spacer lub ostatni widok. Wymeldowanie z hotelu. Maksymalnie 3 aktywności. NIE planuj zwiedzania, zakupów ani odległych miejsc.`,
  };
}

function fullDay(dayNumber: number): DaySchedule {
  return {
    dayNumber,
    type: "full",
    availableFrom: "08:00",
    availableTo: "23:00",
    instruction: `DZIEŃ ${dayNumber} — PEŁNY DZIEŃ. Plan od 08:00 do 22:00, minimum 7 aktywności rozłożonych równomiernie przez cały dzień.`,
  };
}

export function calcTripSchedule(
  flight: FlightOffer,
  duration: number
): TripSchedule {
  const arrivalTime = flight.arrivalTime ?? "12:00";
  const arrivalDate = flight.departureDate ?? null;
  const returnDate = flight.returnDate ?? null;

  const days: DaySchedule[] = [];

  if (duration === 1) {
    // Edge case: single day trip
    const arrHour = parseHour(arrivalTime);
    const usableHours = 22 - (arrHour + 1.5);
    if (usableHours < 4) {
      days.push({
        dayNumber: 1,
        type: "arrival_and_departure",
        availableFrom: formatTime(addHours(arrivalTime, 1.5)),
        availableTo: "10:00",
        instruction: `DZIEŃ 1 — PRZYLOT o ${arrivalTime} i POWRÓT tego samego dnia. Realne godziny na miejscu: ${formatTime(addHours(arrivalTime, 1.5))}–10:00. Zaplanuj TYLKO 2-3 aktywności w okolicy lotniska lub centrum. To jest bardzo krótka wizyta.`,
      });
    } else {
      days.push(calcArrivalDay(arrivalTime, 1));
    }
    return { days, arrivalTime, arrivalDate, returnDate, usefulDays: 1 };
  }

  // Day 1: arrival
  days.push(calcArrivalDay(arrivalTime, 1));

  // Middle days: full
  for (let d = 2; d < duration; d++) {
    days.push(fullDay(d));
  }

  // Last day: departure
  days.push(calcDepartureDay(duration, returnDate));

  const usefulDays = days.filter((d) => {
    const from = parseHour(d.availableFrom);
    const to = parseHour(d.availableTo);
    return (to - from) >= 4;
  }).length;

  return { days, arrivalTime, arrivalDate, returnDate, usefulDays };
}

export function formatScheduleForPrompt(schedule: TripSchedule): string {
  const lines = schedule.days.map((d) => d.instruction);
  return lines.join("\n\n");
}
