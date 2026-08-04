import { Router } from 'express';
import { customerPortalController } from '../controllers/customerPortalController';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

// Customer portal routes - no auth required (token-based access)

router.get(
  '/:customerId/payments',
  asyncHandler((req, res) => customerPortalController.getCustomerFailedPayments(req, res))
);

router.get(
  '/:customerId/payments/:paymentId',
  asyncHandler((req, res) => customerPortalController.getPaymentDetails(req, res))
);

export default router;