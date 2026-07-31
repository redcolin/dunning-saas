import { AppDataSource } from '../config/database';
import { FailedPayment } from '../models/FailedPayment';
import { Customer } from '../models/Customer';
import { sendEmail } from '../config/email';
import { emailTemplateService } from './emailTemplateService';
import { logger } from '../config/logger';

const failedPaymentRepo = AppDataSource.getRepository(FailedPayment);
const customerRepo = AppDataSource.getRepository(Customer);

export class SoftDeclineEmailService {
  // Send immediate soft decline notification
  async sendSoftDeclineNotification(failedPaymentId: string): Promise<boolean> {
    try {
      const payment = await failedPaymentRepo.findOne({
        where: { id: failedPaymentId },
      });

      if (!payment) {
        logger.warn(`Failed payment not found: ${failedPaymentId}`);
        return false;
      }

      if (payment.failureType !== 'soft_decline') {
        logger.info(`Skipping soft decline email for non-soft-decline: ${failedPaymentId}`);
        return false;
      }

      const customer = await customerRepo.findOne({
        where: { id: payment.customerId },
      });

      if (!customer) {
        logger.warn(`Customer not found: ${payment.customerId}`);
        return false;
      }

      const template = emailTemplateService.getSoftDeclineFirstNoticeEmail(
        customer.customerName || 'Valued Customer',
        customer.customerEmail,
        payment.chargebeeInvoiceId,
        payment.amount.toString(),
        payment.currency
      );

      const success = await sendEmail({
        to: customer.customerEmail,
        subject: template.subject,
        html: template.html,
      });

      if (success) {
        logger.info(`Soft decline notification sent for payment ${failedPaymentId}`);
      }

      return success;
    } catch (error: Error | unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to send soft decline notification for ${failedPaymentId}: ${message}`);
      return false;
    }
  }

  // Send retry update email (called by scheduler on retry attempts)
  async sendRetryUpdateEmail(failedPaymentId: string, attemptNumber: number): Promise<boolean> {
    try {
      const payment = await failedPaymentRepo.findOne({
        where: { id: failedPaymentId },
      });

      if (!payment || attemptNumber < 2) {
        return false;
      }

      const customer = await customerRepo.findOne({
        where: { id: payment.customerId },
      });

      if (!customer) {
        return false;
      }

      // Choose template based on attempt number
      let template;
      if (attemptNumber === 2) {
        template = emailTemplateService.getSoftDeclineRetry2UpdateEmail(
          customer.customerName || 'Valued Customer',
          customer.customerEmail,
          payment.chargebeeInvoiceId,
          payment.amount.toString(),
          payment.currency,
          attemptNumber
        );
      } else if (attemptNumber === 3) {
        template = emailTemplateService.getSoftDeclineFinalAttemptEmail(
          customer.customerName || 'Valued Customer',
          customer.customerEmail,
          payment.chargebeeInvoiceId,
          payment.amount.toString(),
          payment.currency
        );
      } else {
        return false;
      }

      const success = await sendEmail({
        to: customer.customerEmail,
        subject: template.subject,
        html: template.html,
      });

      if (success) {
        logger.info(
          `Retry update email sent for payment ${failedPaymentId}, attempt ${attemptNumber}`
        );
      }

      return success;
    } catch (error: Error | unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to send retry update email for ${failedPaymentId}: ${message}`);
      return false;
    }
  }
}

export const softDeclineEmailService = new SoftDeclineEmailService();