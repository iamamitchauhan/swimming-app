import { Worker, Job, ConnectionOptions } from 'bullmq';
import { AgentActivityModel } from '../agents.schema';
import { createLogger } from '../../../shared/utils/logger';

const QUEUE_NAME = 'claim-routing';
const ACTION = 'CLAIM_ROUTED';

const logger = createLogger(process.env['NODE_ENV']);

// ─── Job data type ────────────────────────────────────────────────────────────

interface ClaimRoutingJobData {
  claimId: string;
  claimNumber: string;
  state: string;
  firmId: string;
}

// ─── Job processor ────────────────────────────────────────────────────────────

/**
 * Processes a single claim-routing job.
 * Logs the routing job and records activity. Real routing logic is added later.
 *
 * @param job - BullMQ job containing claim routing data
 */
async function processClaimRouting(job: Job<ClaimRoutingJobData>): Promise<void> {
  const { claimId, claimNumber, state, firmId } = job.data;

  logger.info({ jobId: job.id, claimId, claimNumber, state, firmId }, `${QUEUE_NAME}.job.started`);

  await AgentActivityModel.create({
    agentId: QUEUE_NAME,
    claimId: claimId || undefined,
    action: ACTION,
    result: 'success',
    details: { claimNumber, state, firmId },
  });

  logger.info({ jobId: job.id, claimId }, `${QUEUE_NAME}.job.completed`);
}

// ─── Worker initializer ───────────────────────────────────────────────────────

/**
 * Initializes the claim-routing BullMQ worker.
 * Errors are caught and recorded as failed activity to avoid crashing the server.
 *
 * @param connection - BullMQ connection options
 */
export function init(connection: ConnectionOptions): Worker {
  const worker = new Worker<ClaimRoutingJobData>(
    QUEUE_NAME,
    async (job) => {
      try {
        await processClaimRouting(job);
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
