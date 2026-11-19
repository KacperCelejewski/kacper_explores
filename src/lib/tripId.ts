// Id planu powstaje z nazwy miasta, więc starsze plany mają w id polskie znaki i nawiasy
// ("tenerife-(południe)-1794942335080"). Strona dostaje taki id zakodowany procentowo,
// więc szukamy zarówno w postaci surowej, jak i zdekodowanej.
export function tripIdCandidates(raw: string): string[] {
  const out = [raw];
  try {
    const decoded = decodeURIComponent(raw);
    if (decoded !== raw) out.push(decoded);
  } catch {
    // zły ciąg procentowy: zostaje sama wartość surowa
  }
  return out;
}

// Nowe id: sam ASCII (litery, cyfry, myślniki), żeby link nigdy nie wymagał kodowania.
export function makeTripId(city: string, timestamp: number): string {
  const slug = city
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${slug || "plan"}-${timestamp}`;
}
