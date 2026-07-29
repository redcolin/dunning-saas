import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { FailedPayment } from '../models/FailedPayment';
import { Customer } from '../models/Customer';
import { ChargebeeAccount } from '../models/ChargebeeAccount';
import { ValidationError } from '../types/errors';
import { logger } from '../config/logger';

const failedPaymentRepo = AppDataSource.getRepository(FailedPayment);
const customerRepo = AppDataSource.getRepository(Customer);
const chargebeeRepo = AppDataSource.getRepository(ChargebeeAccount);

export class PaymentPortalController {
  // Validate and get payment details from token
  async getPaymentDetails(req: Request, res: Response) {
    try {
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        throw new ValidationError('Invalid or missing token');
      }

      // Decode token: base64(accountId:customerId:paymentId)
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const [accountId, customerId, paymentId] = decoded.split(':');

      if (!accountId || !customerId || !paymentId) {
        throw new ValidationError('Invalid token format');
      }

      const payment = await failedPaymentRepo.findOne({
        where: { id: paymentId },
      });

      if (!payment) {
        throw new ValidationError('Payment not found');
      }

      const customer = await customerRepo.findOne({
        where: { id: customerId },
      });

      if (!customer) {
        throw new ValidationError('Customer not found');
      }

      res.json({
        paymentId: payment.id,
        customerId: customer.id,
        customerName: customer.customerName,
        invoiceId: payment.chargebeeInvoiceId,
        amount: payment.amount,
        currency: payment.currency,
        declineReason: payment.declineReasonUser,
        status: payment.status,
        retryCount: payment.retryCount,
      });
    } catch (error: Error | unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Payment portal error: ${message}`);
      res.status(400).json({ error: message });
    }
  }

  // Portal page (redirect to Chargebee)
  async getPortalPage(req: Request, res: Response) {
    try {
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        throw new ValidationError('Invalid or missing token');
      }

      // Decode and validate token
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const [accountId, customerId, paymentId] = decoded.split(':');

      if (!accountId || !customerId || !paymentId) {
        throw new ValidationError('Invalid token format');
      }

      const payment = await failedPaymentRepo.findOne({
        where: { id: paymentId },
      });

      if (!payment) {
        throw new ValidationError('Payment not found');
      }

      const customer = await customerRepo.findOne({
        where: { id: customerId },
      });

      if (!customer) {
        throw new ValidationError('Customer not found');
      }

      const account = await chargebeeRepo.findOne({
        where: { id: payment.chargebeeAccountId },
      });

      if (!account) {
        throw new ValidationError('Chargebee account not found');
      }

      // Generate Chargebee hosted payment page URL
      // Note: cbp_xxxx is a placeholder - in production, get this from Chargebee account settings
      const chargebeePaymentPageUrl = `https://${account.chargebeeSiteUrl}/pages/v3/cbp_xxxx?c_customer_id=${customer.chargebeeCustomerId}`;

      logger.info(
        `Generating payment portal for customer ${customerId}, payment ${paymentId}`
      );

      // Return HTML page with redirect
      const html = this.getPortalPageHTML(
        customer.customerName || 'Valued Customer',
        payment.amount.toString(),
        payment.currency,
        chargebeePaymentPageUrl
      );

      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error: Error | unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Portal page error: ${message}`);
      res.status(400).send(
        `<html><body><h1>Error</h1><p>${message}</p></body></html>`
      );
    }
  }

  // Handle payment update submission
  async updatePaymentMethod(req: Request, res: Response) {
    try {
      const { token } = req.body;

      if (!token || typeof token !== 'string') {
        throw new ValidationError('Token required');
      }

      // Decode token
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const [accountId, customerId, paymentId] = decoded.split(':');

      if (!accountId || !customerId || !paymentId) {
        throw new ValidationError('Invalid token format');
      }

      const payment = await failedPaymentRepo.findOne({
        where: { id: paymentId },
      });

      if (!payment) {
        throw new ValidationError('Payment not found');
      }

      const customer = await customerRepo.findOne({
        where: { id: customerId },
      });

      if (!customer) {
        throw new ValidationError('Customer not found');
      }

      const account = await chargebeeRepo.findOne({
        where: { id: payment.chargebeeAccountId },
      });

      if (!account) {
        throw new ValidationError('Chargebee account not found');
      }

      // Generate Chargebee hosted payment page URL
      const chargebeePaymentPageUrl = `https://${account.chargebeeSiteUrl}/pages/v3/cbp_xxxx?c_customer_id=${customer.chargebeeCustomerId}`;

      logger.info(
        `Payment update requested for customer ${customerId}, payment ${paymentId}, redirecting to Chargebee`
      );

      res.json({
        success: true,
        message: 'Redirecting to Chargebee payment portal...',
        redirectUrl: chargebeePaymentPageUrl,
        chargebeeCustomerId: customer.chargebeeCustomerId,
      });
    } catch (error: Error | unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Payment update error: ${message}`);
      res.status(400).json({ error: message });
    }
  }

  private getPortalPageHTML(
    customerName: string,
    amount: string,
    currency: string,
    chargebeePaymentPageUrl: string
  ): string {
    return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Update Payment Method - RecoverFlow</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
      .container { max-width: 500px; margin: 40px auto; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
      h1 { color: #007bff; margin-bottom: 20px; }
      .amount-box { background: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
      .amount-box p { color: #666; }
      .amount { font-size: 24px; font-weight: bold; color: #333; }
      .button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; cursor: pointer; text-align: center; width: 100%; }
      .button:hover { background: #0056b3; }
      .note { color: #666; font-size: 12px; margin-top: 10px; }
      .loading { text-align: center; }
      .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #007bff; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 20px auto; }
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Update Payment Method</h1>
      
      <div class="amount-box">
        <p>Outstanding Amount:</p>
        <div class="amount">${currency} ${amount}</div>
      </div>

      <p>Hi ${customerName},</p>
      <p>Please update your payment method to process your outstanding payment.</p>

      <div class="loading">
        <div class="spinner"></div>
        <p>Redirecting to secure payment portal...</p>
      </div>

      <a href="${chargebeePaymentPageUrl}" class="button">Click here if not redirected automatically</a>

      <p class="note">You will be redirected to our secure payment processor (Chargebee).</p>
    </div>

    <script>
      // Auto-redirect to Chargebee
      window.location.href = '${chargebeePaymentPageUrl}';
    </script>
  </body>
</html>
    `;
  }
}

export const paymentPortalController = new PaymentPortalController();