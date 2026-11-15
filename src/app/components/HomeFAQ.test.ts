import { describe, expect, it } from "vitest";
import { FAQS } from "./HomeFAQ";
import { FORBIDDEN_COPY } from "@/lib/homeCopy";
import { PRICES } from "@/lib/prices";

describe("FAQS", () => {
  it("odpowiada, co dostaje ekipa, tylko tym, co działa dziś", () => {
    const faq = FAQS.find((f) => f.q === "Jedziemy ekipą, co dostajemy?");
    expect(faq).toBeDefined();
    expect(faq!.a).toMatch(/kierunk/i);
    expect(faq!.a).toMatch(/na osobę/i);
    expect(faq!.a).toMatch(/razem/i);
    expect(faq!.a).toMatch(/godzina po godzinie/i);
    expect(faq!.a).toMatch(/link/i);
  });

  it("opisuje dzisiejszy model płatności z cenami z PRICES", () => {
    const faq = FAQS.find((f) => f.q === "Kto płaci?");
    expect(faq).toBeDefined();
    expect(faq!.a).toContain(PRICES.pack.label);
    expect(faq!.a).toMatch(/dwa plany w miesiącu/);
    expect(faq!.a).not.toMatch(/przepustk/i);
  });

  it("nowe pytania nie obiecują terminu, biletów, rozliczeń ani wyjazdu bez konta", () => {
    // starsze pytanie o quiz słusznie wspomina o terminie (miesiąc wyjazdu), więc sprawdzamy tylko nowe
    for (const { q, a } of FAQS.filter((f) => f.q === "Jedziemy ekipą, co dostajemy?" || f.q === "Kto płaci?")) {
      expect(`${q} ${a}`).not.toMatch(/termin|bilet|rozliczen|bez konta|zaproś/i);
    }
  });

  it("trzyma się reguł głosu marki", () => {
    for (const { q, a } of FAQS) {
      for (const re of FORBIDDEN_COPY) expect(`${q} ${a}`).not.toMatch(re);
    }
  });
});
