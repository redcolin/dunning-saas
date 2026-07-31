import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { ChargebeeAccount } from '../models/ChargebeeAccount';
import { Customer } from '../models/Customer';
import { FailedPayment } from '../models/FailedPayment';
import { ValidationError } from '../types/errors';
import { logger } from '../config/logger';

const chargebeeRepo = AppDataSource.getRepository(ChargebeeAccount);
const customerRepo = AppDataSource.getRepository(Customer);
const failedPaymentRepo = AppDataSource.getRepository(FailedPayment);

export class WebhookController {
  async handleChargebeeWebhook(req: Request, res: Response) {
    try {
      const { event_type, content } = req.body;

      if (!event_type || !content) {
        throw new ValidationError('Missing event_type or content');
      }

      logger.info(`Received webhook event: ${event_type}`);

      // Handle payment failed events
      if (event_type === 'payment_failed' || event_type === 'invoice_payment_failed') {
        await this.handlePaymentFailed(content);
      }

      // Chargebee expects a 200 response
      res.status(200).json({ success: true });
    } catch (error: Error | unknown) {
      logger.error('Webhook processing error:', error);
      res.status(200).json({ success: true }); // Still return 200 to prevent retries
    }
  }

  private async handlePaymentFailed(content: any) {
    try {
      const invoice = content.invoice;
      const customer = content.customer;

      if (!invoice || !customer) {
        logger.warn('Webhook missing invoice or customer data');
        return;
      }

      const localCustomer = await customerRepo.findOne({
        where: { chargebeeCustomerId: customer.id },
      });

      if (!localCustomer) {
        logger.warn(`Customer not found: ${customer.id}`);
        return;
      }

      // Check if this failed payment already exists
      const existing = await failedPaymentRepo.findOne({
        where: {
          chargebeeInvoiceId: invoice.id,
        },
      });

      if (existing) {
        logger.info(`Failed payment already logged: ${invoice.id}`);
        return;
      }

      // Create failed payment record
      const failedPayment = new FailedPayment();
      failedPayment.customerId = localCustomer.id;
      failedPayment.chargebeeAccountId = localCustomer.chargebeeAccountId;
      failedPayment.chargebeeInvoiceId = invoice.id;
      failedPayment.amount = invoice.amount_due ? invoice.amount_due / 100 : 0;
      failedPayment.currency = invoice.currency_code || 'USD';
      failedPayment.declineCode = invoice.payment_method?.decline_error_code || 'unknown';
      failedPayment.declineReasonUser = this.getDeclineReason(invoice);
      failedPayment.failureType = this.getFailureType(invoice);
      failedPayment.firstAttemptAt = new Date(invoice.date * 1000);
      failedPayment.status = 'pending_retry';
      failedPayment.retryCount = 0;

      await failedPaymentRepo.save(failedPayment);

      // Update customer failed payment count
      localCustomer.failedPaymentCount += 1;
      localCustomer.lastPaymentAttemptAt = new Date();
      await customerRepo.save(localCustomer);

      logger.info(
        `Failed payment created: ${failedPayment.id} for customer ${localCustomer.chargebeeCustomerId}`
      );

      // Send dunning email if hard decline
      if (failedPayment.failureType === 'hard_decline') {
        try {
          const { dunningService } = await import('../services/dunningService.js');
          await dunningService.sendHardDeclineDunning(failedPayment.id);
        } catch (emailError: Error | unknown) {
          const message = emailError instanceof Error ? emailError.message : String(emailError);
          logger.error(`Failed to send dunning email: ${message}`);
        }
      }

      // Send notification email if soft decline
      if (failedPayment.failureType === 'soft_decline') {
        try {
          const { softDeclineEmailService } = await import('../services/softDeclineEmailService.js');
          await softDeclineEmailService.sendSoftDeclineNotification(failedPayment.id);
        } catch (emailError: Error | unknown) {
          const message = emailError instanceof Error ? emailError.message : String(emailError);
          logger.error(`Failed to send soft decline email: ${message}`);
        }
      }
    } catch (error: Error | unknown) {
      logger.error('Error handling payment failed event:', error);
      throw error;
    }
  }

  private getFailureType(
    invoice: any
  ): 'soft_decline' | 'hard_decline' | 'data_quality' | 'unknown' {
    const code = invoice.payment_method?.decline_error_code || '';

    if (
      code.includes('insufficient_funds') ||
      code.includes('lost_card') ||
      code.includes('stolen_card') ||
      code.includes('expired_card') ||
      code.includes('contact_issuer')
    ) {
      return 'soft_decline';
    }

    if (
      code.includes('card_declined') ||
      code.includes('do_not_honor') ||
      code.includes('no_account') ||
      code.includes('account_closed')
    ) {
      return 'hard_decline';
    }

    if (code.includes('invalid') || code.includes('processing_error')) {
      return 'data_quality';
    }

    return 'unknown';
  }

  private getDeclineReason(invoice: any): string | null {
    const reason = invoice.payment_method?.decline_reason;
    if (!reason) return null;

    const reasonMap: { [key: string]: string } = {
      insufficient_funds: 'Insufficient funds in account',
      lost_card: 'Card reported as lost',
      stolen_card: 'Card reported as stolen',
      expired_card: 'Card has expired',
      contact_issuer: 'Please contact your card issuer',
      card_declined: 'Card was declined',
      do_not_honor: 'Card issuer declined the transaction',
      no_account: 'Account does not exist',
      account_closed: 'Account has been closed',
      invalid_data: 'Invalid card data',
      processing_error: 'Processing error occurred',
    };

    return reasonMap[reason] || reason;
  }
}

export const webhookController = new WebhookController();