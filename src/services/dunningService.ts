import { AppDataSource } from '../config/database';
import { FailedPayment } from '../models/FailedPayment';
import { Customer } from '../models/Customer';
import { ChargebeeAccount } from '../models/ChargebeeAccount';
import { sendEmail } from '../config/email';
import { emailTemplateService } from './emailTemplateService';
import { logger } from '../config/logger';

const failedPaymentRepo = AppDataSource.getRepository(FailedPayment);
const customerRepo = AppDataSource.getRepository(Customer);
const chargebeeRepo = AppDataSource.getRepository(ChargebeeAccount);

export class DunningService {
  // Send hard decline dunning email
  async sendHardDeclineDunning(failedPaymentId: string): Promise<boolean> {
    try {
      const payment = await failedPaymentRepo.findOne({
        where: { id: failedPaymentId },
      });

      if (!payment) {
        logger.warn(`Failed payment not found: ${failedPaymentId}`);
        return false;
      }

      if (payment.failureType !== 'hard_decline') {
        logger.info(`Skipping dunning email for non-hard-decline: ${failedPaymentId}`);
        return false;
      }

      const customer = await customerRepo.findOne({
        where: { id: payment.customerId },
      });

      if (!customer) {
        logger.warn(`Customer not found: ${payment.customerId}`);
        return false;
      }

      const account = await chargebeeRepo.findOne({
        where: { id: payment.chargebeeAccountId },
      });

      if (!account) {
        logger.warn(`Account not found: ${payment.chargebeeAccountId}`);
        return false;
      }

      // Generate payment update URL (placeholder - will be implemented in next session)
      const updateCardUrl = this.generatePaymentUpdateUrl(
        account.id,
        customer.id,
        payment.id
      );

      // Get email template
      const template = emailTemplateService.getHardDeclineDunningEmail(
        customer.customerName || 'Valued Customer',
        customer.customerEmail,
        payment.chargebeeInvoiceId,
        payment.amount.toString(),
        payment.currency,
        updateCardUrl
      );

      // Send email
      const success = await sendEmail({
        to: customer.customerEmail,
        subject: template.subject,
        html: template.html,
      });

      if (success) {
        logger.info(`Dunning email sent for payment ${failedPaymentId}`);
      }

      return success;
    } catch (error) {
      logger.error(`Failed to send dunning email for ${failedPaymentId}:`, error);
      return false;
    }
  }

  // Send final notice before suspension
  async sendFinalNotice(failedPaymentId: string): Promise<boolean> {
    try {
      const payment = await failedPaymentRepo.findOne({
        where: { id: failedPaymentId },
      });

      if (!payment || payment.retryCount < 3) {
        return false;
      }

      const customer = await customerRepo.findOne({
        where: { id: payment.customerId },
      });

      if (!customer) {
        return false;
      }

      const account = await chargebeeRepo.findOne({
        where: { id: payment.chargebeeAccountId },
      });

      if (!account) {
        return false;
      }

      const updateCardUrl = this.generatePaymentUpdateUrl(
        account.id,
        customer.id,
        payment.id
      );

      const template = emailTemplateService.getFinalNoticeEmail(
        customer.customerName || 'Valued Customer',
        customer.customerEmail,
        payment.chargebeeInvoiceId,
        payment.amount.toString(),
        payment.currency,
        updateCardUrl
      );

      const success = await sendEmail({
        to: customer.customerEmail,
        subject: template.subject,
        html: template.html,
      });

      if (success) {
        logger.info(`Final notice sent for payment ${failedPaymentId}`);
      }

      return success;
    } catch (error) {
      logger.error(`Failed to send final notice for ${failedPaymentId}:`, error);
      return false;
    }
  }

  // Generate payment update URL (placeholder)
  private generatePaymentUpdateUrl(
    accountId: string,
    customerId: string,
    paymentId: string
  ): string {
    const baseUrl = process.env.APP_URL || 'https://recoverflow.com';
    const token = Buffer.from(
      `${accountId}:${customerId}:${paymentId}`
    ).toString('base64');
    return `${baseUrl}/update-payment?token=${token}`;
  }
}

export const dunningService = new DunningService();