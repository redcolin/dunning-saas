import { AppDataSource } from '../config/database';
import { RetryPolicy } from '../models/RetryPolicy';
import { logger } from '../config/logger';

const retryPolicyRepo = AppDataSource.getRepository(RetryPolicy);

export class RetryPolicyService {
  async getOrCreateDefaultPolicy(chargebeeAccountId: string) {
    try {
      let policy = await retryPolicyRepo.findOne({
        where: { chargebeeAccountId },
      });

      if (!policy) {
        policy = retryPolicyRepo.create({
          chargebeeAccountId,
          strategy: 'standard',
          firstRetryHours: 24,
          secondRetryHours: 48,
          thirdRetryHours: 72,
          maxRetries: 3,
          enableExponentialBackoff: false,
          exponentialMultiplier: 1.5,
          enableCircuitBreaker: true,
          circuitBreakerThreshold: 5,
          circuitBreakerCooldownMinutes: 60,
        });
        await retryPolicyRepo.save(policy);
        logger.info(`Created default retry policy for account ${chargebeeAccountId}`);
      }

      return policy;
    } catch (error) {
      logger.error('Failed to get or create retry policy:', error);
      throw error;
    }
  }

  async updatePolicy(chargebeeAccountId: string, updates: Partial<RetryPolicy>) {
    try {
      let policy = await retryPolicyRepo.findOne({
        where: { chargebeeAccountId },
      });

      if (!policy) {
        policy = await this.getOrCreateDefaultPolicy(chargebeeAccountId);
      }

      await retryPolicyRepo.update(
        { chargebeeAccountId },
        updates
      );

      const updated = await retryPolicyRepo.findOne({
        where: { chargebeeAccountId },
      });

      logger.info(`Updated retry policy for account ${chargebeeAccountId}`);
      return updated;
    } catch (error) {
      logger.error('Failed to update retry policy:', error);
      throw error;
    }
  }

  async getPolicy(chargebeeAccountId: string) {
    try {
      return await this.getOrCreateDefaultPolicy(chargebeeAccountId);
    } catch (error) {
      logger.error('Failed to get retry policy:', error);
      throw error;
    }
  }

  calculateNextRetryTime(policy: RetryPolicy, attemptNumber: number): Date {
    const now = new Date();
    let delayHours = 24;

    if (attemptNumber === 1) {
      delayHours = policy.firstRetryHours;
    } else if (attemptNumber === 2) {
      delayHours = policy.secondRetryHours;
    } else if (attemptNumber === 3) {
      delayHours = policy.thirdRetryHours;
    }

    // Apply exponential backoff if enabled
    if (policy.enableExponentialBackoff) {
      delayHours = delayHours * Math.pow(policy.exponentialMultiplier, attemptNumber - 1);
    }

    const nextRetryTime = new Date(now.getTime() + delayHours * 60 * 60 * 1000);
    return nextRetryTime;
  }

  shouldBreakCircuit(failureCount: number, policy: RetryPolicy): boolean {
    if (!policy.enableCircuitBreaker) {
      return false;
    }
    return failureCount >= policy.circuitBreakerThreshold;
  }
}

export const retryPolicyService = new RetryPolicyService();