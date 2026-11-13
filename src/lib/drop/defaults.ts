import { POLISH_AIRPORTS } from "@/lib/airports";
import { DROP_MAX_PRICES } from "./signup";

const WIDEST = DROP_MAX_PRICES[DROP_MAX_PRICES.length - 1];

// Najniższy próg, w który mieści się najtańszy lot z lotniska; bez danych najwyższy,
// żeby pierwszy zrzut po potwierdzeniu nie pomijał nikogo.
export function pickDefaultMaxPrice(cheapest: number | null): (typeof DROP_MAX_PRICES)[number] {
  if (cheapest === null) return WIDEST;
  return DROP_MAX_PRICES.find((p) => cheapest <= p) ?? WIDEST;
}

// Kod z localStorage albo z adresu na polskie lotnisko; wszystko nieznane wraca do Wrocławia.
export function resolveOrigin(code: string | null | undefined): string {
  const upper = (code ?? "").trim().toUpperCase();
  return POLISH_AIRPORTS.some((a) => a.code === upper) ? upper : "WRO";
}
