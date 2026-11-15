import { FEATURES, type FeatureKey } from "./features";

// Teksty strony głównej w jednym miejscu, żeby dało się je przetestować pod kątem głosu marki
// i obietnic funkcji, których jeszcze nie ma.
export const HOME = {
  badge: "Dla ekipy i dla tych, co jadą sami",
  h1: "Wyjazd ze znajomymi: dokąd, za ile i jaki plan.",
  ctaTeam: "Jedziemy ekipą →",
  ctaTeamHref: "/quiz?companion=friends&src=home-ekipa",
  ctaSolo: "Solo albo we dwoje →",
  ctaSoloHref: "/quiz?src=home-solo",
  micro: "6 pytań · darmowe konto · bez karty",
  quickLink: "Wiem już dokąd: 4 kroki",
  quickHref: "/quick",
  dropLink: "Co czwartek 3 okazje: zapisz się",
  dropHref: "#zrzut",
  finalTitle: "W piątek rano możesz już być w drodze.",
} as const;

const SUBTITLE_BASE = "Powiedz, kto jedzie. Dostaniesz kierunki w Waszym budżecie i plan godzina po godzinie.";
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
    "Odpowiedz na 6 pytań: dostaniesz kierunki w Waszym budżecie, plan godzina po godzinie i ceny lotów z 7 polskich lotnisk w okazjach. 2 plany za darmo co miesiąc.",
  shortDescription: "Odpowiedz na 6 pytań i dostań kierunki w Waszym budżecie oraz plan godzina po godzinie. Ceny, knajpy i triki.",
  appDescription:
    "Wyjazd ze znajomymi: kierunki w Waszym budżecie, plan godzina po godzinie z cenami, knajpami i trikami oraz okazje na weekend z polskich lotnisk.",
  manifestDescription: "Wyjazd ze znajomymi: kierunki w budżecie, plan godzina po godzinie i okazje na weekend z Polski",
  ogAlt: "Włóczykij: wyjazd ze znajomymi, dokąd, za ile i jaki plan",
} as const;
