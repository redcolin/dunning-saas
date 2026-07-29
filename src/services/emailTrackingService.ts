import { AppDataSource } from '../config/database';
import { logger } from '../config/logger';

export interface EmailTrackingEvent {
  type: 'open' | 'click';
  email: string;
  paymentId: string;
  timestamp: Date;
  userAgent?: string;
  ipAddress?: string;
}

export class EmailTrackingService {
  // Generate tracking pixel URL
  generateTrackingPixel(paymentId: string, email: string): string {
    const baseUrl = process.env.APP_URL || 'https://recoverflow.com';
    const token = Buffer.from(`${paymentId}:${email}`).toString('base64');
    return `${baseUrl}/email-tracking/open?token=${token}`;
  }

  // Generate tracked link for clicks
  generateTrackedLink(paymentId: string, email: string, targetUrl: string): string {
    const baseUrl = process.env.APP_URL || 'https://recoverflow.com';
    const data = Buffer.from(`${paymentId}:${email}:${targetUrl}`).toString('base64');
    return `${baseUrl}/email-tracking/click?token=${data}`;
  }

  // Log email open event
  async trackEmailOpen(
    paymentId: string,
    email: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<void> {
    try {
      logger.info(`Email opened: ${email} for payment ${paymentId}`);
      // TODO: Store in database for analytics
    } catch (error) {
      logger.error('Failed to track email open:', error);
    }
  }

  // Log email click event
  async trackEmailClick(
    paymentId: string,
    email: string,
    linkType: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<void> {
    try {
      logger.info(
        `Email link clicked: ${linkType} by ${email} for payment ${paymentId}`
      );
      // TODO: Store in database for analytics
    } catch (error) {
      logger.error('Failed to track email click:', error);
    }
  }
}

export const emailTrackingService = new EmailTrackingService();