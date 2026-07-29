import { AppDataSource } from '../config/database';
import { ChargebeeAccount } from '../models/ChargebeeAccount';
import { FailedPayment } from '../models/FailedPayment';
import { RetryAttempt } from '../models/RetryAttempt';
import { ChargebeeService } from './chargebeeService';
import { logger } from '../config/logger';

const chargebeeRepo = AppDataSource.getRepository(ChargebeeAccount);
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
    logger.info(
      `Initial retry scheduled for payment ${failedPaymentId} after ${
        delayMs / 1000 / 60 / 60
      } hours`
    );
  }

  // Execute a retry attempt (called by scheduler)
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

      // Get Chargebee account
      const account = await chargebeeRepo.findOne({
        where: { id: chargebeeAccountId },
      });

      if (!account) {
        throw new Error('Chargebee account not found');
      }

      // Call Chargebee API to retry payment
      const service = new ChargebeeService(account);
      const retryResult = await service.retryPayment(chargebeeInvoiceId);

      // Create retry attempt record
      const attempt = new RetryAttempt();
      attempt.failedPaymentId = failedPaymentId;
      attempt.attemptNumber = attemptNumber;
      attempt.attemptTime = new Date();
      attempt.gatewayUsed = 'chargebee';
      attempt.result = retryResult.result as any;

      await retryAttemptRepo.save(attempt);

      // Update payment
      payment.retryCount = attemptNumber;
      payment.lastRetryAt = new Date();

      // If retry succeeded, mark as recovered
      if (retryResult.success) {
        payment.status = 'recovered';
        payment.recoveredAt = new Date();
        logger.info(`Payment ${failedPaymentId} recovered on attempt ${attemptNumber}`);
      } else if (attemptNumber >= 3) {
        // After 3 attempts, mark as unrecovered
        payment.status = 'unrecovered';
        logger.info(`Payment ${failedPaymentId} marked unrecovered after 3 attempts`);
      }

      await failedPaymentRepo.save(payment);

      logger.info(
        `Retry attempt ${attemptNumber} completed for payment ${failedPaymentId}: ${retryResult.result}`
      );
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
      recoveredAt: payment.recoveredAt,
      attempts: payment.retryAttempts || [],
    };
  }
}

export const retryService = new RetryService();