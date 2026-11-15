"use client";

import { useId } from "react";
import type { Companion, GroupComposition } from "@/types";
import { MAX_GROUP, groupFromCompanion, groupSize } from "@/lib/group";

const FRIENDS_MIN = 3;
const DEFAULT_CHILD_AGE = 5;
const MAX_CHILD_AGE = 17;
const INFANT_BELOW = 2;

interface Props {
  companion: Companion | null;
  group: GroupComposition | undefined;
  onChange: (g: GroupComposition) => void;
}

function StepButton({
  label, onClick, disabled, describedBy, children,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  describedBy?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-describedby={disabled ? describedBy : undefined}
      aria-disabled={disabled ? "true" : undefined}
      onClick={() => { if (!disabled) onClick(); }}
      className="flex items-center justify-center rounded-full text-xl font-semibold"
      style={{
        width: 44,
        height: 44,
        background: "var(--bg-surface)",
        border: "1.5px solid var(--border)",
        color: disabled ? "var(--text-muted)" : "var(--accent)",
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

function CounterRow({
  title, hint, value, valueLabel, onMinus, onPlus, minusDisabled, plusDisabled, minusLabel, plusLabel, limitId,
}: {
  title: string;
  hint?: string;
  value: number;
  valueLabel: string;
  onMinus: () => void;
  onPlus: () => void;
  minusDisabled: boolean;
  plusDisabled: boolean;
  minusLabel: string;
  plusLabel: string;
  limitId: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="font-semibold text-[15px]">{title}</p>
        {hint && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{hint}</p>}
      </div>
      <div className="flex items-center gap-3">
        <StepButton label={minusLabel} onClick={onMinus} disabled={minusDisabled}>−</StepButton>
        <span className="text-lg font-bold text-center" style={{ minWidth: 28 }}>
          <span aria-hidden="true">{value}</span>
          <span className="sr-only" role="status">{valueLabel}</span>
        </span>
        <StepButton label={plusLabel} onClick={onPlus} disabled={plusDisabled} describedBy={limitId}>+</StepButton>
      </div>
    </div>
  );
}

export default function GroupSizePicker({ companion, group, onChange }: Props) {
  const limitId = useId();
  if (companion !== "friends" && companion !== "family") return null;

  const current = groupFromCompanion(companion, group);
  const seats = groupSize(current);
  const atLimit = seats >= MAX_GROUP;
  const limitHint = `Do ${MAX_GROUP} osób w jednej rezerwacji`;

  const limitNote = (
    <p
      id={limitId}
      className="text-xs mt-3"
      style={{ color: "var(--text-muted)" }}
    >
      {atLimit ? `Osiągnięto limit. ${limitHint}.` : `${limitHint}.`}
    </p>
  );

  const box = "p-4 rounded-2xl";
  const boxStyle = { background: "var(--bg-surface)", border: "1.5px solid var(--border)" };

  if (companion === "friends") {
    return (
      <div className={box} style={boxStyle} role="group" aria-label="Ile osób jedzie">
        <CounterRow
          title="Ile osób jedzie"
          hint={`Od ${FRIENDS_MIN} osób`}
          value={current.adults}
          valueLabel={`Liczba osób: ${current.adults}`}
          minusLabel="Mniej osób"
          plusLabel="Więcej osób"
          minusDisabled={current.adults <= FRIENDS_MIN}
          plusDisabled={atLimit}
          limitId={limitId}
          onMinus={() => onChange({ adults: current.adults - 1, childrenAges: [] })}
          onPlus={() => onChange({ adults: current.adults + 1, childrenAges: [] })}
        />
        {limitNote}
      </div>
    );
  }

  const ages = current.childrenAges;
  const infantCount = ages.filter((a) => a < INFANT_BELOW).length;
  // Niemowląt nie może być więcej niż dorosłych (lecą na kolanach).
  const infantsFull = infantCount >= current.adults;
  const setAge = (i: number, age: number) =>
    onChange({ adults: current.adults, childrenAges: ages.map((a, idx) => (idx === i ? age : a)) });

  return (
    <div className={box} style={boxStyle} role="group" aria-label="Skład rodziny">
      <CounterRow
        title="Dorośli"
        value={current.adults}
        valueLabel={`Liczba dorosłych: ${current.adults}`}
        minusLabel="Mniej dorosłych"
        plusLabel="Więcej dorosłych"
        minusDisabled={current.adults <= 1 || infantCount > current.adults - 1}
        plusDisabled={atLimit}
        limitId={limitId}
        onMinus={() => onChange({ adults: current.adults - 1, childrenAges: ages })}
        onPlus={() => onChange({ adults: current.adults + 1, childrenAges: ages })}
      />
      <div className="my-3" style={{ borderTop: "1px solid var(--border)" }} />
      <CounterRow
        title="Dzieci"
        hint="Do 17 lat"
        value={ages.length}
        valueLabel={`Liczba dzieci: ${ages.length}`}
        minusLabel="Mniej dzieci"
        plusLabel="Więcej dzieci"
        minusDisabled={ages.length === 0}
        plusDisabled={atLimit}
        limitId={limitId}
        onMinus={() => onChange({ adults: current.adults, childrenAges: ages.slice(0, -1) })}
        onPlus={() => onChange({ adults: current.adults, childrenAges: [...ages, DEFAULT_CHILD_AGE] })}
      />
      {ages.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2" aria-label="Wiek dzieci">
          {ages.map((age, i) => {
            const selectId = `${limitId}-age-${i}`;
            return (
              <li key={i} className="flex items-center justify-between gap-3">
                <label htmlFor={selectId} className="text-sm">Dziecko {i + 1}, wiek</label>
                <select
                  id={selectId}
                  value={age}
                  onChange={(e) => setAge(i, Number(e.target.value))}
                  className="rounded-xl px-3 text-sm"
                  style={{
                    minHeight: 44,
                    background: "var(--bg-surface)",
                    border: "1.5px solid var(--border)",
                    color: "inherit",
                  }}
                >
                  {Array.from({ length: MAX_CHILD_AGE + 1 }, (_, a) => (
                    // Niemowlę nie zajmuje miejsca, więc przy limicie nie może zostać starsze
                    <option
                      key={a}
                      value={a}
                      disabled={
                        (atLimit && age < INFANT_BELOW && a >= INFANT_BELOW) ||
                        (infantsFull && age >= INFANT_BELOW && a < INFANT_BELOW)
                      }
                    >
                      {a === 0 ? "poniżej roku" : a === 1 ? "1 rok" : a < 5 ? `${a} lata` : `${a} lat`}
                    </option>
                  ))}
                </select>
              </li>
            );
          })}
        </ul>
      )}
      {limitNote}
    </div>
  );
}
