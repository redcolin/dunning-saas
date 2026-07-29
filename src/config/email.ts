import sgMail from '@sendgrid/mail';
import { logger } from './logger';

const sendgridApiKey = process.env.SENDGRID_API_KEY;

if (!sendgridApiKey) {
  logger.warn('SENDGRID_API_KEY not set - email functionality disabled');
} else {
  sgMail.setApiKey(sendgridApiKey);
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    if (!sendgridApiKey) {
      logger.warn('SendGrid not configured, skipping email');
      return false;
    }

    const msg = {
      to: options.to,
      from: options.from || process.env.EMAIL_FROM || 'noreply@recoverflow.com',
      subject: options.subject,
      html: options.html,
      replyTo: options.replyTo,
    };

    await sgMail.send(msg);
    logger.info(`Email sent to ${options.to}: ${options.subject}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send email to ${options.to}:`, error);
    return false;
  }
}