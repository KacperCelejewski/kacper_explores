import { FORBIDDEN_COPY } from "./homeCopy";

// Teksty stanów brzegowych (404, 500, offline, błędy) w jednym miejscu, żeby test pilnował głosu marki:
// ciepło, konkretnie, bez przepraszania, bez wykrzykników i bez języka urzędu (BRAND.md).
export const EDGE_COPY = {
  notFound: {
    title: "Tu nic nie ma",
    body: "Ten adres nie prowadzi do żadnej strony. Pewnie literówka albo stary link. Wróć na szlak.",
    primary: "Zobacz okazje na weekend →",
    secondary: "Albo dobierz wyjazd quizem",
  },
  error: {
    title: "Coś poszło nie tak",
    body: "Spróbuj jeszcze raz, zwykle działa za drugim. Jeśli dalej nie, wróć na początek.",
    retry: "Spróbuj jeszcze raz",
    home: "Na stronę główną",
    pageTitle: "Coś poszło nie tak | Włóczykij",
  },
  offline: {
    title: "Zniknął zasięg",
    body: "Bez internetu nie pokażemy tej strony. Gdy tylko wróci sieć, odśwież.",
    retry: "Odśwież →",
  },
  chatFailed: "Coś poszło nie tak. Napisz jeszcze raz, zwykle działa za drugim.",
  generateFailed: "Plan się nie ułożył. Spróbuj jeszcze raz, zwykle działa za drugim.",
  accountDeleteFailed: "Konto się nie usunęło. Spróbuj jeszcze raz, a jeśli dalej nie działa, napisz na hej@wloczykij.me.",
  portalFailed: "Nie udało się otworzyć panelu płatności. Spróbuj jeszcze raz za chwilę.",
  loginGoogleFailed: "Logowanie przez Google nie wyszło. Spróbuj jeszcze raz albo użyj linku z e-maila.",
  loginSentHint: "Nie widzisz maila? Zajrzyj do spamu albo wyślij link jeszcze raz.",
  loginResend: "Wyślij jeszcze raz",
} as const;

export function edgeCopyStrings(): string[] {
  const out: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === "string") out.push(v);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(EDGE_COPY);
  return out;
}

// Wspólne wzorce zakazane plus dwa, które BRAND.md wymienia osobno w stanach błędów.
export const EDGE_FORBIDDEN: RegExp[] = [...FORBIDDEN_COPY, /niestety/i, /przepraszam/i, /wystąpił/i];

// Komunikat z naszego serwera (po polsku, już w głosie marki) pokazujemy użytkownikowi, a każdy inny błąd
// (sieć, "HTTP 500", "Failed to fetch") zastępujemy ciepłym tekstem zamiast surowego komunikatu.
export class ServerMessage extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServerMessage";
  }
}

export function friendlyError(err: unknown, fallback: string): string {
  return err instanceof ServerMessage && err.message.trim() ? err.message : fallback;
}
