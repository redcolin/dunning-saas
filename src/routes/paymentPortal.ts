import { Router } from 'express';
import { paymentPortalController } from '../controllers/paymentPortalController';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

// Public routes (no authentication needed - token-based access)
// Get payment details from token
router.get('/details', asyncHandler((req, res) => paymentPortalController.getPaymentDetails(req, res)));

// Get payment update portal page
router.get('/page', asyncHandler((req, res) => paymentPortalController.getPortalPage(req, res)));

// Submit payment update
router.post('/update', asyncHandler((req, res) => paymentPortalController.updatePaymentMethod(req, res)));

export default router;