import { retryQueue } from '../config/queue';
import { retryService } from '../services/retryService';
import { logger } from '../config/logger';

// Process retry jobs from the queue
retryQueue.process(async (job) => {
  try {
    logger.info(`Processing retry job: ${job.id}`);

    const { failedPaymentId, attemptNumber, chargebeeAccountId, chargebeeInvoiceId } = job.data;

    // Execute the retry
    await retryService.executeRetry(
      failedPaymentId,
      attemptNumber,
      chargebeeAccountId,
      chargebeeInvoiceId
    );

    return { success: true };
  } catch (error: any) {
    logger.error(`Job processing failed: ${job.id}`, error);
    throw error;
  }
});

logger.info('Retry job processor initialized');