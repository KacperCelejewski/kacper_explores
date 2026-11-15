import type { BudgetLevel, Companion, GroupComposition } from "@/types";
import { groupLabel, groupSize, isValidGroup, scaleBudgetText, showGroupBudget } from "@/lib/group";
import { formatFlightPLN } from "@/lib/flights/card-price";

// Nazewnictwo ścieżki grupowej. Zasada: "znajomi" to kategoria w quizie i SEO (H1, karta wyboru),
// "ekipa" to konkretna grupa, która jedzie (żetony, nagłówki, przyciski). Nie piszemy "grupa" ani "użytkownicy".
// Teksty nie obiecują zaproszeń, głosowania, wspólnych lotów ani rozliczeń: ich flagi w features.ts są wyłączone.

export const CREW_COPY = {
  // Karta "Znajomi" w quizie: co ekipa dostaje, bez słów o rozliczeniach
  companionFriendsDesc: "Kierunki w Waszym budżecie, koszt na osobę i razem",
  // Krok "kto jedzie": podtytuł zależny od wyboru, potem pole z liczbą osób
  quizHintDefault: "Dobierzemy atrakcje, restauracje i wskazówki do Waszego wyjazdu.",
  quizHintFriends:
    "Powiedz, ilu Was jedzie: dostaniecie kierunki w budżecie, koszt na osobę i razem oraz plan do wysłania ekipie.",
  quizHintFamily: "Podaj skład rodziny: policzymy loty i koszt na osobę oraz dla wszystkich razem.",
  sizeTitle: "Ilu Was jedzie?",
  sizeHint: "Dzięki temu policzymy loty i koszt na osobę oraz dla całej ekipy.",
  sizeHintFamily: "Dzięki temu policzymy loty i koszt na osobę oraz dla całej rodziny.",
  // Kierunki
  destinationsPerPerson: "Ceny podajemy na osobę, a tam gdzie się da, także dla całej ekipy.",
  // Wysyłanie planu
  sendTitle: "Wyślij plan ekipie",
  sendTitleOther: "Wyślij plan",
  sendHelp: "Link otwiera plan bez konta, na telefonie i na komputerze.",
  sendButton: "Skopiuj link do planu",
  sendButtonShare: "Wyślij link do planu",
  sendConfirmTitle: "Najpierw plan musi być publiczny",
  sendConfirmBody:
    "Każdy, kto dostanie link, otworzy plan bez konta. Plan pojawi się też w galerii Odkryj, bo to jedna wspólna widoczność. Wyłączysz ją w dowolnej chwili.",
  sendConfirmYes: "Włącz i skopiuj link",
  sendConfirmNo: "Nie teraz",
  sendCopied: "Link skopiowany. Wklej go na czacie ekipy.",
  sendFailed: "Nie udało się włączyć udostępniania. Spróbuj jeszcze raz — zwykle działa za drugim.",
  sendCopyFailed: "Nie udało się skopiować. Zaznacz link poniżej i skopiuj go ręcznie.",
  // Widok dla odbiorcy linku
  shareCrewTitle: "Plan dla ekipy",
  shareStartOwn: "Jedziecie ekipą? Ułóżcie własny plan",
  perPerson: "na osobę",
  total: "razem",
} as const;

export function quizCompanionHint(companion: Companion | null | undefined): string {
  if (companion === "friends") return CREW_COPY.quizHintFriends;
  if (companion === "family") return CREW_COPY.quizHintFamily;
  return CREW_COPY.quizHintDefault;
}

export function isCrewTrip(companion: Companion | null | undefined, group?: GroupComposition | null): boolean {
  return (companion === "friends" || companion === "family") && group != null;
}

// Etykieta składu do żetonu podsumowania w quizie i na ekranach po nim.
// Bez składu wraca zwykła etykieta towarzystwa.
export function companionTrailLabel(
  companion: Companion,
  group: GroupComposition | undefined,
  plain: string,
): string {
  if (!isCrewTrip(companion, group) || !group) return plain;
  const who = companion === "friends" ? "Ekipa" : "Rodzina";
  return `${who} · ${groupLabel(group)}`;
}

// Nagłówek i opis składu do ekranu kierunków i planu; null dla solo i pary.
export function crewSummary(
  companion: Companion | null | undefined,
  group?: GroupComposition | null,
): { title: string; detail: string } | null {
  if (!isCrewTrip(companion, group) || !group) return null;
  return {
    title: companion === "friends" ? "Wasza ekipa" : "Wasza rodzina",
    detail: groupLabel(group),
  };
}

const BUDGET_PER_PERSON: Record<BudgetLevel, string> = { low: "do 1 500 zł", medium: "1 500–3 000 zł" };

// "do 1 500 zł na osobę, razem do 6 000 zł"; null, gdy nie ma czego mnożyć (solo, para, jedna osoba).
export function crewBudgetNote(
  budget: BudgetLevel | null | undefined,
  companion: Companion | null | undefined,
  group?: GroupComposition | null,
): string | null {
  if (!budget || !showGroupBudget(companion ?? null, group ?? undefined) || !group) return null;
  const perPerson = BUDGET_PER_PERSON[budget];
  const together = scaleBudgetText(perPerson, groupSize(group));
  if (!together) return null;
  return `${perPerson} ${CREW_COPY.perPerson}, ${CREW_COPY.total} ${together}`;
}

// Cena lotu za osobę razem dla całej ekipy ("ok." bo wycena jest zaokrąglona); null dla jednej osoby.
export function flightTotalNote(
  pricePerPerson: number,
  companion: Companion | null | undefined,
  group?: GroupComposition | null,
): string | null {
  if (!Number.isFinite(pricePerPerson) || pricePerPerson < 1) return null;
  if (!showGroupBudget(companion ?? null, group ?? undefined) || !group) return null;
  const seats = groupSize(group);
  return `${CREW_COPY.total} ok. ${formatFlightPLN(pricePerPerson * seats)} (${groupLabel(group)})`;
}

export function sendPlanTitle(companion: Companion | null | undefined, group?: GroupComposition | null): string {
  return isCrewTrip(companion, group) ? CREW_COPY.sendTitle : CREW_COPY.sendTitleOther;
}

// Publiczny adres planu do wklejenia na czacie
export function shareUrl(origin: string, tripId: string): string {
  return `${origin.replace(/\/$/, "")}/share/${encodeURIComponent(tripId)}`;
}

export interface SharedCrew {
  companion: "friends";
  group: GroupComposition;
}

// Z zapisanych odpowiedzi quizu wyciąga tylko liczbę osób ekipy znajomych do publicznego widoku planu.
// Nic poza tym nie opuszcza serwera: ani budżet, ani lotniska, ani preferencje. Rodziny celowo pomijamy,
// żeby wiek dzieci nie trafiał do publicznego adresu.
export function sharedCrewFromQuiz(quizAnswers: unknown): SharedCrew | null {
  if (typeof quizAnswers !== "object" || quizAnswers === null) return null;
  const { companion, group } = quizAnswers as { companion?: unknown; group?: unknown };
  if (companion !== "friends") return null;
  if (!isValidGroup(group)) return null;
  return { companion, group: { adults: group.adults, childrenAges: [] } };
}

// Koszt całkowity dla całej ekipy z szacunku na osobę; null, gdy plan nie jest grupowy.
export function crewTotalBudget(perPersonEstimate: string, crew: SharedCrew | null): string | null {
  if (!crew || !perPersonEstimate) return null;
  if (!showGroupBudget(crew.companion, crew.group)) return null;
  return scaleBudgetText(perPersonEstimate, groupSize(crew.group));
}
