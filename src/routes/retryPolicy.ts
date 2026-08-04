import { Router } from 'express';
import { retryPolicyController } from '../controllers/retryPolicyController';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

// All retry policy routes require authentication
router.use(authMiddleware);

// Get current retry policy
router.get(
  '/',
  asyncHandler((req, res) => retryPolicyController.getPolicy(req as any, res))
);

// Update retry policy
router.put(
  '/',
  asyncHandler((req, res) => retryPolicyController.updatePolicy(req as any, res))
);

export default router;