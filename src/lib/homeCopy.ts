import { FEATURES, type FeatureKey } from "./features";
import { QUIZ_QUESTION_COUNT } from "./quizSteps";

// Teksty strony głównej w jednym miejscu, żeby dało się je przetestować pod kątem głosu marki
// i obietnic funkcji, których jeszcze nie ma.
export const HOME = {
  // Jedno zdanie na pierwszym ekranie, to samo co w bio konta na Instagramie (pytanie, bez wykrzyknika)
  h1: "Brakuje Ci czasu na organizację wyjazdu?",
  // Dawny H1: słowa kluczowe zostają w nagłówku sekcji tuż pod pierwszym ekranem
  lead: "Wyjazd ze znajomymi: dokąd, za ile i jaki plan.",
  ctaTeam: "Jedziemy ekipą →",
  ctaTeamHref: "/quiz?companion=friends&src=home-ekipa",
  ctaSolo: "Solo albo we dwoje →",
  ctaSoloHref: "/quiz?src=home-solo",
  micro: `${QUIZ_QUESTION_COUNT} pytań · darmowe konto · bez karty`,
  quickLink: "Wiem już dokąd: 4 kroki",
  quickHref: "/quick",
  dropLink: "Co czwartek 3 okazje: zapisz się",
  dropHref: "#zrzut",
  guideLink: "Jak ustalić budżet i kierunek, gdy jedzie ekipa",
  guideHref: "/blog/wyjazd-ze-znajomymi-jak-ustalic-budzet-i-kierunek",
  finalTitle: "W piątek rano możesz już być w drodze.",
} as const;

const SUBTITLE_BASE = "Powiedz, ilu Was jedzie. Dostaniesz kierunki w Waszym budżecie, koszt na osobę i razem oraz plan do wysłania ekipie.";
const SUBTITLE_INVITES = "Ustalacie to w jednym miejscu, a na grupie wklejacie tylko link.";

export function homeSubtitle(features: Record<FeatureKey, boolean> = FEATURES): string {
  return features.invites ? SUBTITLE_INVITES : SUBTITLE_BASE;
}

// Wzorce zakazane w tekstach interfejsu: wykrzykniki, emoji, formy rodzajowe, język korporacyjny
export const FORBIDDEN_COPY: RegExp[] = [
  /!/,
  /\p{Extended_Pictographic}/u,
  /\p{L}*(łem|łeś|łam|łaś)(?!\p{L})/iu,
  /platform/i,
  /innowacyjn/i,
];

// Metadane strony: ten sam sens w title, opisie, OG, Twitter, manifeście i schema.org
export const META = {
  title: "Wyjazd ze znajomymi: dokąd, za ile i jaki plan",
  titleDefault: "Włóczykij: wyjazd ze znajomymi, dokąd, za ile i jaki plan",
  description:
    `Odpowiedz na ${QUIZ_QUESTION_COUNT} pytań: dostaniesz kierunki w Waszym budżecie, plan godzina po godzinie i ceny lotów z 7 polskich lotnisk w okazjach. 2 plany za darmo co miesiąc.`,
  shortDescription: `Odpowiedz na ${QUIZ_QUESTION_COUNT} pytań i dostań kierunki w Waszym budżecie oraz plan godzina po godzinie. Ceny, knajpy i triki.`,
  appDescription:
    "Wyjazd ze znajomymi: kierunki w Waszym budżecie, plan godzina po godzinie z cenami, knajpami i trikami oraz okazje na weekend z polskich lotnisk.",
  manifestDescription: "Wyjazd ze znajomymi: kierunki w budżecie, plan godzina po godzinie i okazje na weekend z Polski",
  ogAlt: "Włóczykij: wyjazd ze znajomymi, dokąd, za ile i jaki plan",
} as const;
