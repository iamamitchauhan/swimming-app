import path from "path";
import pino from "pino";

/**
 * Resolves the absolute path to the log directory.
 * Logs are written to `<cwd>/logs` so they live alongside the running
 * process regardless of whether it was started from `src/` or `dist/`.
 */
const LOG_DIR = path.join(process.cwd(), "logs");

/**
 * Filename pattern for daily-rotated log files.
 * pino-roll appends the current date when `frequency: 'daily'` is set,
 * producing files like `app-2026-08-15.log`.
 */
const LOG_FILE = path.join(LOG_DIR, "app.log");

/**
 * Secret/sensitive field paths redacted from every log entry so that
 * controller request-body/query logging can never leak credentials,
 * one-time codes or verification tokens. Masked as "[Redacted]".
 */
const REDACT_PATHS = [
  "body.password",
  "body.otp",
  "body.token",
  "body.refreshToken",
  "body.currentPassword",
  "body.newPassword",
  "body.cardNumber",
  "body.cvv",
  "query.token",
  "query.otp",
  "query.password",
];

/**
 * Creates and returns a configured pino logger instance.
 *
 * - Development: pretty-printed colorized output to stdout (level: debug).
 * - Production: JSON lines written to a daily-rotated file via `pino-roll`
 *   (level: info) AND mirrored to stdout so container/PM2 collectors still
 *   receive structured logs. Files rotate at midnight, one file per day.
 *
 * @param nodeEnv - The current Node environment string (e.g. 'production', 'development')
 * @returns Configured pino logger instance
 */
export function createLogger(nodeEnv: string = "development"): pino.Logger {
  const isDevelopment = nodeEnv !== "production";
  const level = isDevelopment ? "debug" : "info";

  const base = {
    pid: process.pid,
    hostname: process.env["HOSTNAME"] ?? "unknown",
  };

  const redact = { paths: REDACT_PATHS, censor: "[Redacted]" };

  if (isDevelopment) {
    return pino(
      { level, base, redact },
      pino.transport({
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      }),
    );
  }

  // Production: daily-rotated file + stdout (both JSON), via multistream transport.
  return pino(
    { level, base, redact },
    pino.transport({
      targets: [
        {
          target: "pino-roll",
          level,
          options: {
            file: LOG_FILE,
            frequency: "daily",
            mkdir: true,
            dateFormat: "yyyy-MM-dd",
            size: "100m",
            limit: { count: 30 },
          },
        },
        {
          target: "pino/file",
          level,
          options: { destination: 1 }, // stdout
        },
      ],
    }),
  );
}

// Bootstrap logger: uses process.env directly because config has not loaded yet.
// This is the only acceptable direct process.env read — all other code must go
// through the typed config module.
export const logger = createLogger(process.env["NODE_ENV"]);

export default logger;
