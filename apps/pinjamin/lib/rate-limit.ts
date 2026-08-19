/**
 * Rate limiter in-memory per-proses.
 * Cukup untuk 1 instance / demo. Di serverless multi-instance, batas
 * berlaku per isolate — tetap menahan brute-force dari 1 IP ke 1 instance.
 */

export type RateLimitResult =
  | { allowed: true; remaining: number }
  | { allowed: false; remaining: 0; retryAfter: number };

type Bucket = { count: number; firstAt: number };

export function createRateLimiter(opts: {
  maxAttempts: number;
  windowMs: number;
}) {
  const attempts = new Map<string, Bucket>();

  function prune(now: number) {
    if (attempts.size < 500) return;
    for (const [k, v] of attempts) {
      if (now - v.firstAt > opts.windowMs) attempts.delete(k);
    }
  }

  function check(key: string): RateLimitResult {
    const now = Date.now();
    prune(now);
    const entry = attempts.get(key);
    if (!entry) {
      attempts.set(key, { count: 1, firstAt: now });
      return { allowed: true, remaining: opts.maxAttempts - 1 };
    }
    if (now - entry.firstAt > opts.windowMs) {
      attempts.set(key, { count: 1, firstAt: now });
      return { allowed: true, remaining: opts.maxAttempts - 1 };
    }
    if (entry.count >= opts.maxAttempts) {
      return {
        allowed: false,
        remaining: 0,
        retryAfter: Math.ceil((entry.firstAt + opts.windowMs - now) / 1000),
      };
    }
    entry.count += 1;
    return { allowed: true, remaining: opts.maxAttempts - entry.count };
  }

  function reset(key: string) {
    attempts.delete(key);
  }

  return { check, reset };
}

/** Login admin: 5 percobaan / 15 menit per IP. */
export const loginLimiter = createRateLimiter({
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
});

/** Tiket publik: 8 kiriman / 15 menit per IP (terpisah dari login). */
export const ticketLimiter = createRateLimiter({
  maxAttempts: 8,
  windowMs: 15 * 60 * 1000,
});

/**
 * Lacak tiket publik: 30 pencarian / 5 menit per IP. Endpoint ini menerima
 * nomor tiket tanpa login, jadi tanpa batas ia bisa dipakai menebak nomor
 * tiket orang lain secara massal.
 */
export const trackLimiter = createRateLimiter({
  maxAttempts: 30,
  windowMs: 5 * 60 * 1000,
});

export function clientIp(req: {
  headers: { get(name: string): string | null };
}): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}
