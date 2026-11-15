// Parametry z linków na stronie głównej. Tylko dokładne wartości z listy dozwolonych,
// cokolwiek innego jest ignorowane, żeby nic z adresu nie trafiało do stanu ani do zdarzeń.
export type HomeSrc = "home-ekipa" | "home-solo";

export interface HomeParams {
  companion: "friends" | null;
  src: HomeSrc | null;
}

const SRC: readonly HomeSrc[] = ["home-ekipa", "home-solo"];

export function parseHomeParams(params: { get(name: string): string | null }): HomeParams {
  const companion = params.get("companion") === "friends" ? "friends" : null;
  const rawSrc = params.get("src");
  const src = SRC.find((s) => s === rawSrc) ?? null;
  return { companion, src };
}
