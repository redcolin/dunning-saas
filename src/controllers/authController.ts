import { Request, Response } from 'express';
import { authService } from '../services/authService';
import { AuthRequest } from '../middleware/auth';
import { ValidationError } from '../types/errors';
import { logger } from '../config/logger';

export class AuthController {
  async signup(req: Request, res: Response) {
    const { email, password, fullName } = req.body;

    if (!email || !password) {
      throw new ValidationError('Email and password required');
    }

    const result = await authService.signup(email, password, fullName);
    res.status(201).json(result);
  }

  async login(req: Request, res: Response) {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ValidationError('Email and password required');
    }

    const result = await authService.login(email, password);
    res.json(result);
  }

  async me(req: AuthRequest, res: Response) {
    if (!req.userId) {
      throw new ValidationError('Not authenticated');
    }

    const user = await authService.getUserById(req.userId);
    if (!user) {
      throw new ValidationError('User not found');
    }

    res.json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      companyName: user.companyName,
    });
  }
}

export const authController = new AuthController();