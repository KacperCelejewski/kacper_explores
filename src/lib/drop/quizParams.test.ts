import { describe, it, expect } from "vitest";
import { parseDropParams } from "./quizParams";

const ok = "city=Mediolan&from=KRK&depart=2026-11-13&return=2026-11-15&src=drop";
const parse = (q: string) => parseDropParams(new URLSearchParams(q));

describe("parseDropParams", () => {
  it("zamienia link zrzutu na odpowiedzi quizu", () => {
    expect(parse(ok)).toEqual({ preferredCity: "Mediolan", airports: ["KRK"], month: 11, duration: 3 });
  });

  it("ignoruje UTM-y i dekoduje polskie znaki", () => {
    const r = parse("city=Wiede%C5%84&from=WRO&depart=2026-12-30&return=2027-01-03&src=drop&utm_source=drop");
    expect(r).toEqual({ preferredCity: "Wiedeń", airports: ["WRO"], month: 12, duration: 5 });
  });

  it("zwraca null bez src=drop", () => {
    expect(parse(ok.replace("&src=drop", ""))).toBeNull();
    expect(parse(ok.replace("src=drop", "src=other"))).toBeNull();
  });

  it("zwraca null dla brakującego miasta", () => {
    expect(parse(ok.replace("city=Mediolan&", ""))).toBeNull();
  });

  it("zwraca null dla nieznanego lotniska", () => {
    expect(parse(ok.replace("from=KRK", "from=ZZZ"))).toBeNull();
    expect(parse(ok.replace("from=KRK&", ""))).toBeNull();
  });

  it("zwraca null dla złej daty", () => {
    expect(parse(ok.replace("2026-11-13", "13-11-2026"))).toBeNull();
    expect(parse(ok.replace("2026-11-15", "2026-02-30"))).toBeNull();
    expect(parse(ok.replace("&return=2026-11-15", ""))).toBeNull();
  });

  it("zwraca null gdy powrót jest przed wylotem", () => {
    expect(parse(ok.replace("return=2026-11-15", "return=2026-11-10"))).toBeNull();
  });

  it("zwraca null gdy długość poza 2-21 dni", () => {
    expect(parse(ok.replace("return=2026-11-15", "return=2026-11-13"))).toBeNull();
    expect(parse(ok.replace("return=2026-11-15", "return=2026-12-05"))).toBeNull();
  });

  it("przyjmuje granice 2 i 21 dni", () => {
    expect(parse(ok.replace("return=2026-11-15", "return=2026-11-14"))?.duration).toBe(2);
    expect(parse(ok.replace("return=2026-11-15", "return=2026-12-03"))?.duration).toBe(21);
  });
});
