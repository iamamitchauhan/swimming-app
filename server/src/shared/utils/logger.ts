import pino from 'pino';

/**
 * Creates and returns a configured pino logger instance.
 * Uses pino-pretty in development for human-readable output;
 * emits plain JSON in production for log aggregation.
 *
 * @param nodeEnv - The current Node environment string (e.g. 'production', 'development')
 * @returns Configured pino logger instance
 */
export function createLogger(nodeEnv: string = 'development'): pino.Logger {
  const isDevelopment = nodeEnv !== 'production';

  return pino(
    {
      level: isDevelopment ? 'debug' : 'info',
      base: {
        pid: process.pid,
        hostname: process.env['HOSTNAME'] ?? 'unknown',
      },
    },
    isDevelopment
      ? pino.transport({
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        })
      : undefined,
  );
}

// Bootstrap logger: uses process.env directly because config has not loaded yet.
// This is the only acceptable direct process.env read — all other code must go
// through the typed config module.
export const logger = createLogger(process.env['NODE_ENV']);

export default logger;
