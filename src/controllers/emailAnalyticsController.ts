import { Request, Response } from 'express';
import { emailAnalyticsService } from '../services/emailAnalyticsService';
import { AuthRequest } from '../middleware/auth';
import { UnauthorizedError } from '../types/errors';
import { logger } from '../config/logger';

export class EmailAnalyticsController {
  async getCampaignMetrics(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) {
        throw new UnauthorizedError('Not authenticated');
      }

      const metrics = await emailAnalyticsService.getCampaignMetrics();
      res.json(metrics);
    } catch (error: Error | unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to get campaign metrics: ${message}`);
      res.status(500).json({ error: message });
    }
  }

  async getMetricsByType(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) {
        throw new UnauthorizedError('Not authenticated');
      }

      const metrics = await emailAnalyticsService.getMetricsByEventType();
      res.json(metrics);
    } catch (error: Error | unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to get metrics by type: ${message}`);
      res.status(500).json({ error: message });
    }
  }
}

export const emailAnalyticsController = new EmailAnalyticsController();