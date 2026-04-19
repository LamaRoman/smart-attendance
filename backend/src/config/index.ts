import "dotenv/config";
import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // JWT -- no fallback, must be explicitly set
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('24h'),

  // QR signing secret -- used for static/rotating QR codes, separate from JWT
  QR_SECRET: z.string().min(32, 'QR_SECRET must be at least 32 characters'),

  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5001'),

  // CORS -- comma-separated origins
  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  // Frontend URL (for QR code scan URLs)
  FRONTEND_URL: z.string().default('http://localhost:3000'),

  // App download link (optional -- included in welcome emails)
  APP_DOWNLOAD_URL: z.string().url().optional(),

  // Calendarific API (optional -- holiday sync)
  CALENDARIFIC_API_KEY: z.string().optional(),

  // AWS S3 (optional -- document storage)
  AWS_REGION: z.string().default('ap-south-1'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_BUCKET: z.string().default('smart-hr-documents'),

  // Email (optional -- password reset, notifications)
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().default('noreply@zentaralabs.com'),
});

function loadConfig() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const formatted = Object.entries(errors)
      .map(([key, msgs]) => `  ${key}: ${msgs?.join(', ')}`)
      .join('\n');

    console.error('\nâŒ Invalid environment configuration:\n' + formatted + '\n');
    process.exit(1);
  }

  return result.data;
}

export const config = loadConfig();

// Derived values
export const isDev = config.NODE_ENV === 'development';
export const isProd = config.NODE_ENV === 'production';
export const isTest = config.NODE_ENV === 'test';

export const corsOrigins = config.CORS_ORIGINS.split(',').map((s) => s.trim());