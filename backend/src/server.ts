import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import crypto from 'crypto';
import { config, corsOrigins } from './config';
import { authService } from './services/auth.service';
import { logger } from './logger';
import { generalRateLimiter } from './middleware/rateLimiter';
import { sanitizeInput } from './middleware/sanitize';
import { errorHandler } from './middleware/errorHandler';
import prisma from './lib/prisma';
import notificationRoutes from './routes/notifications';
import { notificationService } from './services/notification.service';
import { startTrialExpiryJob } from './jobs/trial-expiry.job';
import { startBillingJob } from './jobs/billing.job';
import { startPriceExpiryJob } from './jobs/price-expiry.job';
import { startGracePeriodJob } from './jobs/grace-period.job';
import { startAbandonedJob } from './jobs/abandoned.job';// Route imports
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import qrRoutes from './routes/qr';
import attendanceRoutes from './routes/attendance';
import reportsRoutes from './routes/reports';
import payrollRoutes, { employeePayrollRouter } from './routes/payroll';
import holidayRoutes from './routes/holidays';
import masterHolidayRoutes from './routes/masterHolidays';
import configRoutes from './routes/config';
import nepaliDateRoutes from './routes/nepali-date';
import superAdminRoutes from './routes/superAdmin';
import leaveRoutes from './routes/leaves';
import orgSettingsRoutes from './routes/orgSettings';
import superAdminSubscriptionRouter from './routes/superadmin.subscription.routes';
import platformConfigRouter from './routes/superadmin.platform-config.routes';
import superAdminPlansRouter from "./routes/superadmin.plans.routes";
import documentTypeRoutes from './routes/documentTypes';
import documentRoutes from './routes/documents';

const app = express();

// ============================================================
// Security Middleware
// ============================================================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  noSniff: true,
  xssFilter: true,
}));
app.use(generalRateLimiter);

// ============================================================
// Request ID — unique per request for log correlation
// ============================================================
app.use((req, res, next) => {
  const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  res.setHeader('x-request-id', requestId);
  (req as any).requestId = requestId;
  next();
});

// ============================================================
// Core Middleware
// ============================================================
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(cookieParser());
app.use(sanitizeInput);
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      requestId: (req as any).requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${Date.now() - start}ms`,
      ip: req.ip,
    }, `${req.method} ${req.path} ${res.statusCode}`);
  });
  next();
});

// ============================================================
// Routes
// ============================================================
app.use('/api/auth', authRoutes);
app.use("/api", documentTypeRoutes);
app.use("/api", documentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/payroll', employeePayrollRouter);
app.use('/api/payroll', payrollRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/master-holidays', masterHolidayRoutes);
app.use('/api/config', configRoutes);
app.use('/api/nepali-date', nepaliDateRoutes);
app.use('/api/org-settings', orgSettingsRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/super-admin/subscriptions', superAdminSubscriptionRouter);
app.use('/api/super-admin/platform-config', platformConfigRouter);// Enhanced health check — includes DB connectivity
app.use("/api/super-admin/plans", superAdminPlansRouter);
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      database: 'connected',
    });
  } catch {
    res.status(503).json({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
    });
  }
});

// ============================================================
// Error Handler (must be last)
// ============================================================
app.use(errorHandler);

// ============================================================
// Start Server + Graceful Shutdown
// ============================================================
const PORT = parseInt(config.PORT, 10);

const server = app.listen(PORT, () => {
  logger.info(`Backend server running on http://localhost:${PORT}`);
  logger.info(`Environment: ${config.NODE_ENV}`);
  logger.info(`CORS origins: ${corsOrigins.join(', ')}`);
  // Cleanup expired sessions every hour
  setInterval(async () => {
    try { await authService.cleanExpiredSessions(); } catch (e) { /* ignore */ }
  }, 60 * 60 * 1000);

  // Cleanup old notifications daily
  setInterval(async () => {
    try { await notificationService.deleteOldNotifications(); } catch (e) { /* ignore */ }
  }, 24 * 60 * 60 * 1000);


  // Trial expiry cron — runs daily at 08:00 NPT
  startTrialExpiryJob();
  startBillingJob();
  startPriceExpiryJob();
    startGracePeriodJob();
    startAbandonedJob();
});

// Graceful shutdown
async function shutdown(signal: string) {
  logger.info(`${signal} received. Shutting down gracefully...`);

  server.close(async () => {
    logger.info('HTTP server closed');
    await prisma.$disconnect();
    logger.info('Database disconnected');
    process.exit(0);
  });

  // Force kill after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;