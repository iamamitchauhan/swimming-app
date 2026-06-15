import { Worker, Job, ConnectionOptions } from 'bullmq';
import { AgentActivityModel } from '../agents.schema';
import { createLogger } from '../../../shared/utils/logger';

const QUEUE_NAME = 'deadline-alert';
const ACTION = 'DEADLINE_ALERT_SENT';

const logger = createLogger(process.env['NODE_ENV']);

// ─── Job data type ────────────────────────────────────────────────────────────

interface DeadlineAlertJobData {
  claimId: string;
  claimNumber: string;
  state: string;
  deadlines: Array<{ type: string; dueDate: string; daysUntilDue: number }>;
}

// ─── Job processor ────────────────────────────────────────────────────────────

/**
 * Processes a single deadline-alert job.
 * Logs the deadlines and records activity. Real alert dispatch is added later.
 *
 * @param job - BullMQ job containing deadline alert data
 */
async function processDeadlineAlert(job: Job<DeadlineAlertJobData>): Promise<void> {
  const { claimId, claimNumber, state, deadlines } = job.data;

  logger.info({ jobId: job.id, claimId, claimNumber, state, deadlines }, `${QUEUE_NAME}.job.started`);

  await AgentActivityModel.create({
    agentId: QUEUE_NAME,
    claimId: claimId || undefined,
    action: ACTION,
    result: 'success',
    details: { claimNumber, state, deadlines },
  });

  logger.info({ jobId: job.id, claimId }, `${QUEUE_NAME}.job.completed`);
}

// ─── Worker initializer ───────────────────────────────────────────────────────

/**
 * Initializes the deadline-alert BullMQ worker.
 * Errors are caught and recorded as failed activity to avoid crashing the server.
 *
 * @param connection - BullMQ connection options
 */
export function init(connection: ConnectionOptions): Worker {
  const worker = new Worker<DeadlineAlertJobData>(
    QUEUE_NAME,
    async (job) => {
      try {
        await processDeadlineAlert(job);
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
