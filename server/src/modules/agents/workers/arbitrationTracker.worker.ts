import { Worker, Job, ConnectionOptions } from 'bullmq';
import { AgentActivityModel } from '../agents.schema';
import { createLogger } from '../../../shared/utils/logger';

const QUEUE_NAME = 'arbitration-tracker';
const ACTION = 'ARBITRATION_TRACKED';

const logger = createLogger(process.env['NODE_ENV']);

// ─── Job data type ────────────────────────────────────────────────────────────

interface ArbitrationTrackerJobData {
  claimId: string;
  claimNumber: string;
  arbitrationProvider: string;
  caseNumber?: string;
}

// ─── Job processor ────────────────────────────────────────────────────────────

/**
 * Processes a single arbitration-tracker job.
 * Logs the arbitration tracking job and records activity. Real tracking logic is added later.
 *
 * @param job - BullMQ job containing arbitration tracking data
 */
async function processArbitrationTracker(job: Job<ArbitrationTrackerJobData>): Promise<void> {
  const { claimId, claimNumber, arbitrationProvider, caseNumber } = job.data;

  logger.info(
    { jobId: job.id, claimId, claimNumber, arbitrationProvider, caseNumber },
    `${QUEUE_NAME}.job.started`,
  );

  await AgentActivityModel.create({
    agentId: QUEUE_NAME,
    claimId: claimId || undefined,
    action: ACTION,
    result: 'success',
    details: { claimNumber, arbitrationProvider, caseNumber },
  });

  logger.info({ jobId: job.id, claimId }, `${QUEUE_NAME}.job.completed`);
}

// ─── Worker initializer ───────────────────────────────────────────────────────

/**
 * Initializes the arbitration-tracker BullMQ worker.
 * Errors are caught and recorded as failed activity to avoid crashing the server.
 *
 * @param connection - BullMQ connection options
 */
export function init(connection: ConnectionOptions): Worker {
  const worker = new Worker<ArbitrationTrackerJobData>(
    QUEUE_NAME,
    async (job) => {
      try {
        await processArbitrationTracker(job);
      } catch (err) {
        logger.error({ err, jobId: job.id }, `${QUEUE_NAME}.job.failed`);

        await AgentActivityModel.create({
          agentId: QUEUE_NAME,
          action: ACTION,
          result: 'failed',
          details: { error: String(err) },
        });
      }
    },
    { connection },
  );

  worker.on('error', (err) => logger.error({ err }, `${QUEUE_NAME}.worker.error`));

  return worker;
}
