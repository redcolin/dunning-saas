import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

router.post('/signup', asyncHandler((req, res) => authController.signup(req, res)));
router.post('/login', asyncHandler((req, res) => authController.login(req, res)));
router.get('/me', authMiddleware, asyncHandler((req, res) => authController.me(req as any, res)));

export default router;