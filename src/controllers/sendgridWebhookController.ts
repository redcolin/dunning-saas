import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Customer } from '../models/Customer';
import { EmailEvent } from '../models/EmailEvent';
import { logger } from '../config/logger';

const customerRepo = AppDataSource.getRepository(Customer);
const emailEventRepo = AppDataSource.getRepository(EmailEvent);

export class SendgridWebhookController {
  async handleSendGridWebhook(req: Request, res: Response) {
    try {
      const events = Array.isArray(req.body) ? req.body : [req.body];

      logger.info(`Received ${events.length} SendGrid webhook events`);

      for (const event of events) {
        await this.processEvent(event);
      }

      res.status(200).json({ success: true });
    } catch (error: Error | unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('SendGrid webhook error:', message);
      res.status(200).json({ success: true });
    }
  }

  private async processEvent(event: any): Promise<void> {
    try {
      const eventType = event.event;
      const email = event.email;

      if (!eventType || !email) {
        logger.warn('Invalid SendGrid event: missing event type or email');
        return;
      }

      const customer = await customerRepo.findOne({
        where: { customerEmail: email },
      });

      logger.info(`Processing SendGrid event: ${eventType} for ${email}`);

      switch (eventType) {
        case 'bounce':
          await this.handleBounce(email, event, customer);
          break;
        case 'complaint':
          await this.handleComplaint(email, event, customer);
          break;
        case 'unsubscribe':
          await this.handleUnsubscribe(email, customer);
          break;
        case 'delivered':
          await this.logEmailEvent(email, 'delivered', customer, event.sg_event_id);
          break;
        case 'open':
          await this.logEmailEvent(email, 'open', customer, event.sg_event_id);
          break;
        case 'click':
          await this.logEmailEvent(email, 'click', customer, event.sg_event_id);
          break;
        default:
          logger.debug(`Unhandled SendGrid event type: ${eventType}`);
      }
    } catch (error: Error | unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Error processing SendGrid event:', message);
    }
  }

  private async handleBounce(
    email: string,
    event: any,
    customer: Customer | null
  ): Promise<void> {
    const rawBounceType = event.bounce_type || 'undetermined';
    const bounceType = this.validateBounceType(rawBounceType);
    const bounceSubtype = event.bounce_subtype || 'unknown';
    const reason = `Bounce (${bounceType}): ${bounceSubtype}`;

    logger.info(`Email bounced: ${email} (${bounceType})`);

    await this.logEmailEvent(
      email,
      'bounce',
      customer,
      event.sg_event_id,
      bounceType,
      reason
    );

    if (bounceType === 'permanent' && customer) {
      customer.unsubscribed = true;
      customer.unsubscribeReason = `Permanent bounce: ${bounceSubtype}`;
      await customerRepo.save(customer);
      logger.info(`Customer ${customer.id} marked unsubscribed due to permanent bounce`);
    }
  }

  private async handleComplaint(
    email: string,
    event: any,
    customer: Customer | null
  ): Promise<void> {
    logger.warn(`Email complaint received: ${email}`);

    const reason = 'Spam complaint';
    await this.logEmailEvent(email, 'complaint', customer, event.sg_event_id, null, reason);

    if (customer) {
      customer.unsubscribed = true;
      customer.unsubscribeReason = 'Spam complaint';
      await customerRepo.save(customer);
      logger.info(`Customer ${customer.id} marked unsubscribed due to complaint`);
    }
  }

  private async handleUnsubscribe(email: string, customer: Customer | null): Promise<void> {
    logger.info(`Unsubscribe request: ${email}`);

    await this.logEmailEvent(email, 'unsubscribe', customer);

    if (customer) {
      customer.unsubscribed = true;
      customer.unsubscribeReason = 'User unsubscribed';
      await customerRepo.save(customer);
      logger.info(`Customer ${customer.id} unsubscribed`);
    }
  }

  private async logEmailEvent(
    email: string,
    eventType: string,
    customer: Customer | null,
    sendGridEventId?: string,
    bounceType?: 'permanent' | 'transient' | 'undetermined' | null,
    reason?: string
  ): Promise<void> {
    try {
      const emailEvent = new EmailEvent();
      emailEvent.email = email;
      emailEvent.eventType = eventType as any;
      emailEvent.customerId = customer?.id || null;
      emailEvent.sendGridEventId = sendGridEventId || null;
      emailEvent.bounceType = bounceType || null;
      emailEvent.reason = reason || null;

      await emailEventRepo.save(emailEvent);
      logger.debug(`Email event logged: ${eventType} for ${email}`);
    } catch (error: Error | unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to log email event: ${message}`);
    }
  }

  private validateBounceType(
    type: string
  ): 'permanent' | 'transient' | 'undetermined' {
    if (type === 'permanent' || type === 'transient') {
      return type;
    }
    return 'undetermined';
  }
}

export const sendgridWebhookController = new SendgridWebhookController();