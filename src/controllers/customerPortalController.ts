import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Customer } from '../models/Customer';
import { FailedPayment } from '../models/FailedPayment';
import { RetryAttempt } from '../models/RetryAttempt';
import { logger } from '../config/logger';

const customerRepo = AppDataSource.getRepository(Customer);
const failedPaymentRepo = AppDataSource.getRepository(FailedPayment);
const retryAttemptRepo = AppDataSource.getRepository(RetryAttempt);

export class CustomerPortalController {
  async getCustomerFailedPayments(req: Request, res: Response) {
    try {
      const { customerId } = req.params;
      const tokenParam = Array.isArray(req.query.token) ? req.query.token[0] : (req.query.token as string);

      if (!tokenParam) {
        return res.status(401).json({ error: 'Invalid or missing token' });
      }

      // Verify token format: base64(customerId:chargebeeAccountId)
      let decodedCustomerId: string;
      try {
        const decoded = Buffer.from(tokenParam, 'base64').toString('utf-8');
        const parts = decoded.split(':');
        decodedCustomerId = parts[0];

        if (decodedCustomerId !== customerId) {
          return res.status(401).json({ error: 'Unauthorized' });
        }
      } catch {
        return res.status(401).json({ error: 'Invalid token' });
      }

      const customer = await customerRepo.findOne({
        where: { id: customerId },
      });

      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      const failedPayments = await failedPaymentRepo.find({
        where: { customerId },
        order: { createdAt: 'DESC' },
      });

      const paymentsWithRetries = await Promise.all(
        failedPayments.map(async (payment) => {
          const attempts = await retryAttemptRepo.find({
            where: { failedPaymentId: payment.id },
            order: { attemptNumber: 'ASC' },
          });
          return { ...payment, attempts };
        })
      );

      res.json({
        customer: {
          id: customer.id,
          name: customer.customerName,
          email: customer.customerEmail,
        },
        failedPayments: paymentsWithRetries,
        summary: {
          total: failedPayments.length,
          recovered: failedPayments.filter((p) => p.status === 'recovered').length,
          pending: failedPayments.filter((p) => p.status === 'pending_retry').length,
          unrecovered: failedPayments.filter((p) => p.status === 'unrecovered').length,
        },
      });
    } catch (error: any) {
      logger.error(`Failed to get customer failed payments: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }

  async getPaymentDetails(req: Request, res: Response) {
    try {
      const { customerId, paymentId } = req.params;
      const tokenParam = Array.isArray(req.query.token) ? req.query.token[0] : (req.query.token as string);

      if (!tokenParam) {
        return res.status(401).json({ error: 'Invalid or missing token' });
      }

      let decodedCustomerId: string;
      try {
        const decoded = Buffer.from(tokenParam, 'base64').toString('utf-8');
        const parts = decoded.split(':');
        decodedCustomerId = parts[0];

        if (decodedCustomerId !== customerId) {
          return res.status(401).json({ error: 'Unauthorized' });
        }
      } catch {
        return res.status(401).json({ error: 'Invalid token' });
      }

      const payment = await failedPaymentRepo.findOne({
        where: { id: paymentId, customerId },
      });

      if (!payment) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      const attempts = await retryAttemptRepo.find({
        where: { failedPaymentId: paymentId },
        order: { attemptNumber: 'ASC' },
      });

      res.json({
        payment,
        attempts,
      });
    } catch (error: any) {
      logger.error(`Failed to get payment details: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }
}

export const customerPortalController = new CustomerPortalController();