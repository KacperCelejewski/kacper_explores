/** Where the login flow sends the user back to; the chosen city rides along in the URL. */
export function quizLoginNext(preferredCity?: string | null): string {
  const base = "/quiz?afterLogin=1";
  const city = preferredCity?.trim();
  return city ? `${base}&city=${encodeURIComponent(city)}` : base;
}

/** City to keep after the login round trip: the URL wins, the store is the fallback. */
export function cityAfterLogin(urlCity: string | null, storeCity?: string | null): string | undefined {
  return urlCity?.trim() || storeCity || undefined;
}
