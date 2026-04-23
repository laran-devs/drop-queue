import { LRUCache } from "lru-cache";

/**
 * A simple in-memory rate limiter using LRUCache.
 */
class RateLimiter {
  private cache: LRUCache<string, number>;

  constructor(options: { max: number; ttl: number }) {
    this.cache = new LRUCache({
      max: options.max, // Maximum number of unique keys (IPs)
      ttl: options.ttl, // Time window in milliseconds
    });
  }

  /**
   * Checks if the request should be limited.
   * @param key The unique key for the client (e.g., IP address)
   * @param limit The maximum number of requests allowed in the window
   * @returns boolean true if the request is allowed, false if limited
   */
  public check(key: string, limit: number): boolean {
    const currentCount = this.cache.get(key) || 0;
    
    if (currentCount >= limit) {
      return false;
    }

    this.cache.set(key, currentCount + 1);
    return true;
  }
}

// Default limiter: 10 requests per minute
export const submissionLimiter = new RateLimiter({
  max: 500,
  ttl: 60 * 1000,
});

// Stricter limiter for file uploads: 3 uploads per minute
export const uploadLimiter = new RateLimiter({
  max: 200,
  ttl: 60 * 1000,
});
