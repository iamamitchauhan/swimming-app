import mongoose from 'mongoose';
import { config } from './env';
import logger from '../shared/utils/logger';

/**
 * Establishes a Mongoose connection to MongoDB.
 * Logs success on connect; logs the error and exits the process on failure
 * to prevent the server from running without a database.
 */
export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(config.MONGODB_URI);
    logger.info('MongoDB connected');
  } catch (err) {
    logger.error({ err }, 'MongoDB connection failed');
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
    logger.info('MongoDB disconnected');
  } catch (err) {
    logger.error({ err }, 'MongoDB disconnection error');
  }
}
