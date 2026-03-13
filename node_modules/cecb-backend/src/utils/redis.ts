import Redis from 'ioredis';
import { logger } from './logger';

export const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  lazyConnect: true,
  retryStrategy: (times) => {
    if (times > 3) {
      logger.warn('Redis not available — running without Redis');
      return null;
    }
    return Math.min(times * 200, 3000);
  },
});

redisClient.on('error', (err) => {
  logger.warn(`Redis error: ${err.message}`);
});

export default redisClient;
