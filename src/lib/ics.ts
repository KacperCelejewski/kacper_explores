import type { TripPlan } from "@/types";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toICSDate(date: Date): string {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}

function escapeICS(str: string): string {
  return str.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
}

export function generateICS(plan: TripPlan, startDate?: string): string {
  const base = startDate ? new Date(startDate) : new Date();
  base.setHours(0, 0, 0, 0);

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kacper Explores//Travel Plan//PL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  plan.days.forEach((day, i) => {
    const dayDate = new Date(base);
    dayDate.setDate(base.getDate() + i);
    const nextDate = new Date(dayDate);
    nextDate.setDate(dayDate.getDate() + 1);

    const uid = `kacper-explores-${plan.city.toLowerCase().replace(/\s+/g, "-")}-day${day.day}-${dayDate.getTime()}`;
    const summary = `${plan.city} – Dzień ${day.day}: ${day.theme}`;
    const desc = day.activities
      .map((a) => `${a.time} ${a.emoji} ${a.title} (${a.cost})`)
      .join("\\n");

    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTART;VALUE=DATE:${toICSDate(dayDate)}`,
      `DTEND;VALUE=DATE:${toICSDate(nextDate)}`,
      `SUMMARY:${escapeICS(summary)}`,
      `DESCRIPTION:${escapeICS(desc)}`,
      `LOCATION:${escapeICS(plan.city + ", " + plan.country)}`,
      "END:VEVENT",
    );
  });

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadICS(plan: TripPlan, startDate?: string): void {
  const content = generateICS(plan, startDate);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${plan.city.toLowerCase().replace(/\s+/g, "-")}-plan.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
