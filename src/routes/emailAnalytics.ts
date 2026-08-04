import { Router } from 'express';
import { emailAnalyticsController } from '../controllers/emailAnalyticsController';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

// All analytics routes require authentication
router.use(authMiddleware);

// Get overall campaign metrics
router.get(
  '/campaigns',
  asyncHandler((req, res) => emailAnalyticsController.getCampaignMetrics(req as any, res))
);

// Get metrics by event type
router.get(
  '/by-type',
  asyncHandler((req, res) => emailAnalyticsController.getMetricsByType(req as any, res))
);

export default router;