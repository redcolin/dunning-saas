import { AppDataSource } from '../config/database';
import { FailedPayment } from '../models/FailedPayment';
import { RetryAttempt } from '../models/RetryAttempt';
import { ChargebeeService } from './chargebeeService';
import { scheduleRetry } from '../config/queue';
import { logger } from '../config/logger';

const failedPaymentRepo = AppDataSource.getRepository(FailedPayment);
const retryAttemptRepo = AppDataSource.getRepository(RetryAttempt);

export class RetryService {
  // Calculate delay in milliseconds based on attempt number
  getRetryDelayMs(attemptNumber: number): number {
    const delays: { [key: number]: number } = {
      1: 24 * 60 * 60 * 1000, // 24 hours
      2: 48 * 60 * 60 * 1000, // 48 hours (2 days)
      3: 72 * 60 * 60 * 1000, // 72 hours (3 days)
    };
    return delays[attemptNumber] || 0;
  }

  // Schedule initial retry for a failed payment
  async scheduleInitialRetry(failedPaymentId: string): Promise<void> {
    const payment = await failedPaymentRepo.findOne({
      where: { id: failedPaymentId },
    });

    if (!payment) {
      throw new Error('Failed payment not found');
    }

    // Only retry soft declines
    if (payment.failureType !== 'soft_decline') {
      logger.info(`Skipping retry for ${payment.failureType}: ${failedPaymentId}`);
      return;
    }

    // Schedule first retry attempt
    const delayMs = this.getRetryDelayMs(1);
    await scheduleRetry(
      failedPaymentId,
      1,
      payment.chargebeeAccountId,
      payment.chargebeeInvoiceId,
      delayMs
    );

    logger.info(`Initial retry scheduled for payment ${failedPaymentId}`);
  }

  // Execute a retry attempt (called by job queue)
  async executeRetry(
    failedPaymentId: string,
    attemptNumber: number,
    chargebeeAccountId: string,
    chargebeeInvoiceId: string
  ): Promise<void> {
    try {
      const payment = await failedPaymentRepo.findOne({
        where: { id: failedPaymentId },
      });

      if (!payment) {
        throw new Error('Failed payment not found');
      }

      // Create retry attempt record
      const attempt = new RetryAttempt();
      attempt.failedPaymentId = failedPaymentId;
      attempt.attemptNumber = attemptNumber;
      attempt.attemptTime = new Date();
      attempt.gatewayUsed = 'chargebee';
      attempt.result = 'success'; // TODO: implement actual retry

      await retryAttemptRepo.save(attempt);

      // Update payment
      payment.retryCount = attemptNumber;
      payment.lastRetryAt = new Date();

      // Schedule next retry if this one succeeds (in real implementation)
      // For now, just update the record
      await failedPaymentRepo.save(payment);

      logger.info(`Retry attempt ${attemptNumber} for payment ${failedPaymentId}`);
    } catch (error) {
      logger.error(`Retry failed for payment ${failedPaymentId}:`, error);
      throw error;
    }
  }

  // Get retry status for a payment
  async getRetryStatus(failedPaymentId: string): Promise<any> {
    const payment = await failedPaymentRepo.findOne({
      where: { id: failedPaymentId },
      relations: {
        retryAttempts: true,
        },
    });

    if (!payment) {
      throw new Error('Failed payment not found');
    }

    return {
      id: payment.id,
      status: payment.status,
      retryCount: payment.retryCount,
      failureType: payment.failureType,
      attempts: payment.retryAttempts || [],
    };
  }
}

export const retryService = new RetryService();