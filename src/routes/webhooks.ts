import { Router } from 'express';
import { webhookController } from '../controllers/webhookController';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

// Webhook routes don't require authentication
// Chargebee sends webhooks directly to our API
router.post('/chargebee', asyncHandler((req, res) => webhookController.handleChargebeeWebhook(req, res)));

export default router;