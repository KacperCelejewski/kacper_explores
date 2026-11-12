// Adres wdrożenia (*.vercel.app) przekierowujemy na prawdziwą domenę, ale nie dla cronów:
// Vercel woła crony właśnie na adres wdrożenia, a 301 sprawia, że zadanie w ogóle się nie wykonuje.
// Crony chroni CRON_SECRET, więc zwolnienie ich z przekierowania nic nie otwiera.
export function redirectsToCanonical(host: string, pathname: string): boolean {
  if (!host.endsWith(".vercel.app")) return false;
  return !pathname.startsWith("/api/cron/");
}
