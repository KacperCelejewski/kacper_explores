import { loadConsent } from "./cookieConsent";
import { SRC_VALUES, type HomeSrc } from "./homeParams";

// Skąd osoba weszła do quizu: kanał (ig, blog, okazje, ...) i konkretny materiał (np. blog:ktorym-lotniskiem-z-polski-lecisz-na-weekend).
// Te dwie wartości dopisujemy do zdarzeń GA4 od wejścia do planu, żeby dało się policzyć
// wejście z materiału -> ukończony quiz -> plan. Tylko znane, bezpieczne wartości: małe litery, cyfry i _ . - :
// bez adresów, e-maili i niczego, co wpisuje użytkownik. Opis: docs/entry-quality-measurement.md.
export interface EntryAttribution {
  channel: string;
  material: string;
}

export const DIRECT_ENTRY: EntryAttribution = { channel: "direct", material: "direct" };

const TOKEN = /^[a-z0-9][a-z0-9_.-]{0,59}$/;
const MAX_MATERIAL = 100;

function token(value: string | null | undefined): string | null {
  const v = value?.trim().toLowerCase();
  return v && TOKEN.test(v) ? v : null;
}

const SOURCE_ALIAS: Record<string, string> = { instagram: "ig" };

// Wartość parametru GA4 ma do 100 znaków, a kanał to jeden token.
function build(channel: string | null, parts: Array<string | null | undefined>): EntryAttribution | null {
  const ch = token(channel);
  if (!ch) return null;
  const segments = parts.map((p) => token(p) ?? "-");
  while (segments.length > 1 && segments[segments.length - 1] === "-") segments.pop();
  const material = [ch, ...segments].join(":");
  return { channel: ch, material: material.length <= MAX_MATERIAL ? material : ch };
}

// Podstrony treści, z których prowadzą linki do quizu: artykuły, strony okazji z lotniska i strony miast.
const CONTENT_ROOTS = ["blog", "okazje", "weekend"] as const;

export function contentRefFromPath(pathname: string | null | undefined): EntryAttribution | null {
  if (!pathname) return null;
  const [, root, slug] = pathname.split(/[?#]/)[0].split("/");
  const channel = CONTENT_ROOTS.find((r) => r === root);
  if (!channel) return null;
  const s = token(slug);
  return s ? { channel, material: `${channel}:${s}` } : { channel, material: channel };
}

function channelFromSrc(src: HomeSrc | "drop"): string {
  if (src === "drop") return "drop";
  if (src.startsWith("ig-")) return "ig";
  if (src.startsWith("blog-")) return "blog";
  return "home";
}

type ParamGetter = { get(name: string): string | null };

// Wejście przekazane w adresie (powrót z logowania linkiem w innej przeglądarce).
export function parseEntryParams(params: ParamGetter): EntryAttribution | null {
  const channel = token(params.get("entry_channel"));
  const material = params.get("entry_material")?.trim().toLowerCase();
  if (!channel || !material || material.length > MAX_MATERIAL) return null;
  if (!material.split(":").every((s) => s === "-" || TOKEN.test(s))) return null;
  if (material.split(":")[0] !== channel) return null;
  return { channel, material };
}

export function entryUrlParams(entry: EntryAttribution | null | undefined): string {
  if (!entry || entry.channel === DIRECT_ENTRY.channel) return "";
  return `&entry_channel=${encodeURIComponent(entry.channel)}&entry_material=${encodeURIComponent(entry.material)}`;
}

// Z adresu: utm_* (linki z IG, maili zrzutu, strony świata) albo src (przyciski na stronie głównej, linki w artykułach).
export function entryFromUrl(params: ParamGetter): EntryAttribution | null {
  const rawSource = token(params.get("utm_source"));
  if (rawSource) {
    return build(SOURCE_ALIAS[rawSource] ?? rawSource, [params.get("utm_campaign"), params.get("utm_content")]);
  }
  const rawSrc = params.get("src");
  const src = rawSrc === "drop" ? "drop" : SRC_VALUES.find((s) => s === rawSrc);
  return src ? build(channelFromSrc(src), [src]) : null;
}

export interface ResolveEntryInput {
  params: ParamGetter;
  /** Strona treści, z której kliknięto w link do quizu (zapamiętana przy kliknięciu). */
  contentRef?: EntryAttribution | null;
  /** Ścieżka poprzedniej strony tej samej witryny (document.referrer), gdy link otwarto w nowej karcie. */
  referrerPath?: string | null;
  /** Wejście zapamiętane wcześniej w tej sesji; zostaje, gdy nic nowszego nie wskazuje źródła. */
  stored?: EntryAttribution | null;
}

// Kolejność: adres po powrocie z logowania, konkretna strona treści, utm_/src w adresie, zapamiętane wejście, "direct".
export function resolveEntry({ params, contentRef, referrerPath, stored }: ResolveEntryInput): EntryAttribution {
  return (
    parseEntryParams(params) ??
    contentRef ??
    contentRefFromPath(referrerPath) ??
    entryFromUrl(params) ??
    stored ??
    DIRECT_ENTRY
  );
}

// Parametry zdarzeń GA4. "direct" też wysyłamy, żeby dało się policzyć udział wejść bez znanego źródła.
export function entryEventParams(entry: EntryAttribution | null | undefined): Record<string, string> {
  return entry ? { entry_channel: entry.channel, entry_material: entry.material } : {};
}

// ── Pamięć sesji (sessionStorage), tylko po zgodzie na analitykę ─────────────

export type EntryStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const ENTRY_KEY = "wl_entry";
const REF_KEY = "wl_entry_ref";
const ENTRY_TTL_MS = 3 * 60 * 60 * 1000;
const REF_TTL_MS = 30 * 60 * 1000;

function read(storage: EntryStorage | null, key: string, ttl: number, now: number): EntryAttribution | null {
  try {
    const raw = storage?.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw) as { c?: unknown; m?: unknown; t?: unknown };
    if (typeof data.t !== "number" || now - data.t > ttl || now < data.t) return null;
    return parseEntryParams({
      get: (n) => (n === "entry_channel" ? (data.c as string) : n === "entry_material" ? (data.m as string) : null),
    });
  } catch { return null; }
}

function write(storage: EntryStorage | null, key: string, entry: EntryAttribution | null, now: number) {
  try {
    if (!entry) storage?.removeItem(key);
    else storage?.setItem(key, JSON.stringify({ c: entry.channel, m: entry.material, t: now }));
  } catch { /* storage zablokowany: pomiar nigdy nie blokuje użytkownika */ }
}

export const loadEntry = (storage: EntryStorage | null, now = Date.now()) => read(storage, ENTRY_KEY, ENTRY_TTL_MS, now);
export const saveEntry = (storage: EntryStorage | null, entry: EntryAttribution | null, now = Date.now()) =>
  write(storage, ENTRY_KEY, entry, now);
export const loadContentRef = (storage: EntryStorage | null, now = Date.now()) => read(storage, REF_KEY, REF_TTL_MS, now);
// null kasuje poprzednie: kliknięcie w quiz z innej strony nie dziedziczy starego artykułu.
export const saveContentRef = (storage: EntryStorage | null, ref: EntryAttribution | null, now = Date.now()) =>
  write(storage, REF_KEY, ref, now);

// Magazyn tylko po zgodzie: bez niej nic nie zapisujemy w urządzeniu, a zdarzenia GA4 i tak się nie wysyłają.
export function entryStorage(): EntryStorage | null {
  if (typeof window === "undefined" || loadConsent() !== "accepted") return null;
  try { return window.sessionStorage; } catch { return null; }
}

// Wejście dla bieżącego quizu: wyznacza, zapamiętuje (poza "direct", które nie nadpisuje) i zużywa ślad kliknięcia.
export function captureEntry(params: ParamGetter, storage: EntryStorage | null, referrer: string | null, origin: string, now = Date.now()): EntryAttribution {
  const entry = resolveEntry({
    params,
    contentRef: loadContentRef(storage, now),
    referrerPath: sameOriginPath(referrer, origin),
    stored: loadEntry(storage, now),
  });
  saveContentRef(storage, null, now);
  if (entry.channel !== DIRECT_ENTRY.channel) saveEntry(storage, entry, now);
  return entry;
}

export function sameOriginPath(url: string | null | undefined, origin: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.origin === origin ? u.pathname : null;
  } catch { return null; }
}
