export type Consent = "accepted" | "rejected";
const STORAGE_KEY = "cookie_consent";
const CHANGE_EVENT = "wloczykij:consent";

export function loadConsent(): Consent | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "accepted" || value === "rejected" ? value : null;
  } catch { return null; }
}

export function saveConsent(value: Consent): void {
  try { localStorage.setItem(STORAGE_KEY, value); } catch { /* blocked storage means direct links remain active */ }
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function resetConsent(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeConsent(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => { if (event.key === STORAGE_KEY || event.key === null) onChange(); };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export const serverConsent = (): null => null;
