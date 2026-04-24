import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const globalForRedis = global as unknown as { 
  redis: Redis;
  pubClient: Redis;
  subClient: Redis;
};

// Main client for state management / caching
export const redis = globalForRedis.redis || new Redis(REDIS_URL);
// Dedicated pairs for pub/sub and socket-io adapter
export const pubClient = globalForRedis.pubClient || new Redis(REDIS_URL);
export const subClient = globalForRedis.subClient || new Redis(REDIS_URL);

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
  globalForRedis.pubClient = pubClient;
  globalForRedis.subClient = subClient;
}

export default redis;
