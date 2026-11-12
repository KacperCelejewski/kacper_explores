// Co da się uczciwie powiedzieć o okazji bez wymyślania liczb: ile godzin realnie spędzisz na miejscu
// i na co uważać przy rezerwacji. Kwot nie podajemy, bo żadnej z nich nie znamy.
interface StayInput {
  departure_at: string;
  return_at: string;
  duration_to?: number | null;
}

// Od lądowania do wylotu powrotnego. Oba czasy mają offset, więc strefy nie psują rachunku.
export function hoursInCity(deal: StayInput): number | null {
  if (typeof deal.duration_to !== "number" || !(deal.duration_to > 0)) return null;
  const departure = Date.parse(deal.departure_at);
  const back = Date.parse(deal.return_at);
  if (Number.isNaN(departure) || Number.isNaN(back)) return null;
  const landing = departure + deal.duration_to * 60_000;
  if (back <= landing) return null;
  return Math.round((back - landing) / 3_600_000);
}

// Ryanair (FR) i Wizz Air (W6, W4): w cenie jest tylko mała torba pod siedzeniem
const LOW_COST_BAG_RULES = new Set(["FR", "W6", "W4"]);

export function dealNotes(deal: { airline: string }): string[] {
  if (LOW_COST_BAG_RULES.has(deal.airline)) {
    return ["Bagaż: w cenie tylko mała torba pod siedzeniem, większy bagaż podręczny jest płatny. Sprawdź przy rezerwacji."];
  }
  return [];
}
