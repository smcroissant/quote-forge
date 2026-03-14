// ── In-Memory Rate Limiter ──────────────────────────
// For production, replace with Redis-based solution (e.g., @upstash/ratelimit)

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const key = identifier;
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // New window
    const resetAt = now + config.windowMs;
    store.set(key, { count: 1, resetAt });
    return { success: true, remaining: config.maxRequests - 1, resetAt };
  }

  if (entry.count >= config.maxRequests) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

// ── Preset Configs ──────────────────────────────────

export const RATE_LIMITS = {
  // Auth endpoints (login, signup)
  auth: { maxRequests: 5, windowMs: 60 * 1000 }, // 5/min
  // General API
  api: { maxRequests: 100, windowMs: 60 * 1000 }, // 100/min
  // PDF generation (expensive)
  pdf: { maxRequests: 10, windowMs: 60 * 1000 }, // 10/min
  // Email sending
  email: { maxRequests: 5, windowMs: 60 * 1000 }, // 5/min
} as const;
