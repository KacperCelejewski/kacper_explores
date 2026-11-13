// Dzieli artykuł (MDX) przed pierwszym nagłówkiem h2 leżącym za `ratio` długości tekstu,
// żeby w tym miejscu wstawić zapis na zrzut. Bez takiego nagłówka zwraca całość i pusty koniec.
export function splitAtHeading(content: string, ratio: number): [string, string] {
  const from = Math.floor(content.length * ratio);
  const rest = content.slice(from);
  const match = /\n## /.exec(rest);
  if (!match) return [content, ""];
  const at = from + match.index + 1;
  return [content.slice(0, at), content.slice(at)];
}
