import { AppDataSource } from '../config/database';
import { EmailEvent } from '../models/EmailEvent';
import { logger } from '../config/logger';

const emailEventRepo = AppDataSource.getRepository(EmailEvent);

export class EmailAnalyticsService {
  async getCampaignMetrics() {
    try {
      const totalSent = await emailEventRepo
        .createQueryBuilder('email')
        .where('email.eventType = :type', { type: 'delivered' })
        .getCount();

      const totalOpens = await emailEventRepo
        .createQueryBuilder('email')
        .where('email.eventType = :type', { type: 'open' })
        .getCount();

      const totalClicks = await emailEventRepo
        .createQueryBuilder('email')
        .where('email.eventType = :type', { type: 'click' })
        .getCount();

      const totalBounces = await emailEventRepo
        .createQueryBuilder('email')
        .where('email.eventType = :type', { type: 'bounce' })
        .getCount();

      const totalComplaints = await emailEventRepo
        .createQueryBuilder('email')
        .where('email.eventType = :type', { type: 'complaint' })
        .getCount();

      const totalUnsubscribes = await emailEventRepo
        .createQueryBuilder('email')
        .where('email.eventType = :type', { type: 'unsubscribe' })
        .getCount();

      const openRate = totalSent > 0 ? ((totalOpens / totalSent) * 100).toFixed(2) : '0.00';
      const clickRate = totalSent > 0 ? ((totalClicks / totalSent) * 100).toFixed(2) : '0.00';
      const bounceRate = totalSent > 0 ? ((totalBounces / totalSent) * 100).toFixed(2) : '0.00';

      logger.info('Email analytics calculated');

      return {
        totalSent,
        totalOpens,
        totalClicks,
        totalBounces,
        totalComplaints,
        totalUnsubscribes,
        openRate,
        clickRate,
        bounceRate,
      };
    } catch (error) {
      logger.error('Failed to calculate email analytics:', error);
      throw error;
    }
  }

  async getMetricsByEventType() {
    try {
      const metrics = await emailEventRepo
        .createQueryBuilder('email')
        .select('email.eventType', 'eventType')
        .addSelect('COUNT(*)', 'count')
        .groupBy('email.eventType')
        .getRawMany();

      return metrics;
    } catch (error) {
      logger.error('Failed to get metrics by event type:', error);
      throw error;
    }
  }
}

export const emailAnalyticsService = new EmailAnalyticsService();