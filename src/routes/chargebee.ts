import { Router } from 'express';
import { chargebeeController } from '../controllers/chargebeeController';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

router.post('/connect', asyncHandler((req, res) => chargebeeController.connectAccount(req as any, res)));
router.get('/account', asyncHandler((req, res) => chargebeeController.getConnectedAccount(req as any, res)));
router.post('/test', asyncHandler((req, res) => chargebeeController.testConnection(req as any, res)));
router.delete('/disconnect', asyncHandler((req, res) => chargebeeController.disconnectAccount(req as any, res)));

export default router;