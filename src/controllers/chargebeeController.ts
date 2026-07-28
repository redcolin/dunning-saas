import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { ChargebeeAccount } from '../models/ChargebeeAccount';
import { AuthRequest } from '../middleware/auth';
import { ChargebeeService } from '../services/chargebeeService';
import { ValidationError, UnauthorizedError } from '../types/errors';
import { logger } from '../config/logger';

const chargebeeRepo = AppDataSource.getRepository(ChargebeeAccount);

export class ChargebeeController {
  async connectAccount(req: AuthRequest, res: Response) {
    if (!req.userId) {
      throw new UnauthorizedError('Not authenticated');
    }

    const { apiKey, siteUrl } = req.body;

    if (!apiKey || !siteUrl) {
      throw new ValidationError('API key and site URL required');
    }

    // Check if already connected
    const existing = await chargebeeRepo.findOne({ where: { userId: req.userId } });
    if (existing) {
      throw new ValidationError('Chargebee account already connected');
    }

    // Create account
    const account = new ChargebeeAccount();
    account.userId = req.userId;
    account.chargebeeApiKey = apiKey;
    account.chargebeeSiteUrl = siteUrl;

    await chargebeeRepo.save(account);
    logger.info(`Chargebee account connected for user ${req.userId}`);

    res.status(201).json({
      id: account.id,
      status: account.status,
      connectedAt: account.connectedAt,
    });
  }

  async getConnectedAccount(req: AuthRequest, res: Response) {
    if (!req.userId) {
      throw new UnauthorizedError('Not authenticated');
    }

    const account = await chargebeeRepo.findOne({ where: { userId: req.userId } });

    if (!account) {
      return res.status(404).json({ error: 'No connected account' });
    }

    res.json({
      id: account.id,
      status: account.status,
      chargebeeSiteUrl: account.chargebeeSiteUrl,
      connectedAt: account.connectedAt,
      lastSyncAt: account.lastSyncAt,
    });
  }

  async testConnection(req: AuthRequest, res: Response) {
    if (!req.userId) {
      throw new UnauthorizedError('Not authenticated');
    }

    const account = await chargebeeRepo.findOne({ where: { userId: req.userId } });

    if (!account) {
      throw new ValidationError('No connected account');
    }

    const service = new ChargebeeService(account);
    const connected = await service.testConnection();

    if (connected) {
      account.status = 'connected';
      account.connectedAt = new Date();
      await chargebeeRepo.save(account);
      logger.info(`Chargebee connection verified for user ${req.userId}`);
    } else {
      account.status = 'error';
      account.syncError = 'Connection test failed';
      await chargebeeRepo.save(account);
    }

    res.json({
      connected,
      status: account.status,
    });
  }

  async disconnectAccount(req: AuthRequest, res: Response) {
    if (!req.userId) {
      throw new UnauthorizedError('Not authenticated');
    }

    const account = await chargebeeRepo.findOne({ where: { userId: req.userId } });

    if (!account) {
      throw new ValidationError('No connected account');
    }

    await chargebeeRepo.remove(account);
    logger.info(`Chargebee account disconnected for user ${req.userId}`);

    res.json({ message: 'Disconnected' });
  }
}

export const chargebeeController = new ChargebeeController();