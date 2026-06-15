import { Worker, Job, ConnectionOptions } from 'bullmq';
import { AgentActivityModel } from '../agents.schema';
import { createLogger } from '../../../shared/utils/logger';

const QUEUE_NAME = 'status-notification';
const ACTION = 'STATUS_NOTIFICATION_SENT';

const logger = createLogger(process.env['NODE_ENV']);

// ─── Job data type ────────────────────────────────────────────────────────────

interface StatusNotificationJobData {
  claimId: string;
  claimNumber: string;
  newStatus: string;
  assignedTo?: string;
  firmId: string;
}

// ─── Job processor ────────────────────────────────────────────────────────────

/**
 * Processes a single status-notification job.
 * Logs the notification job and records activity. Real notification dispatch is added later.
 *
 * @param job - BullMQ job containing status notification data
 */
async function processStatusNotification(job: Job<StatusNotificationJobData>): Promise<void> {
  const { claimId, claimNumber, newStatus, assignedTo, firmId } = job.data;

  logger.info(
    { jobId: job.id, claimId, claimNumber, newStatus, firmId },
    `${QUEUE_NAME}.job.started`,
  );

  await AgentActivityModel.create({
    agentId: QUEUE_NAME,
    claimId: claimId || undefined,
    action: ACTION,
    result: 'success',
    details: { claimNumber, newStatus, assignedTo, firmId },
  });

  logger.info({ jobId: job.id, claimId }, `${QUEUE_NAME}.job.completed`);
}

// ─── Worker initializer ───────────────────────────────────────────────────────

/**
 * Initializes the status-notification BullMQ worker.
 * Errors are caught and recorded as failed activity to avoid crashing the server.
 *
 * @param connection - BullMQ connection options
 */
export function init(connection: ConnectionOptions): Worker {
  const worker = new Worker<StatusNotificationJobData>(
    QUEUE_NAME,
    async (job) => {
      try {
        await processStatusNotification(job);
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
