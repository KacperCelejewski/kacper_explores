import type { FlightDetails } from "@/types";

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
  const [h, m] = time.split(":");
  return `${String(Number(h)).padStart(2, "0")}:${m ?? "00"}`;
}

function calcArrivalDay(dayNumber: number, arrivalTime?: string): DaySchedule {
  if (arrivalTime) {
    const arrHour = parseHour(arrivalTime);
    const from = formatTime(addHours(arrivalTime, 1.5));
    const fromHour = arrHour + 1.5;

    let instruction: string;
    if (fromHour >= 21) {
      instruction = `DZIEŃ ${dayNumber} — PRZYLOT o ${arrivalTime} (CZAS LOKALNY). Dojazd do centrum ~1,5h → dostępny od ~${from}. TYLKO: zameldowanie, kolacja w pobliżu. Maksymalnie 2 aktywności. BEZ zwiedzania.`;
    } else if (fromHour >= 15) {
      instruction = `DZIEŃ ${dayNumber} — PRZYLOT o ${arrivalTime}. Dojazd → centrum od ~${from}. Zaplanuj popołudnie i wieczór: zameldowanie, spacer, kolacja. 4-5 aktywności od ${from}.`;
    } else if (fromHour >= 11) {
      instruction = `DZIEŃ ${dayNumber} — PRZYLOT o ${arrivalTime}. Dojazd → centrum od ~${from}. Pełne popołudnie: zameldowanie, pierwsze atrakcje, kolacja. 5-6 aktywności od ${from}.`;
    } else {
      instruction = `DZIEŃ ${dayNumber} — PRZYLOT o ${arrivalTime}. Dojazd → centrum od ~${from}. Prawie pełny dzień — szybkie zameldowanie, intensywne zwiedzanie. 6-7 aktywności od ${from}.`;
    }
    return { dayNumber, type: "arrival", availableFrom: from, availableTo: "23:00", instruction };
  }

  return {
    dayNumber,
    type: "arrival",
    availableFrom: "14:30",
    availableTo: "23:00",
    instruction: `DZIEŃ ${dayNumber} — DZIEŃ PRZYBYCIA (godzina lotu nieznana). Przyjmij że podróżnik dociera do centrum ok. 14:30 (typowy lot budżetowy z Polski + dojazd ~1,5h). Zaplanuj: zameldowanie, spacer orientacyjny, kolacja. 4-5 aktywności od 14:30. BEZ wczesnych atrakcji.`,
  };
}

function calcDepartureDay(dayNumber: number, returnTime?: string): DaySchedule {
  if (returnTime) {
    const retHour = parseHour(returnTime);
    const checkoutHour = Math.max(6, retHour - 3);
    const checkoutTime = formatTime(String(checkoutHour).padStart(2, "0") + ":00");

    let instruction: string;
    if (retHour <= 9) {
      instruction = `DZIEŃ ${dayNumber} — POWRÓT. LOT O ${returnTime} — bardzo wczesny wylot! Wyjście z hotelu ok. ${checkoutTime}. Zaplanuj TYLKO: szybkie śniadanie na wynos, wymeldowanie. Maksymalnie 1-2 aktywności o świcie. BEZ zwiedzania.`;
    } else if (retHour <= 14) {
      instruction = `DZIEŃ ${dayNumber} — POWRÓT. LOT O ${returnTime} — wymeldowanie do ${checkoutTime}. Zaplanuj TYLKO poranek: śniadanie, krótki spacer w pobliżu hotelu, wymeldowanie. Maksymalnie 2-3 aktywności. Bez odległych miejsc.`;
    } else {
      instruction = `DZIEŃ ${dayNumber} — POWRÓT. LOT O ${returnTime} — wymeldowanie do ${checkoutTime}. Zaplanuj spokojne przedpołudnie: śniadanie, kilka bliskich atrakcji, wymeldowanie, bagażownia w hotelu. Do 4 aktywności. Bez odległych miejsc ani rezerwacji.`;
    }
    return { dayNumber, type: "departure", availableFrom: "07:00", availableTo: checkoutTime, instruction };
  }

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
  duration: number,
  flightDetails?: FlightDetails | null
): TripSchedule {
  const arrivalTime = flightDetails?.arrivalTime ?? null;
  const arrivalDate = flightDetails?.arrivalDate ?? null;
  const returnDate = flightDetails?.returnDate ?? null;

  const days: DaySchedule[] = [];

  if (duration === 1) {
    const fromTime = arrivalTime ? formatTime(addHours(arrivalTime, 1.5)) : "14:00";
    const toTime = flightDetails?.returnTime
      ? formatTime(String(Math.max(6, parseHour(flightDetails.returnTime) - 3)).padStart(2, "0") + ":00")
      : "11:00";
    days.push({
      dayNumber: 1,
      type: "arrival_and_departure",
      availableFrom: fromTime,
      availableTo: toTime,
      instruction: flightDetails
        ? `DZIEŃ 1 — PRZYLOT O ${arrivalTime}, POWRÓT O ${flightDetails.returnTime}. Czas w mieście: ${fromTime}–${toTime}. Zaplanuj 3-4 aktywności blisko centrum.`
        : `DZIEŃ 1 — PRZYLOT I POWRÓT TEGO SAMEGO DNIA. Zaplanuj 3-4 aktywności blisko centrum. Lekki plan.`,
    });
    return { days, arrivalTime: arrivalTime ?? "14:00", arrivalDate, returnDate, usefulDays: 1 };
  }

  days.push(calcArrivalDay(1, arrivalTime ?? undefined));

  for (let d = 2; d < duration; d++) {
    days.push(fullDay(d));
  }

  days.push(calcDepartureDay(duration, flightDetails?.returnTime ?? undefined));

  const usefulDays = days.filter((d) => {
    const from = parseHour(d.availableFrom);
    const to = parseHour(d.availableTo);
    return (to - from) >= 4;
  }).length;

  return { days, arrivalTime: arrivalTime ?? "14:00", arrivalDate, returnDate, usefulDays };
}

export function formatScheduleForPrompt(schedule: TripSchedule): string {
  return schedule.days.map((d) => d.instruction).join("\n\n");
}
