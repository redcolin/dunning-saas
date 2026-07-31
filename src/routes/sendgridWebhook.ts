import { Router } from 'express';
import { sendgridWebhookController } from '../controllers/sendgridWebhookController';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

// SendGrid webhook endpoint (no auth - SendGrid posts to this)
router.post(
  '/events',
  asyncHandler((req, res) => sendgridWebhookController.handleSendGridWebhook(req, res))
);

export default router;