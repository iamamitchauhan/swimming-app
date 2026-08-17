// Sentry instrumentation — must be loaded before all other modules.
// Imported as the first line of src/server.ts so it runs before express,
// mongoose, and any other library is required.
//
// In dev (ts-node) this runs from src/instrument.ts; in prod (node dist/server.js)
// it runs from the compiled dist/instrument.js. The relative "./instrument" import
// resolves correctly in both because tsc maps src/ -> dist/.
import dotenv from "dotenv";
import * as Sentry from "@sentry/node";

// Load .env before Sentry.init so SENTRY_DSN / SENTRY_ENVIRONMENT are available.
// env.ts also calls dotenv.config(), but that runs later — calling it twice is harmless.
dotenv.config();

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // 100% of traces in dev, 10% in production
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Capture local variable values in stack frames (Node.js)
  includeLocalVariables: true,

  // Enable Sentry Logs (structured logs via Sentry.logger.*)
  enableLogs: true,

  // Tag events with their environment; falls back to the SDK default ("production")
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
});
