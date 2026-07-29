import Queue from 'bull';
import { logger } from './logger';

// Job types
export interface RetryJobData {
  failedPaymentId: string;
  attemptNumber: number;
  chargebeeAccountId: string;
  chargebeeInvoiceId: string;
}

// Create retry queue
export const retryQueue = new Queue<RetryJobData>('payment-retries', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
  defaultJobOptions: {
    attempts: 1, // We handle retries ourselves, not Bull
    backoff: {
      type: 'fixed',
      delay: 0,
    },
    removeOnComplete: true,
  },
});

// Queue event handlers
retryQueue.on('completed', (job) => {
  logger.info(`Retry job completed: ${job.id}`);
});

retryQueue.on('failed', (job, err) => {
  logger.error(`Retry job failed: ${job.id}`, err);
});

retryQueue.on('error', (error) => {
  logger.error('Queue error:', error);
});

export async function scheduleRetry(
  failedPaymentId: string,
  attemptNumber: number,
  chargebeeAccountId: string,
  chargebeeInvoiceId: string,
  delayMs: number
): Promise<void> {
  const jobData: RetryJobData = {
    failedPaymentId,
    attemptNumber,
    chargebeeAccountId,
    chargebeeInvoiceId,
  };

  await retryQueue.add(jobData, {
    delay: delayMs,
    jobId: `${failedPaymentId}-attempt-${attemptNumber}`,
  });

  logger.info(
    `Retry scheduled: ${failedPaymentId} attempt ${attemptNumber} in ${delayMs / 1000 / 60 / 60} hours`
  );
}