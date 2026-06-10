import { config } from './config/env';
import logger from './shared/utils/logger';
import { connectDatabase, disconnectDatabase } from './config/database';
import { createApp } from './app';

import Redis from 'ioredis';

const SHUTDOWN_TIMEOUT_MS = 10_000;

/**
 * Verifies Redis connectivity with a PING command.
 * Logs the outcome but does not abort startup on failure —
 * queue workers will surface errors independently.
 */
async function checkRedis(): Promise<void> {
  if (!config.REDIS_URL) {
    logger.warn('REDIS_URL not set — queue features disabled');
    return;
  }

  const redis = new Redis(config.REDIS_URL, { lazyConnect: true });

  try {
    await redis.connect();
    await redis.ping();
    logger.info('Redis connected');
  } catch (err) {
    logger.warn({ err }, 'Redis connection check failed — queue features may be unavailable');
  } finally {
    // Use quit() for a graceful QUIT command rather than abrupt disconnect()
    await redis.quit();
  }
}

/**
 * Registers SIGTERM and SIGINT handlers for graceful shutdown.
 * Closes the HTTP server, then disconnects from MongoDB before exiting.
 */
function registerShutdownHandlers(
  server: ReturnType<typeof import('http').createServer>,
): void {
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutdown signal received — closing server');

    const forceExit = setTimeout(() => {
      logger.error('Graceful shutdown timed out — forcing exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();

    server.close(() => {
      clearTimeout(forceExit);
      disconnectDatabase()
        .then(() => { logger.info('Server shut down cleanly'); process.exit(0); })
        .catch((err: unknown) => { logger.error({ err }, 'Error during shutdown'); process.exit(1); });
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

/**
 * Application entry point.
 * Connects to backing services, starts the HTTP server, and registers
 * shutdown handlers for clean teardown.
 */
async function main(): Promise<void> {
  await connectDatabase();
  await checkRedis();


  const app = createApp();
  const server = app.listen(config.PORT, () => {
    logger.info({ port: config.PORT, env: config.NODE_ENV }, 'Server running');
  });

  registerShutdownHandlers(server);
}

main().catch((err) => {
  logger.error({ err }, 'Fatal error during startup');
  process.exit(1);
});
