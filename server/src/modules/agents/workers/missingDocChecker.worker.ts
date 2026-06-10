import { Worker, Job, ConnectionOptions } from 'bullmq';
import { AgentActivityModel } from '../agents.schema';
import { createLogger } from '../../../shared/utils/logger';

const QUEUE_NAME = 'missing-doc-checker';
const ACTION = 'MISSING_DOCS_CHECKED';

const logger = createLogger(process.env['NODE_ENV']);

// ─── Job data type ────────────────────────────────────────────────────────────

interface MissingDocCheckerJobData {
  claimId: string;
  claimNumber: string;
  state: string;
  existingDocuments: string[];
}

// ─── Job processor ────────────────────────────────────────────────────────────

/**
 * Processes a single missing-doc-checker job.
 * Logs the missing doc check job and records activity. Real check logic is added later.
 *
 * @param job - BullMQ job containing missing document checker data
 */
async function processMissingDocChecker(job: Job<MissingDocCheckerJobData>): Promise<void> {
  const { claimId, claimNumber, state, existingDocuments } = job.data;

  logger.info(
    { jobId: job.id, claimId, claimNumber, state, existingDocumentCount: existingDocuments.length },
    `${QUEUE_NAME}.job.started`,
  );

  await AgentActivityModel.create({
    agentId: QUEUE_NAME,
    claimId: claimId || undefined,
    action: ACTION,
    result: 'success',
    details: { claimNumber, state, existingDocuments },
  });

  logger.info({ jobId: job.id, claimId }, `${QUEUE_NAME}.job.completed`);
}

// ─── Worker initializer ───────────────────────────────────────────────────────

/**
 * Initializes the missing-doc-checker BullMQ worker.
 * Errors are caught and recorded as failed activity to avoid crashing the server.
 *
 * @param connection - BullMQ connection options
 */
export function init(connection: ConnectionOptions): Worker {
  const worker = new Worker<MissingDocCheckerJobData>(
    QUEUE_NAME,
    async (job) => {
      try {
        await processMissingDocChecker(job);
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
