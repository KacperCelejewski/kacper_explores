import type { FlightOffer } from "@/types";
import type { RealFlight } from "@/lib/flights/rapidapi";

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

function calcArrivalDay(dayNumber: number, realArrivalTime?: string): DaySchedule {
  if (realArrivalTime) {
    const arrHour = parseHour(realArrivalTime);
    const from = formatTime(addHours(realArrivalTime, 1.5));
    const fromHour = arrHour + 1.5;

    let instruction: string;
    if (fromHour >= 21) {
      instruction = `DZIEŃ ${dayNumber} — PRZYLOT o ${realArrivalTime} (CZAS LOKALNY). Dojazd do centrum ~1,5h → dostępny od ~${from}. TYLKO: zameldowanie, kolacja w pobliżu. Maksymalnie 2 aktywności. BEZ zwiedzania.`;
    } else if (fromHour >= 15) {
      instruction = `DZIEŃ ${dayNumber} — PRZYLOT o ${realArrivalTime}. Dojazd → centrum od ~${from}. Zaplanuj popołudnie i wieczór: zameldowanie, spacer, kolacja. 4-5 aktywności od ${from}.`;
    } else if (fromHour >= 11) {
      instruction = `DZIEŃ ${dayNumber} — PRZYLOT o ${realArrivalTime}. Dojazd → centrum od ~${from}. Pełne popołudnie: zameldowanie, pierwsze atrakcje, kolacja. 5-6 aktywności od ${from}.`;
    } else {
      instruction = `DZIEŃ ${dayNumber} — PRZYLOT o ${realArrivalTime}. Dojazd → centrum od ~${from}. Prawie pełny dzień — szybkie zameldowanie, intensywne zwiedzanie. 6-7 aktywności od ${from}.`;
    }
    return { dayNumber, type: "arrival", availableFrom: from, availableTo: "23:00", instruction };
  }

  // Fallback: no real data — assume typical mid-afternoon arrival
  return {
    dayNumber,
    type: "arrival",
    availableFrom: "14:30",
    availableTo: "23:00",
    instruction: `DZIEŃ ${dayNumber} — DZIEŃ PRZYBYCIA (godzina lotu nieznana). Przyjmij że podróżnik dociera do centrum ok. 14:30 (typowy lot budżetowy z Polski + dojazd ~1,5h). Zaplanuj: zameldowanie, spacer orientacyjny, kolacja. 4-5 aktywności od 14:30. BEZ wczesnych atrakcji.`,
  };
}

function calcDepartureDay(dayNumber: number, realReturnDepartureTime?: string): DaySchedule {
  if (realReturnDepartureTime) {
    const retHour = parseHour(realReturnDepartureTime);
    // Need to leave hotel ~3h before flight (transfer + security)
    const checkoutHour = Math.max(6, retHour - 3);
    const checkoutTime = formatTime(String(checkoutHour).padStart(2, "0") + ":00");

    let instruction: string;
    if (retHour <= 9) {
      instruction = `DZIEŃ ${dayNumber} — POWRÓT. LOT O ${realReturnDepartureTime} — bardzo wczesny wylot! Wyjście z hotelu ok. ${checkoutTime}. Zaplanuj TYLKO: szybkie śniadanie na wynos, wymeldowanie. Maksymalnie 1-2 aktywności o świcie. BEZ zwiedzania.`;
    } else if (retHour <= 14) {
      instruction = `DZIEŃ ${dayNumber} — POWRÓT. LOT O ${realReturnDepartureTime} — wymeldowanie do ${checkoutTime}. Zaplanuj TYLKO poranek: śniadanie, krótki spacer w pobliżu hotelu, wymeldowanie. Maksymalnie 2-3 aktywności. Bez odległych miejsc.`;
    } else {
      instruction = `DZIEŃ ${dayNumber} — POWRÓT. LOT O ${realReturnDepartureTime} — wymeldowanie do ${checkoutTime}. Zaplanuj spokojne przedpołudnie: śniadanie, kilka bliskich atrakcji, wymeldowanie, bagażownia w hotelu. Do 4 aktywności. Bez odległych miejsc ani rezerwacji.`;
    }
    return { dayNumber, type: "departure", availableFrom: "07:00", availableTo: checkoutTime, instruction };
  }

  // Fallback
  return {
    dayNumber,
    type: "departure",
    availableFrom: "07:00",
    availableTo: "11:00",
    instruction: `DZIEŃ ${dayNumber} — DZIEŃ POWROTU (godzina lotu nieznana). Przyjmij wymeldowanie do 11:00. Zaplanuj TYLKO: śniadanie, krótki spacer, wymeldowanie. Maksymalnie 3 aktywności do 11:00. ZERO odległych miejsc.`,
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
  duration: number,
  realFlight?: RealFlight | null
): TripSchedule {
  const arrivalTime = realFlight?.arrivalTime ?? null;
  const arrivalDate = realFlight?.departureDate ?? flight.departureDate ?? null;
  const returnDate = realFlight?.returnDate ?? flight.returnDate ?? null;

  const days: DaySchedule[] = [];

  if (duration === 1) {
    days.push({
      dayNumber: 1,
      type: "arrival_and_departure",
      availableFrom: realFlight ? formatTime(addHours(realFlight.arrivalTime, 1.5)) : "14:00",
      availableTo: realFlight ? formatTime(String(Math.max(6, parseHour(realFlight.returnDepartureTime) - 3)).padStart(2,"0") + ":00") : "11:00",
      instruction: realFlight
        ? `DZIEŃ 1 — PRZYLOT O ${realFlight.arrivalTime}, POWRÓT O ${realFlight.returnDepartureTime}. Czas w mieście: ${formatTime(addHours(realFlight.arrivalTime, 1.5))}–${formatTime(String(Math.max(6, parseHour(realFlight.returnDepartureTime) - 3)).padStart(2,"0") + ":00")}. Zaplanuj 3-4 aktywności blisko centrum.`
        : `DZIEŃ 1 — PRZYLOT I POWRÓT TEGO SAMEGO DNIA. Zaplanuj 3-4 aktywności blisko centrum. Lekki plan.`,
    });
    return { days, arrivalTime: arrivalTime ?? "14:00", arrivalDate, returnDate, usefulDays: 1 };
  }

  days.push(calcArrivalDay(1, arrivalTime ?? undefined));

  for (let d = 2; d < duration; d++) {
    days.push(fullDay(d));
  }

  days.push(calcDepartureDay(duration, realFlight?.returnDepartureTime ?? undefined));

  const usefulDays = days.filter((d) => {
    const from = parseHour(d.availableFrom);
    const to = parseHour(d.availableTo);
    return (to - from) >= 4;
  }).length;

  return { days, arrivalTime: arrivalTime ?? "14:00", arrivalDate, returnDate, usefulDays };
}

export function formatScheduleForPrompt(schedule: TripSchedule): string {
  const lines = schedule.days.map((d) => d.instruction);
  return lines.join("\n\n");
}
