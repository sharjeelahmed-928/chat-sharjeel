/**
 * Minimal fixed-window, in-memory rate limiter.
 *
 * Good enough to blunt casual abuse on a single Vercel instance / dev
 * server. Because serverless instances are ephemeral and can scale
 * horizontally, this is NOT a substitute for a durable store (e.g. Upstash
 * Redis) in a high-traffic production deployment — but it keeps the project
 * dependency-free as requested.
 */

const WINDOW_MS = 60_000;
const buckets = new Map<string, { count: number; windowStart: number }>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInMs: number;
}

export function checkRateLimit(key: string, limitPerMinute: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: limitPerMinute - 1, resetInMs: WINDOW_MS };
  }

  if (bucket.count >= limitPerMinute) {
    return {
      allowed: false,
      remaining: 0,
      resetInMs: WINDOW_MS - (now - bucket.windowStart),
    };
  }

  bucket.count += 1;
  return {
    allowed: true,
    remaining: limitPerMinute - bucket.count,
    resetInMs: WINDOW_MS - (now - bucket.windowStart),
  };
}

// Periodically sweep stale buckets so the map doesn't grow unbounded.
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets.entries()) {
      if (now - bucket.windowStart > WINDOW_MS * 5) buckets.delete(key);
    }
  }, WINDOW_MS * 5).unref?.();
}
