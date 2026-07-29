import { logger } from '../config/logger';

export interface EmailTemplate {
  subject: string;
  html: string;
}

export class EmailTemplateService {
  private baseUrl = process.env.APP_URL || 'https://recoverflow.com';
  private companyName = 'RecoverFlow';
  private year = new Date().getFullYear();

  // Hard decline dunning email
  getHardDeclineDunningEmail(
    customerName: string,
    customerEmail: string,
    invoiceId: string,
    amount: string,
    currency: string,
    updateCardUrl: string
  ): EmailTemplate {
    const html = `<!DOCTYPE html>
<html>
  <head>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
      .content { margin: 20px 0; }
      .button { display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; }
      .footer { color: #666; font-size: 12px; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Payment Issue</h1>
      </div>

      <div class="content">
        <p>Hi ${customerName},</p>

        <p>We tried to process a payment of <strong>${currency} ${amount}</strong> for invoice ${invoiceId}, but it was declined by your card issuer.</p>

        <p><strong>To keep your service active, please update your payment method:</strong></p>

        <p>
          <a href="${updateCardUrl}" class="button">Update Payment Method</a>
        </p>

        <p>If you have questions, reply to this email or contact our support team.</p>

        <p>Thanks,<br/>The ${this.companyName} Team</p>
      </div>

      <div class="footer">
        <p>&copy; ${this.year} ${this.companyName}. All rights reserved.</p>
        <p>This email was sent to ${customerEmail}</p>
      </div>
    </div>
  </body>
</html>`;

    return {
      subject: 'Action Required: Update Your Payment Method',
      html,
    };
  }

  // Soft decline notification
  getSoftDeclineNotificationEmail(
    customerName: string,
    customerEmail: string,
    invoiceId: string,
    amount: string,
    currency: string
  ): EmailTemplate {
    const html = `<!DOCTYPE html>
<html>
  <head>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
      .content { margin: 20px 0; }
      .footer { color: #666; font-size: 12px; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Payment Retry Scheduled</h1>
      </div>

      <div class="content">
        <p>Hi ${customerName},</p>

        <p>A temporary issue prevented us from processing your payment of <strong>${currency} ${amount}</strong> (invoice ${invoiceId}).</p>

        <p>We will automatically retry this payment in 24 hours. If you would like to resolve this immediately, please update your payment method.</p>

        <p>Thanks,<br/>The ${this.companyName} Team</p>
      </div>

      <div class="footer">
        <p>&copy; ${this.year} ${this.companyName}. All rights reserved.</p>
        <p>This email was sent to ${customerEmail}</p>
      </div>
    </div>
  </body>
</html>`;

    return {
      subject: `Payment Retry Scheduled - ${currency} ${amount}`,
      html,
    };
  }

  // Final notice before suspension
  getFinalNoticeEmail(
    customerName: string,
    customerEmail: string,
    invoiceId: string,
    amount: string,
    currency: string,
    updateCardUrl: string
  ): EmailTemplate {
    const html = `<!DOCTYPE html>
<html>
  <head>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background-color: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ffc107; }
      .content { margin: 20px 0; }
      .button { display: inline-block; background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; }
      .footer { color: #666; font-size: 12px; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Final Notice</h1>
      </div>

      <div class="content">
        <p>Hi ${customerName},</p>

        <p>We have attempted to process your payment multiple times, but all retries have failed. Your account is at risk of suspension.</p>

        <p><strong>Outstanding Invoice:</strong> ${currency} ${amount} (${invoiceId})</p>

        <p><strong>Action Required:</strong> Update your payment method immediately to avoid service interruption.</p>

        <p>
          <a href="${updateCardUrl}" class="button">Update Payment Method Now</a>
        </p>

        <p>If you have questions or need assistance, reply to this email.</p>

        <p>Best regards,<br/>The ${this.companyName} Team</p>
      </div>

      <div class="footer">
        <p>&copy; ${this.year} ${this.companyName}. All rights reserved.</p>
        <p>This email was sent to ${customerEmail}</p>
      </div>
    </div>
  </body>
</html>`;

    return {
      subject: 'Final Notice: Update Payment Method to Avoid Suspension',
      html,
    };
  }
}

export const emailTemplateService = new EmailTemplateService();