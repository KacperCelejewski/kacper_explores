/**
 * Sliding-window in-memory rate limiter.
 * Works well on warm serverless instances; resets on cold starts (acceptable for MVP).
 * To upgrade to persistent rate limiting, swap this for @upstash/ratelimit.
 */

interface WindowEntry {
  timestamps: number[];
}

const store = new Map<string, WindowEntry>();

// Clean up stale keys every 10 minutes to avoid memory leaks
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.timestamps.length === 0 || now - entry.timestamps[entry.timestamps.length - 1] > 3_600_000) {
        store.delete(key);
      }
    }
  }, 10 * 60 * 1000);
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
}

/**
 * @param key     unique identifier (e.g. "generate:1.2.3.4")
 * @param limit   max requests allowed in the window
 * @param windowMs  window size in milliseconds
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;

  const entry = store.get(key) ?? { timestamps: [] };

  // Drop timestamps outside the current window
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  const remaining = Math.max(0, limit - entry.timestamps.length);
  const allowed = entry.timestamps.length < limit;

  if (allowed) {
    entry.timestamps.push(now);
    store.set(key, entry);
  }

  const oldestInWindow = entry.timestamps[0] ?? now;
  const resetInSeconds = Math.ceil((oldestInWindow + windowMs - now) / 1000);

  return { allowed, remaining: allowed ? remaining - 1 : 0, resetInSeconds };
}

export const LIMITS = {
  generate: { limit: 3, windowMs: 60 * 60 * 1000 },  // 3/hour per IP
  flights:  { limit: 30, windowMs: 60 * 60 * 1000 }, // 30/hour per IP
};
