import type { Companion, GroupComposition } from "@/types";
import { groupFromCompanion } from "@/lib/group";

// Parametry z linków na stronie głównej. Tylko dokładne wartości z listy dozwolonych,
// cokolwiek innego jest ignorowane, żeby nic z adresu nie trafiało do stanu ani do zdarzeń.
export type HomeSrc = "home-ekipa" | "home-solo";

export interface HomeParams {
  companion: "friends" | null;
  src: HomeSrc | null;
}

const SRC: readonly HomeSrc[] = ["home-ekipa", "home-solo"];

export function parseHomeParams(params: { get(name: string): string | null }): HomeParams {
  const companion = params.get("companion") === "friends" ? "friends" : null;
  const rawSrc = params.get("src");
  const src = SRC.find((s) => s === rawSrc) ?? null;
  return { companion, src };
}

// GA4 przyjmuje w nazwach zdarzeń tylko litery, cyfry i podkreślniki
export function srcEventName(src: HomeSrc): string {
  return `from_${src.replace(/-/g, "_")}`;
}

// Odpowiedzi quizu po wejściu z „Jedziemy ekipą”. Liczba osób ustawiona wcześniej przez Znajomych zostaje,
// żeby odświeżenie strony albo powrót nie cofały jej do domyślnej.
export function homeFriendsAnswers(current: { companion: Companion | null; group: GroupComposition | undefined }): {
  companion: "friends";
  group: GroupComposition;
} {
  const group = current.companion === "friends" && current.group ? current.group : groupFromCompanion("friends");
  return { companion: "friends", group };
}
