/**
 * Simple in-memory rate limiter for API requests
 * Prevents excessive API calls that could lead to quota exhaustion
 */

interface RateLimitEntry {
  requests: number[];
  lastReset: number;
}

// In-memory cache for rate limiting (cleared on server restart)
const rateLimitCache = new Map<string, RateLimitEntry>();

// Configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // Max 10 requests per minute per user

/**
 * Check if user has exceeded rate limit
 * @param userId - User ID to check
 * @param maxRequests - Maximum requests allowed (default: 10)
 * @returns true if within limit, false if exceeded
 */
export function checkRateLimit(userId: string, maxRequests: number = MAX_REQUESTS_PER_WINDOW): boolean {
  const now = Date.now();
  const entry = rateLimitCache.get(userId);

  // If no entry or window expired, reset
  if (!entry || now - entry.lastReset > RATE_LIMIT_WINDOW_MS) {
    rateLimitCache.set(userId, {
      requests: [now],
      lastReset: now
    });
    return true; // Allow request
  }

  // Remove requests older than window
  const recentRequests = entry.requests.filter(time => now - time < RATE_LIMIT_WINDOW_MS);

  // Check if limit exceeded
  if (recentRequests.length >= maxRequests) {
    console.warn(`⚠️ Rate limit exceeded for user ${userId}: ${recentRequests.length}/${maxRequests} requests`);
    return false; // Rate limit exceeded
  }

  // Add current request
  recentRequests.push(now);
  rateLimitCache.set(userId, {
    requests: recentRequests,
    lastReset: entry.lastReset
  });

  return true; // Allow request
}

/**
 * Get remaining requests for user
 * @param userId - User ID to check
 * @returns Number of remaining requests in current window
 */
export function getRemainingRequests(userId: string): number {
  const now = Date.now();
  const entry = rateLimitCache.get(userId);

  if (!entry || now - entry.lastReset > RATE_LIMIT_WINDOW_MS) {
    return MAX_REQUESTS_PER_WINDOW;
  }

  const recentRequests = entry.requests.filter(time => now - time < RATE_LIMIT_WINDOW_MS);
  return Math.max(0, MAX_REQUESTS_PER_WINDOW - recentRequests.length);
}

/**
 * Clear rate limit cache (useful for testing or manual reset)
 */
export function clearRateLimitCache(): void {
  rateLimitCache.clear();
}

