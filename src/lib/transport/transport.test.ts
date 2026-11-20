import { describe, expect, it } from "vitest";
import type { QuizAnswers } from "@/types";
import {
  estimateTravel, groundModes, haversineKm, maxOneWayHours, originCityName, originCoords, planTransport,
  reachablePlaces, routeSearchUrl, travelBudgetText, travelCopy, travelFor, usesFlights,
} from "./index";
import { GROUND_PLACES, ORIGIN_COORDS, findGroundPlace } from "./places";

const base: Pick<QuizAnswers, "transport" | "airports" | "duration" | "styles"> = {
  transport: ["auto"], airports: ["WRO"], duration: 3, styles: [],
};

describe("wybór środka transportu", () => {
  it("brak wyboru znaczy samolot, jak przed dodaniem pytania", () => {
    expect(usesFlights({})).toBe(true);
    expect(usesFlights({ transport: [] })).toBe(true);
    expect(groundModes({})).toEqual([]);
    expect(planTransport({})).toBe("samolot");
  });
  it("lot tylko, gdy wybrano samolot", () => {
    expect(usesFlights({ transport: ["auto"] })).toBe(false);
    expect(usesFlights({ transport: ["rower", "pociag_bus"] })).toBe(false);
    expect(usesFlights({ transport: ["auto", "samolot"] })).toBe(true);
  });
  it("środki lądowe w stałej kolejności, plan według samolotu albo pierwszego lądowego", () => {
    expect(groundModes({ transport: ["rower", "auto"] })).toEqual(["auto", "rower"]);
    expect(planTransport({ transport: ["rower", "auto"] })).toBe("auto");
    expect(planTransport({ transport: ["rower", "samolot"] })).toBe("samolot");
  });
});

describe("dystans i czas", () => {
  it("liczy odległość w linii prostej (Wrocław–Praga ok. 215 km)", () => {
    const d = haversineKm(ORIGIN_COORDS.WRO, findGroundPlace("Praga")!.coords);
    expect(d).toBeGreaterThan(205);
    expect(d).toBeLessThan(230);
  });
  it("auto Wrocław–Praga: niecałe 300 km i ok. 4 h, koszt z założeń", () => {
    const e = estimateTravel("auto", ORIGIN_COORDS.WRO, findGroundPlace("Praga")!.coords);
    expect(e.distanceKm).toBeGreaterThanOrEqual(270);
    expect(e.distanceKm).toBeLessThanOrEqual(310);
    expect(e.hours).toBeGreaterThanOrEqual(3.5);
    expect(e.hours).toBeLessThanOrEqual(4.5);
    expect(e.costFrom).toBeLessThan(e.costTo);
    expect(e.costFrom % 10).toBe(0);
  });
  it("rower liczy dni jazdy i nie ma kosztu przejazdu", () => {
    const e = estimateTravel("rower", ORIGIN_COORDS.WRO, findGroundPlace("Kłodzko")!.coords);
    expect(e.days).toBeGreaterThanOrEqual(1);
    expect(e.costFrom).toBe(0);
    expect(e.costTo).toBe(0);
  });
  it("weekend: ok. 10 h w jedną stronę dla auta i busa, dłuższy wyjazd daje większy zasięg", () => {
    expect(maxOneWayHours("auto", 2)).toBe(10);
    expect(maxOneWayHours("pociag_bus", 3)).toBe(10);
    expect(maxOneWayHours("auto", 7)).toBeGreaterThan(10);
    expect(maxOneWayHours("auto", 14)).toBeGreaterThan(maxOneWayHours("auto", 7));
    expect(maxOneWayHours("rower", 2)).toBeLessThan(maxOneWayHours("auto", 2));
  });
});

describe("kierunki w zasięgu wybranego środka", () => {
  it("auto z Wrocławia na weekend: Praga tak, Dubrownik nie", () => {
    const cities = reachablePlaces(base, 200).map((c) => c.place.city);
    expect(cities).toContain("Praga");
    expect(cities).not.toContain("Dubrownik");
    expect(cities).not.toContain("Wrocław");
  });
  it("ten sam cel dostaje dojazd tylko tymi środkami, w których mieści się w zasięgu", () => {
    const praga = reachablePlaces({ ...base, transport: ["auto", "rower"] }, 200).find((c) => c.place.city === "Praga");
    expect(praga?.travel.map((t) => t.mode)).toEqual(["auto"]);
  });
  it("rower: tylko miejsca w odległości dnia jazdy, bez dalekich miast", () => {
    const list = reachablePlaces({ ...base, transport: ["rower"] }, 200);
    expect(list.length).toBeGreaterThan(0);
    for (const c of list) expect(c.travel[0].hours).toBeLessThanOrEqual(maxOneWayHours("rower", 3));
    expect(list.map((c) => c.place.city)).not.toContain("Praga");
    expect(list.map((c) => c.place.city)).toContain("Kłodzko");
  });
  it("dłuższy wyjazd poszerza zasięg", () => {
    const short = reachablePlaces({ ...base, duration: 2 }, 200).length;
    const long = reachablePlaces({ ...base, duration: 10 }, 200).length;
    expect(long).toBeGreaterThan(short);
    expect(reachablePlaces({ ...base, duration: 10 }, 200).map((c) => c.place.city)).toContain("Split");
  });
  it("pierwsze miejsca pasują do zainteresowań", () => {
    const [first] = reachablePlaces({ ...base, styles: ["nature"] }, 5);
    expect(first.place.tags).toContain("nature");
  });
  it("nie zwraca miasta startu ani miejsc tuż obok", () => {
    for (const airports of [["KRK"], ["GDN"], ["WAW"], ["POZ"], ["KTW"]]) {
      const city = originCityName(airports)!;
      const names = reachablePlaces({ ...base, airports, transport: ["auto"] }, 200).map((c) => c.place.city);
      expect(names).not.toContain(city);
      expect(names.length).toBeGreaterThanOrEqual(5);
    }
  });
  it("sam samolot albo nieznany start nie daje listy lądowej", () => {
    expect(reachablePlaces({ ...base, transport: ["samolot"] })).toEqual([]);
    expect(reachablePlaces({ ...base, transport: undefined })).toEqual([]);
    expect(reachablePlaces({ ...base, airports: ["BER"] })).toEqual([]);
  });
  it("travelFor: tylko znane miasta w zasięgu (dla poleceń modelu spoza listy)", () => {
    expect(travelFor({ ...base, transport: ["auto", "pociag_bus"] }, "Prague").map((t) => t.mode)).toEqual(["auto", "pociag_bus"]);
    expect(travelFor(base, "Lizbona")).toEqual([]);
    expect(travelFor(base, "Miasto którego nie ma")).toEqual([]);
    expect(travelFor({ ...base, transport: ["samolot"] }, "Praga")).toEqual([]);
  });
});

describe("dane miejsc", () => {
  it("współrzędne są w Europie i nazwy się nie powtarzają", () => {
    const names = new Set<string>();
    for (const p of GROUND_PLACES) {
      expect(p.coords[0]).toBeGreaterThan(40);
      expect(p.coords[0]).toBeLessThan(62);
      expect(p.coords[1]).toBeGreaterThan(8);
      expect(p.coords[1]).toBeLessThan(30);
      expect(names.has(p.city)).toBe(false);
      names.add(p.city);
      expect(p.description).not.toMatch(/!/);
    }
  });
  it("miasto startu z kodu lotniska", () => {
    expect(originCityName(["KTW"])).toBe("Katowice");
    expect(originCoords(["XXX", "KRK"])).toEqual(ORIGIN_COORDS.KRK);
    expect(originCoords(["BER"])).toBeNull();
  });
});

describe("opisy dojazdu i linki", () => {
  const auto = estimateTravel("auto", ORIGIN_COORDS.WRO, findGroundPlace("Praga")!.coords);
  it("auto: koszt za samochód, na osobę przy grupie dzielonej na auta po 4 osoby", () => {
    expect(travelCopy(auto, 1).perPerson).toBeNull();
    expect(travelCopy(auto, 1).cost).toMatch(/za auto w obie strony/);
    expect(travelCopy(auto, 4).perPerson).toMatch(/na osobę/);
    expect(travelCopy(auto, 5).perPerson).toBeTruthy();
  });
  it("rower i bilety: bez obiecywania ceny biletu", () => {
    const bike = estimateTravel("rower", ORIGIN_COORDS.WRO, findGroundPlace("Kłodzko")!.coords);
    expect(travelCopy(bike).cost).toMatch(/bez opłat/);
    const bus = estimateTravel("pociag_bus", ORIGIN_COORDS.WRO, findGroundPlace("Praga")!.coords);
    expect(travelCopy(bus, 2).cost).toMatch(/^bilety ok\./);
    expect(travelBudgetText(bus, "pociag_bus")).toMatch(/szacunek/);
    expect(travelBudgetText(null, "auto")).toMatch(/sprawdź/);
  });
  it("link do trasy to zwykły link Map Google bez partnera i znacznika", () => {
    const url = new URL(routeSearchUrl("auto", "Wrocław", "Praga"));
    expect(url.hostname).toBe("www.google.com");
    expect(url.searchParams.get("travelmode")).toBe("driving");
    expect(url.searchParams.get("origin")).toBe("Wrocław");
    expect(routeSearchUrl("pociag_bus", "A", "B")).toContain("travelmode=transit");
    expect(routeSearchUrl("rower", "A", "B")).toContain("travelmode=bicycling");
    for (const mode of ["auto", "pociag_bus", "rower"] as const) {
      expect(routeSearchUrl(mode, "Wrocław", "Praga")).not.toMatch(/marker|trs=|aviasales|travelpayouts|utm_/i);
    }
  });
});
