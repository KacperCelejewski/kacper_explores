const BASE = "https://redirect-check.invalid";

// Jedyny walidator przekierowań po logowaniu i zakupie: tylko ścieżka względna w obrębie serwisu.
// Odrzuca "//host", "/\host", znaki sterujące (tab/newline usuwane przez parser URL) i wszystko,
// co po sparsowaniu zmienia origin.
export function safeNextPath(raw: unknown, fallback = "/"): string {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 2048) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;
  // eslint-disable-next-line no-control-regex
  if (/[\\\u0000- \u007f]/.test(raw)) return fallback;
  let parsed: URL;
  try {
    parsed = new URL(raw, BASE);
  } catch {
    return fallback;
  }
  if (parsed.origin !== BASE) return fallback;
  const normalized = parsed.pathname + parsed.search + parsed.hash;
  // Usunięcie segmentów kropkowych potrafi zrobić z "/.//host" ścieżkę "//host" (protocol-relative).
  if (normalized.startsWith("//")) return fallback;
  return normalized;
}
