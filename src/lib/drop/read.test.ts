import { describe, expect, it } from "vitest";
import { originFromSlug, pickLatestWeek, upcomingDeals } from "./read";

describe("originFromSlug", () => {
  it("accepts Polish airports in any case", () => {
    expect(originFromSlug("wro")).toBe("WRO");
    expect(originFromSlug("KTW")).toBe("KTW");
  });

  it("rejects hubs, unknown codes and junk", () => {
    expect(originFromSlug("ber")).toBeNull();
    expect(originFromSlug("xyz")).toBeNull();
    expect(originFromSlug("")).toBeNull();
    expect(originFromSlug("wro; drop table")).toBeNull();
  });
});

describe("pickLatestWeek", () => {
  it("keeps only rows of the newest week", () => {
    const rows = [
      { week: "2026-W45", id: 1 }, { week: "2026-W46", id: 2 }, { week: "2026-W46", id: 3 },
    ];
    expect(pickLatestWeek(rows).map((r) => r.id)).toEqual([2, 3]);
  });

  it("orders weeks across a year boundary", () => {
    const rows = [{ week: "2026-W52", id: 1 }, { week: "2027-W01", id: 2 }];
    expect(pickLatestWeek(rows).map((r) => r.id)).toEqual([2]);
  });

  it("returns an empty list for no rows", () => {
    expect(pickLatestWeek([])).toEqual([]);
  });
});

describe("upcomingDeals", () => {
  const deal = (departure_at: string) => ({ departure_at });
  const now = new Date("2026-11-14T10:00:00Z"); // sobota

  it("drops flights that already left", () => {
    const deals = [deal("2026-11-13T19:05:00+01:00"), deal("2026-11-14T18:00:00+01:00"), deal("2026-11-20T09:00:00+01:00")];
    expect(upcomingDeals(deals, now).map((d) => d.departure_at)).toEqual([
      "2026-11-14T18:00:00+01:00", "2026-11-20T09:00:00+01:00",
    ]);
  });

  it("drops rows with a date it cannot read", () => {
    expect(upcomingDeals([deal("nie data")], now)).toEqual([]);
  });
});
