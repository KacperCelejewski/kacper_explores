"use client";

import { generateICS } from "@/lib/ics";
import type { TripPlan } from "@/types";

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
