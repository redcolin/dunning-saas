import sendgridWebhookRoutes from './routes/sendgridWebhook';
import emailTrackingRoutes from './routes/emailTracking';
import paymentPortalRoutes from './routes/paymentPortal';
import metricsRoutes from './routes/metrics';
import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { initializeDatabase } from './config/database';
import { schedulerService } from './config/scheduler';
import authRoutes from './routes/auth';
import chargebeeRoutes from './routes/chargebee';
import webhookRoutes from './routes/webhooks';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { logger } from './config/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// Routes
app.use('/auth', authRoutes);
app.use('/chargebee', chargebeeRoutes);
app.use('/webhooks', webhookRoutes);
app.use('/metrics', metricsRoutes);
app.use('/payment-portal', paymentPortalRoutes);
app.use('/email-tracking', emailTrackingRoutes);
app.use('/sendgrid', sendgridWebhookRoutes);

// Error handlers (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize and start
async function start() {
  try {
    await initializeDatabase();
    
    // Start retry scheduler
    schedulerService.start();

    app.listen(PORT, () => {
      logger.info(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

export default app;