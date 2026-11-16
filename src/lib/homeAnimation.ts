import { FEATURES, type FeatureKey } from "./features";

export const HOME_ANIMATION = { cycle: 16, loops: 3, dim: 10, hold: 13.5, fade: 15, responseLag: 0.45, arrival: 0.25 } as const;
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
  return pairs.map((pair, index) => ({
    ...pair,
    questionAt: 1 + index * (9 / pairs.length),
    answerAt: 1 + index * (9 / pairs.length) + HOME_ANIMATION.responseLag,
  }));
}

export function homeAnimationCss(pairs = homeAnimationPairs()) {
  const { cycle, loops, dim, fade } = HOME_ANIMATION;
  const pct = (seconds: number) => `${Number((100 * seconds / cycle).toFixed(4))}%`;
  const arrival = (name: string, at: number) => `@keyframes ${name}{0%,${pct(at)}{opacity:0;transform:translateY(6px)}${pct(at + HOME_ANIMATION.arrival)},100%{opacity:1;transform:none}}`;
  return `@media (prefers-reduced-motion:no-preference){
    .home-chat-scene{animation:home-chat-fade ${cycle}s linear ${loops - 1}}
    .home-chat-group{animation:home-chat-dim ${cycle}s linear ${loops} forwards}
    .home-chat-map{animation:home-chat-map ${cycle}s linear ${loops} forwards}
    @keyframes home-chat-fade{0%,${pct(fade)}{opacity:1}100%{opacity:0}}
    @keyframes home-chat-dim{0%,${pct(dim)}{opacity:1}${pct(dim + 0.6)},100%{opacity:.84}}
    @keyframes home-chat-map{0%,${pct(dim)}{opacity:.3}${pct(dim + 0.6)},100%{opacity:.08}}
    ${pairs.map((pair) => {
      const q = `home-chat-q-${pair.key}`, a = `home-chat-a-${pair.key}`;
      return `.home-chat-question-${pair.key}{animation:${q} ${cycle}s linear ${loops} both}
        .home-chat-answer-${pair.key}{animation:${a} ${cycle}s linear ${loops} both}
        ${arrival(q, pair.questionAt)}${arrival(a, pair.answerAt)}`;
    }).join("\n")}
  }`;
}
