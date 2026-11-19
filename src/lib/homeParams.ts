import type { Companion, GroupComposition } from "@/types";
import { groupFromCompanion } from "@/lib/group";

// Parametry z linków na stronie głównej. Tylko dokładne wartości z listy dozwolonych,
// cokolwiek innego jest ignorowane, żeby nic z adresu nie trafiało do stanu ani do zdarzeń.
export type HomeSrc = "home-ekipa" | "home-solo" | "ig-ekipa" | "ig-solo" | "blog-ekipa";

export interface HomeParams {
  companion: "friends" | null;
  src: HomeSrc | null;
}

export const SRC_VALUES: readonly HomeSrc[] = ["home-ekipa", "home-solo", "ig-ekipa", "ig-solo", "blog-ekipa"];

export function parseHomeParams(params: { get(name: string): string | null }): HomeParams {
  const companion = params.get("companion") === "friends" ? "friends" : null;
  const rawSrc = params.get("src");
  const src = SRC_VALUES.find((s) => s === rawSrc) ?? null;
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

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;
const UTM_VALUE = /^[A-Za-z0-9_.\-]{1,100}$/;

// Quiz czyści adres po wejściu z linku (companion, src), ale UTM musi w nim zostać:
// GA4 odczytuje kampanię z adresu strony, a skrypt GA bywa gotowy dopiero po tym czyszczeniu.
// Zostają tylko cztery klucze utm_* i bezpieczne wartości.
export function keepUtmQuery(params: { get(name: string): string | null }): string {
  const out = new URLSearchParams();
  for (const key of UTM_KEYS) {
    const value = params.get(key);
    if (value && UTM_VALUE.test(value)) out.set(key, value);
  }
  const q = out.toString();
  return q ? `?${q}` : "";
}
