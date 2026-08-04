import { Request, Response } from 'express';
import { retryPolicyService } from '../services/retryPolicyService';
import { AuthRequest } from '../middleware/auth';
import { UnauthorizedError } from '../types/errors';
import { logger } from '../config/logger';
import { AppDataSource } from '../config/database';
import { ChargebeeAccount } from '../models/ChargebeeAccount';

const chargebeeAccountRepo = AppDataSource.getRepository(ChargebeeAccount);

export class RetryPolicyController {
  async getPolicy(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) {
        throw new UnauthorizedError('Not authenticated');
      }

      const account = await chargebeeAccountRepo.findOne({
        where: { userId: req.userId },
      });

      if (!account) {
        return res.status(404).json({ error: 'Chargebee account not found' });
      }

      const policy = await retryPolicyService.getPolicy(account.id);
      res.json(policy);
    } catch (error: Error | unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to get retry policy: ${message}`);
      res.status(500).json({ error: message });
    }
  }

  async updatePolicy(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) {
        throw new UnauthorizedError('Not authenticated');
      }

      const account = await chargebeeAccountRepo.findOne({
        where: { userId: req.userId },
      });

      if (!account) {
        return res.status(404).json({ error: 'Chargebee account not found' });
      }

      const {
        strategy,
        firstRetryHours,
        secondRetryHours,
        thirdRetryHours,
        maxRetries,
        enableExponentialBackoff,
        exponentialMultiplier,
        enableCircuitBreaker,
        circuitBreakerThreshold,
        circuitBreakerCooldownMinutes,
      } = req.body;

      const policy = await retryPolicyService.updatePolicy(account.id, {
        strategy,
        firstRetryHours,
        secondRetryHours,
        thirdRetryHours,
        maxRetries,
        enableExponentialBackoff,
        exponentialMultiplier,
        enableCircuitBreaker,
        circuitBreakerThreshold,
        circuitBreakerCooldownMinutes,
      });

      res.json(policy);
    } catch (error: Error | unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to update retry policy: ${message}`);
      res.status(500).json({ error: message });
    }
  }
}

export const retryPolicyController = new RetryPolicyController();