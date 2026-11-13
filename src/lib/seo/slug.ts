// Adres z nazwy: bez polskich znaków i spacji ("Palma de Mallorca" → "palma-de-mallorca").
// ł nie rozkłada się w NFD, więc zamieniamy je osobno.
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
