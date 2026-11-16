import { FEATURES, type FeatureKey } from "./features";

export const HOME_ANIMATION = { cycle: 16, loops: 3, dim: 10, hold: 13.5, fade: 15, responseLag: 0.45, arrival: 0.25, typing: 0.6, reactionAt: 9.2 } as const;
export const HOME_ANIMATION_ALT = "Przykład: czworo znajomych pyta na czacie, dokąd lecą, ile to kosztuje i co będą robić; Włóczykij odpowiada kierunkiem, szacunkiem kosztu na osobę i planem na 3 dni.";

export function homeAnimationPairs(features: Record<FeatureKey, boolean> = FEATURES) {
  const pairs = [
    { key: "destination", name: "Ania", question: "gdzie w ogóle lecimy?", answer: "Barcelona" },
    ...(features.datePoll ? [{ key: "date", name: "Ania", question: "to kiedy lecimy??", answer: "pt–nd" }] : []),
    ...(features.groupFlights ? [{ key: "flight", name: "Marek", question: "kto ma bilety?", answer: "Cena lotu: przykład 150 zł na osobę" }] : []),
    { key: "cost", name: "Marek", question: "ile to wyjdzie na głowę?", answer: "ok. 450 zł na osobę (szacunek)", detail: "ok. 1 800 zł razem" },
    { key: "plan", name: "Tomek", question: "kto ogarnie, co tam robimy?", answer: "Plan na 3 dni, godzina po godzinie" },
    ...(features.settlements ? [{ key: "settlement", name: "Kuba", question: "apartament 1140, kto płaci? kto komu oddaje?", answer: "Przykład: po 285 zł na osobę; Marek → Ania: 285 zł" }] : []),
  ];
  // Fixed named slots keep the entire CSS timeline in globals.css (including Safari).
  const slots: Record<string, number> = { destination: 1, date: 2, flight: 3, cost: 4, plan: 7, settlement: 8.2 };
  return pairs.map((pair) => ({
    ...pair,
    questionAt: slots[pair.key],
    time: pair.name === "Ania" ? "18:02" : "18:03",
    answerAt: slots[pair.key] + HOME_ANIMATION.responseLag,
    typingAt: slots[pair.key] - HOME_ANIMATION.typing,
  }));
}
