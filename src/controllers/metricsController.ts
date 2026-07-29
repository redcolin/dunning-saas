import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { FailedPayment } from '../models/FailedPayment';
import { Customer } from '../models/Customer';
import { ChargebeeAccount } from '../models/ChargebeeAccount';
import { AuthRequest } from '../middleware/auth';
import { UnauthorizedError, ValidationError } from '../types/errors';
import { logger } from '../config/logger';

const failedPaymentRepo = AppDataSource.getRepository(FailedPayment);
const customerRepo = AppDataSource.getRepository(Customer);
const chargebeeRepo = AppDataSource.getRepository(ChargebeeAccount);

export class MetricsController {
  async getPaymentRetryStatus(req: AuthRequest, res: Response) {
    if (!req.userId) {
      throw new UnauthorizedError('Not authenticated');
    }

    const paymentId = req.params.paymentId as string;

    if (!paymentId) {
      throw new ValidationError('paymentId required');
    }

    const payment = await failedPaymentRepo.findOne({
      where: { id: paymentId },
      relations: {
        retryAttempts: true,
      },
    });

    if (!payment) {
      throw new ValidationError('Payment not found');
    }

    // Verify user owns this payment
    const account = await chargebeeRepo.findOne({
      where: { id: payment.chargebeeAccountId, userId: req.userId },
    });

    if (!account) {
      throw new UnauthorizedError('Not authorized to view this payment');
    }

    res.json({
      id: payment.id,
      chargebeeInvoiceId: payment.chargebeeInvoiceId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      failureType: payment.failureType,
      declineReason: payment.declineReasonUser,
      retryCount: payment.retryCount,
      firstAttemptAt: payment.firstAttemptAt,
      lastRetryAt: payment.lastRetryAt,
      recoveredAt: payment.recoveredAt,
      attempts: payment.retryAttempts.map((attempt) => ({
        attemptNumber: attempt.attemptNumber,
        result: attempt.result,
        attemptTime: attempt.attemptTime,
        gateway: attempt.gatewayUsed,
      })),
    });
  }

  async getAccountMetrics(req: AuthRequest, res: Response) {
    if (!req.userId) {
      throw new UnauthorizedError('Not authenticated');
    }

    const account = await chargebeeRepo.findOne({
      where: { userId: req.userId },
    });

    if (!account) {
      throw new ValidationError('No connected Chargebee account');
    }

    // Get all failed payments for this account
    const allPayments = await failedPaymentRepo.find({
      where: { chargebeeAccountId: account.id },
    });

    // Calculate metrics
    const totalFailed = allPayments.length;
    const recovered = allPayments.filter((p) => p.status === 'recovered').length;
    const unrecovered = allPayments.filter((p) => p.status === 'unrecovered').length;
    const pendingRetry = allPayments.filter((p) => p.status === 'pending_retry').length;

    const recoveryRate = totalFailed > 0 ? (recovered / totalFailed) * 100 : 0;
    const totalRecoveredAmount = allPayments
      .filter((p) => p.status === 'recovered')
      .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);

    res.json({
      totalFailedPayments: totalFailed,
      recovered,
      unrecovered,
      pendingRetry,
      recoveryRate: recoveryRate.toFixed(2),
      totalRecoveredAmount: totalRecoveredAmount.toFixed(2),
      currency: allPayments[0]?.currency || 'USD',
    });
  }

  async getCustomerRetryHistory(req: AuthRequest, res: Response) {
    if (!req.userId) {
      throw new UnauthorizedError('Not authenticated');
    }

    const customerId = req.params.customerId as string;

    if (!customerId) {
      throw new ValidationError('customerId required');
    }

    const customer = await customerRepo.findOne({
      where: { id: customerId },
      relations: {
        failedPayments: {
          retryAttempts: true,
        },
      },
    });

    if (!customer) {
      throw new ValidationError('Customer not found');
    }

    // Verify user owns this customer
    const account = await chargebeeRepo.findOne({
      where: { id: customer.chargebeeAccountId, userId: req.userId },
    });

    if (!account) {
      throw new UnauthorizedError('Not authorized to view this customer');
    }

    const failedPayments = customer.failedPayments || [];

    res.json({
      customerId: customer.id,
      chargebeeCustomerId: customer.chargebeeCustomerId,
      customerName: customer.customerName,
      customerEmail: customer.customerEmail,
      totalFailedPayments: failedPayments.length,
      recovered: failedPayments.filter((p) => p.status === 'recovered').length,
      payments: failedPayments.map((payment) => ({
        id: payment.id,
        invoiceId: payment.chargebeeInvoiceId,
        amount: payment.amount,
        status: payment.status,
        retryCount: payment.retryCount,
        recoveredAt: payment.recoveredAt,
        attempts: payment.retryAttempts.length,
      })),
    });
  }
}

export const metricsController = new MetricsController();