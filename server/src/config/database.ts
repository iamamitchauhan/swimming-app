import mongoose from "mongoose";
import { config } from "./env";
import logger from "../shared/utils/logger";

/**
 * Establishes a Mongoose connection to MongoDB.
 * Logs success on connect; logs the error and exits the process on failure
 * to prevent the server from running without a database.
 */
export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(config.MONGODB_URI);
    logger.info("MongoDB connected");

    // Sync indexes so stale indexes (e.g. a former unique index on just `email`)
    // are dropped and the current schema indexes are ensured.
    // This allows the same email to be used across different roles.
    // Wrapped in try/catch so one problematic model doesn't crash the server.
    try {
      const droppedIndexes = await mongoose.syncIndexes();
      if (droppedIndexes && Object.keys(droppedIndexes).length > 0) {
        logger.info({ droppedIndexes }, "MongoDB stale indexes dropped");
      }
    } catch (syncErr) {
      logger.error({ err: syncErr }, "MongoDB index sync failed (non-fatal)");
    }
  } catch (err) {
    logger.error({ err }, "MongoDB connection failed");
    process.exit(1);
  }
}

/**
 * Gracefully closes the Mongoose connection.
 * Safe to call during shutdown handlers.
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await mongoose.disconnect();
    logger.info("MongoDB disconnected");
  } catch (err) {
    logger.error({ err }, "MongoDB disconnection error");
  }
}
