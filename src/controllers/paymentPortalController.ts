import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { FailedPayment } from '../models/FailedPayment';
import { Customer } from '../models/Customer';
import { ValidationError } from '../types/errors';
import { logger } from '../config/logger';

const failedPaymentRepo = AppDataSource.getRepository(FailedPayment);
const customerRepo = AppDataSource.getRepository(Customer);

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

  // Portal page (placeholder for frontend)
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

      const customer = await customerRepo.findOne({
        where: { id: customerId },
      });

      if (!payment || !customer) {
        throw new ValidationError('Payment or customer not found');
      }

      // Return HTML page with payment update form
      const html = this.getPortalPageHTML(
        customer.customerName || 'Valued Customer',
        payment.amount.toString(),
        payment.currency,
        token as string
      );

      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error: Error | unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Portal page error: ${message}`);
      res.status(400).send(`<html><body><h1>Error</h1><p>${message}</p></body></html>`);
    }
  }

  // Handle payment update submission (placeholder)
  async updatePaymentMethod(req: Request, res: Response) {
    try {
      const { token, chargebeeCustomerId } = req.body;

      if (!token || !chargebeeCustomerId) {
        throw new ValidationError('Token and Chargebee customer ID required');
      }

      // Decode token
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const [accountId, customerId, paymentId] = decoded.split(':');

      if (!accountId || !customerId || !paymentId) {
        throw new ValidationError('Invalid token format');
      }

      logger.info(
        `Payment update requested for customer ${customerId}, payment ${paymentId}`
      );

      // TODO: Redirect to Chargebee's hosted payment page or integrate payment form
      res.json({
        success: true,
        message:
          'Payment update initiated. Redirecting to Chargebee payment portal...',
        chargebeeCustomerId,
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
    token: string
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
      .form-group { margin-bottom: 20px; }
      label { display: block; margin-bottom: 8px; font-weight: 500; }
      input, select { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
      button { width: 100%; padding: 12px; background: #007bff; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; }
      button:hover { background: #0056b3; }
      .note { color: #666; font-size: 12px; margin-top: 10px; }
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

      <form>
        <div class="form-group">
          <label for="cardName">Cardholder Name</label>
          <input type="text" id="cardName" name="cardName" required>
        </div>

        <div class="form-group">
          <label for="cardNumber">Card Number</label>
          <input type="text" id="cardNumber" name="cardNumber" placeholder="1234 5678 9012 3456" required>
        </div>

        <div class="form-group">
          <label for="expiry">Expiry Date</label>
          <input type="text" id="expiry" name="expiry" placeholder="MM/YY" required>
        </div>

        <div class="form-group">
          <label for="cvc">CVC</label>
          <input type="text" id="cvc" name="cvc" placeholder="123" required>
        </div>

        <button type="submit">Update Payment Method</button>
      </form>

      <p class="note">Your payment information is secure and encrypted.</p>
    </div>

    <script>
      document.querySelector('form').addEventListener('submit', async (e) => {
        e.preventDefault();
        // TODO: Call /payment-portal/update endpoint with form data
        alert('Payment update submitted. Redirecting to Chargebee...');
      });
    </script>
  </body>
</html>
    `;
  }
}

export const paymentPortalController = new PaymentPortalController();