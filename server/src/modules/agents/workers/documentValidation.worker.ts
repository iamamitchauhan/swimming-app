import { Worker, Job, ConnectionOptions } from 'bullmq';
import { AgentActivityModel } from '../agents.schema';
import { createLogger } from '../../../shared/utils/logger';

const QUEUE_NAME = 'document-validation';
const ACTION = 'DOCUMENTS_VALIDATED';

const logger = createLogger(process.env['NODE_ENV']);

// ─── Job data type ────────────────────────────────────────────────────────────

interface DocumentValidationJobData {
  claimId: string;
  claimNumber: string;
  state: string;
  documents: Array<{ name: string; type: string }>;
}

// ─── Job processor ────────────────────────────────────────────────────────────

/**
 * Processes a single document-validation job.
 * Logs the validation job and records activity. Real validation logic is added later.
 *
 * @param job - BullMQ job containing document validation data
 */
async function processDocumentValidation(job: Job<DocumentValidationJobData>): Promise<void> {
  const { claimId, claimNumber, state, documents } = job.data;

  logger.info(
    { jobId: job.id, claimId, claimNumber, state, documentCount: documents.length },
    `${QUEUE_NAME}.job.started`,
  );

  await AgentActivityModel.create({
    agentId: QUEUE_NAME,
    claimId: claimId || undefined,
    action: ACTION,
    result: 'success',
    details: { claimNumber, state, documents },
  });

  logger.info({ jobId: job.id, claimId }, `${QUEUE_NAME}.job.completed`);
}

// ─── Worker initializer ───────────────────────────────────────────────────────

/**
 * Initializes the document-validation BullMQ worker.
 * Errors are caught and recorded as failed activity to avoid crashing the server.
 *
 * @param connection - BullMQ connection options
 */
export function init(connection: ConnectionOptions): Worker {
  const worker = new Worker<DocumentValidationJobData>(
    QUEUE_NAME,
    async (job) => {
      try {
        await processDocumentValidation(job);
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
