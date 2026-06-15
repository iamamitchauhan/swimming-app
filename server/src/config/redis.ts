import IORedis from 'ioredis';
import { config } from './env';
import { createLogger } from '../shared/utils/logger';

const logger = createLogger(config.NODE_ENV);

/**
 * BullMQ-compatible connection options built from REDIS_URL.
 * Passed directly to Queue and Worker constructors.
 * BullMQ bundles its own ioredis, so we provide plain options rather than
 * a pre-built IORedis instance to avoid type conflicts between the two copies.
 */
export const bullmqConnectionOptions = {
  url: config.REDIS_URL,
  maxRetriesPerRequest: null as null,
  enableReadyCheck: false,
} as const;

/**
 * Creates a standalone IORedis connection used outside of BullMQ
 * (e.g. health checks in server.ts).
 * Logs connect and error events via the application logger.
 *
 * @returns Configured IORedis instance
 */
export function createRedisConnection(): IORedis {
  const redis = new IORedis(config.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  redis.on('connect', () => logger.info('Redis connected'));
  redis.on('error', (err) => logger.error({ err }, 'Redis error'));

  return redis;
}
