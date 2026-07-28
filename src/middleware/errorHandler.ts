import { Request, Response, NextFunction } from 'express';
import { AppError } from '../types/errors';
import { logger } from '../config/logger';

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log error
  logger.error({
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body,
  });

  // Handle custom app errors
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: error.message,
      details: error.details,
      statusCode: error.statusCode,
    });
  }

  // Handle unexpected errors
  const isDev = process.env.NODE_ENV === 'development';
  res.status(500).json({
    error: 'Internal server error',
    message: isDev ? error.message : 'Something went wrong',
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: 'Not found',
    path: req.url,
  });
}