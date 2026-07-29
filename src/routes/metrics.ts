import { Router } from 'express';
import { metricsController } from '../controllers/metricsController';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

// All metrics routes require authentication
router.use(authMiddleware);

// Get retry status for a specific payment
router.get(
  '/payment/:paymentId',
  asyncHandler((req, res) => metricsController.getPaymentRetryStatus(req as any, res))
);

// Get account-level recovery metrics
router.get(
  '/account',
  asyncHandler((req, res) => metricsController.getAccountMetrics(req as any, res))
);

// Get retry history for a specific customer
router.get(
  '/customer/:customerId',
  asyncHandler((req, res) => metricsController.getCustomerRetryHistory(req as any, res))
);

export default router;