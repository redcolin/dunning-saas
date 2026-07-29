import { AppDataSource } from '../config/database';
import { FailedPayment } from '../models/FailedPayment';
import { RetryAttempt } from '../models/RetryAttempt';
import { logger } from '../config/logger';

const failedPaymentRepo = AppDataSource.getRepository(FailedPayment);
const retryAttemptRepo = AppDataSource.getRepository(RetryAttempt);

export class SchedulerService {
  private isRunning = false;
  private checkIntervalMs = 60 * 1000; // Check every 60 seconds

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info('Scheduler started');
    this.runCheck();
  }

  stop(): void {
    this.isRunning = false;
    logger.info('Scheduler stopped');
  }

  private async runCheck(): Promise<void> {
    if (!this.isRunning) return;

    try {
      // Find failed payments that need retry
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const nextRetryTime = new Date(now.getTime() - 5 * 60 * 1000); // 5 min buffer

      const paymentsToRetry = await failedPaymentRepo
        .createQueryBuilder('fp')
        .where('fp.status = :status', { status: 'pending_retry' })
        .andWhere('fp.retry_count < :maxRetries', { maxRetries: 3 })
        .andWhere(
          '(fp.last_retry_at IS NULL AND fp.first_attempt_at < :twentyFourHoursAgo) OR (fp.last_retry_at < :nextRetryTime)',
          {
            twentyFourHoursAgo,
            nextRetryTime,
          }
        )
        .limit(10)
        .getMany();

      for (const payment of paymentsToRetry) {
        await this.executeRetry(payment);
      }
    } catch (error) {
      logger.error('Scheduler check error:', error);
    }

    // Schedule next check
    setTimeout(() => this.runCheck(), this.checkIntervalMs);
  }

  private async executeRetry(payment: FailedPayment): Promise<void> {
    try {
      const attemptNumber = payment.retryCount + 1;

      logger.info(
        `Executing retry attempt ${attemptNumber} for payment ${payment.id}`
      );

      // Create retry attempt record
      const attempt = new RetryAttempt();
      attempt.failedPaymentId = payment.id;
      attempt.attemptNumber = attemptNumber;
      attempt.attemptTime = new Date();
      attempt.gatewayUsed = 'chargebee';
      attempt.result = 'success'; // TODO: implement actual Chargebee retry call

      await retryAttemptRepo.save(attempt);

      // Update payment
      payment.retryCount = attemptNumber;
      payment.lastRetryAt = new Date();

      // TODO: Check if payment actually succeeded
      // For now, mark as recovered after 3 attempts
      if (attemptNumber >= 3) {
        payment.status = 'unrecovered';
        logger.info(`Payment ${payment.id} marked unrecovered after 3 attempts`);
      }

      await failedPaymentRepo.save(payment);

      logger.info(
        `Retry attempt ${attemptNumber} completed for payment ${payment.id}`
      );
    } catch (error) {
      logger.error(
        `Retry execution failed for payment ${payment.id}:`,
        error
      );
    }
  }
}

export const schedulerService = new SchedulerService();