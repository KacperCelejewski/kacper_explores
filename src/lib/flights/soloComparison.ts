// Najmniejsza różnica (zł na osobę), od której warto pokazać porównanie.
const MIN_DIFF = 5;

/** Notka, gdy jedna osoba poleci taniej niż każda z grupy. */
export function soloComparisonNote(
  groupPerPerson: number,
  soloPerPerson: number | null,
  groupSeats: number
): string | null {
  if (groupSeats <= 1 || soloPerPerson === null) return null;
  const group = Math.round(groupPerPerson);
  const solo = Math.round(soloPerPerson);
  if (group - solo < MIN_DIFF) return null;
  return `Jedna osoba poleci za ${solo} zł, ale w tej cenie nie ma już ${groupSeats} miejsc.`;
}
