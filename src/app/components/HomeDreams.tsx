"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import HomePoster from "./HomePoster";
import { trackEvent } from "@/lib/analytics";
import { BUDGET_PER_PERSON } from "@/lib/groupFlow";
import { dreamBudgetLevel, homeDreamHref, keepUtmQuery } from "@/lib/homeParams";

// Deliberately fictional whole-trip examples from mock B, never fares or offers.
const EXAMPLES = [
  { city: "Budapeszt", cost: 650, reason: "Łaźnie, spacer i długi wieczór." },
  { city: "Lizbona", cost: 1050, reason: "Pod górę po widok. W dół na kawę." },
  { city: "Porto", cost: 1400, reason: "Nad rzeką nigdzie się nie spieszy." },
] as const;

// Adres strony nie zmienia się bez nawigacji, więc nie ma czego obserwować.
const subscribeNever = () => () => {};

const pln = (amount: number) => `${amount.toLocaleString("pl-PL")} zł`;

export function getDreamPreview(budget: number, people: number) {
  return {
    groupLimit: budget * people,
    cards: EXAMPLES.map((example) => ({
      ...example,
      visible: example.cost <= budget,
      total: example.cost * people,
    })),
  };
}

export default function HomeDreams() {
  const [budget, setBudget] = useState(1100);
  const [people, setPeople] = useState(4);
  // Kampania z wejścia na stronę główną (utm_*) jedzie dalej do quizu; do czasu odczytu adres jest bez niej.
  const search = useSyncExternalStore(subscribeNever, () => window.location.search, () => "");
  const utmQuery = keepUtmQuery(new URLSearchParams(search));
  const { cards, groupLimit } = getDreamPreview(budget, people);
  const count = cards.filter(({ visible }) => visible).length;

  return (
    <section className="home-destinations home-container" aria-labelledby="home-destinations-heading">
      <div className="home-dreams-intro">
        <div>
          <p className="home-poster-label">Przykład · marzenie ekipy</p>
          <h2 id="home-destinations-heading">Ekipa jest. <em>Tylko dokąd?</em></h2>
        </div>
        <p id="home-dreams-note">Zmień budżet i liczbę osób, zobacz, jak reagują karty.
          Wszystkie kwoty to umowne koszty całego wyjazdu. To przykład, nie oferta ani wyszukiwanie lotów.
          Kartę można sprawdzić w quizie: zaczyna się od jej kierunku, wybranej liczby osób i przedziału budżetu.</p>
      </div>

      <noscript><p className="home-dreams-note">Oglądasz przykład dla 4 osób i limitu 1 100 zł na osobę.
        Włącz JavaScript, aby zmieniać parametry i wybierać karty.</p></noscript>

      <div className="home-dreams-controls">
        <div className="home-dreams-budget">
          <label htmlFor="home-dream-budget">Budżet na cały wyjazd na osobę</label>
          <output htmlFor="home-dream-budget" aria-live="off">{pln(budget)}</output>
          <input id="home-dream-budget" type="range" min="400" max="2000" step="50" value={budget}
            aria-describedby="home-dreams-note" aria-valuetext={`${pln(budget)} na osobę`}
            onChange={(event) => { setBudget(Number(event.target.value)); }} />
          <div className="home-dreams-range" aria-hidden="true"><span>400 zł</span><span>2 000 zł</span></div>
        </div>
        <div className="home-dreams-people">
          <label htmlFor="home-dream-people">Ile Was jedzie?</label>
          <select id="home-dream-people" value={people} aria-describedby="home-dreams-note"
            onChange={(event) => { setPeople(Number(event.target.value)); }}>
            {[2, 3, 4, 5, 6, 7, 8, 9].map((n) => <option key={n} value={n}>{n} os.</option>)}
          </select>
        </div>
      </div>

      <p className="home-dreams-summary" role="status" aria-live="polite" aria-atomic="true">
        Przykład: {count} z 3 kierunków w limicie {pln(budget)} na osobę.
        {" "}{people} os. · Limit ekipy: <strong>{pln(groupLimit)}</strong>.
        {" "}To iloczyn limitu i liczby osób, nie wycena rezerwacji.
      </p>

      <div className="home-dreams-cards" hidden={count === 0}>
        {cards.map(({ city, cost, reason, total, visible }) => (
          <article className="home-dream-card" key={city} hidden={!visible}>
            <HomePoster city={city} />
            <div className="home-dream-card-copy">
              <p className="home-poster-label">Przykład</p>
              <h3>{city}</h3>
              <p>{reason}</p>
              <p className="home-dream-card-price"><strong>{pln(cost)}</strong> / os.<br />{pln(total)} razem</p>
              <p className="home-dreams-note">Umowny koszt wyjazdu, nie oferta.</p>
              <p className="home-dreams-note" id={`home-dream-hint-${city}`}>
                W quizie: {city}, {people} os., przedział budżetu: {BUDGET_PER_PERSON[dreamBudgetLevel(budget)]} na osobę.
              </p>
              <Link className="home-dream-try" href={homeDreamHref({ city, people, budgetPerPerson: budget, utmQuery })}
                aria-describedby={`home-dream-hint-${city}`}
                onClick={() => trackEvent("home_dream_try", { city, people, budget_per_person: budget, budget_level: dreamBudgetLevel(budget) })}>
                {city} na próbę →
              </Link>
            </div>
          </article>
        ))}
      </div>
      <div className="home-dreams-empty" hidden={count > 0}>
        <h3>Tu jeszcze pusto. Droga się nie kończy.</h3>
        <p>Żaden z tych trzech przykładów nie mieści się w limicie. Podnieś budżet, żeby zobaczyć karty.
          Prawdziwe okazje sprawdzisz osobno poniżej.</p>
      </div>
    </section>
  );
}
