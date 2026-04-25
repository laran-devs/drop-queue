import redis from "./redis";

/**
 * A distributed rate limiter using Redis.
 */
class RedisRateLimiter {
  private prefix: string;
  private windowSeconds: number;

  constructor(prefix: string, windowSeconds: number = 60) {
    this.prefix = prefix;
    this.windowSeconds = windowSeconds;
  }

  /**
   * Checks if the request should be limited.
   * @param key The unique key for the client (e.g., IP or user ID)
   * @param limit The maximum number of requests allowed in the window
   * @returns Promise<boolean> true if request is allowed, false if limited
   */
  public async check(key: string, limit: number): Promise<boolean> {
    const fullKey = `ratelimit:${this.prefix}:${key}`;
    
    try {
      const currentCount = await redis.incr(fullKey);

      if (currentCount === 1) {
        // First request in the window, set expiration
        await redis.expire(fullKey, this.windowSeconds);
      }

      if (currentCount > limit) {
        return false;
      }

      return true;
    } catch (error) {
      console.error("[RATE_LIMIT_ERROR]:", error);
      // Fail open in case of Redis issues to not block users
      return true; 
    }
  }

  /**
   * Returns current count and remaining requests
   */
  public async getStatus(key: string) {
    const fullKey = `ratelimit:${this.prefix}:${key}`;
    const count = await redis.get(fullKey);
    const ttl = await redis.ttl(fullKey);
    return {
      count: parseInt(count || "0"),
      ttl: ttl > 0 ? ttl : 0
    };
  }
}

// Global limiters
export const submissionLimiter = new RedisRateLimiter("submission", 60);
export const uploadLimiter = new RedisRateLimiter("upload", 60);
export const authLimiter = new RedisRateLimiter("auth", 60 * 5); // 5 min for auth attempts
