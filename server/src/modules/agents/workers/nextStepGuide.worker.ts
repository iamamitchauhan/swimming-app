import { Worker, Job, ConnectionOptions } from 'bullmq';
import { AgentActivityModel } from '../agents.schema';
import { createLogger } from '../../../shared/utils/logger';

const QUEUE_NAME = 'next-step-guide';
const ACTION = 'NEXT_STEP_COMPUTED';

const logger = createLogger(process.env['NODE_ENV']);

// ─── Job data type ────────────────────────────────────────────────────────────

interface NextStepGuideJobData {
  claimId: string;
  claimNumber: string;
  currentStatus: string;
  state: string;
}

// ─── Job processor ────────────────────────────────────────────────────────────

/**
 * Processes a single next-step-guide job.
 * Logs the next step computation job and records activity. Real computation logic is added later.
 *
 * @param job - BullMQ job containing next step guide data
 */
async function processNextStepGuide(job: Job<NextStepGuideJobData>): Promise<void> {
  const { claimId, claimNumber, currentStatus, state } = job.data;

  logger.info(
    { jobId: job.id, claimId, claimNumber, currentStatus, state },
    `${QUEUE_NAME}.job.started`,
  );

  await AgentActivityModel.create({
    agentId: QUEUE_NAME,
    claimId: claimId || undefined,
    action: ACTION,
    result: 'success',
    details: { claimNumber, currentStatus, state },
  });

  logger.info({ jobId: job.id, claimId }, `${QUEUE_NAME}.job.completed`);
}

// ─── Worker initializer ───────────────────────────────────────────────────────

/**
 * Initializes the next-step-guide BullMQ worker.
 * Errors are caught and recorded as failed activity to avoid crashing the server.
 *
 * @param connection - BullMQ connection options
 */
export function init(connection: ConnectionOptions): Worker {
  const worker = new Worker<NextStepGuideJobData>(
    QUEUE_NAME,
    async (job) => {
      try {
        await processNextStepGuide(job);
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
