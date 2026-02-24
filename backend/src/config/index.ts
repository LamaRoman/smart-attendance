import "dotenv/config";

import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // JWT â€” no fallback, must be explicitly set
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // QR / TOTP â€” separate from JWT
  QR_SECRET: z.string().min(32, 'QR_SECRET must be at least 32 characters'),

  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5001'),

  // CORS â€” comma-separated origins
  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  // Frontend URL (for QR code scan URLs)
  FRONTEND_URL: z.string().default('http://localhost:3000'),

  // Calendarific API (optional â€” holiday sync)
  CALENDARIFIC_API_KEY: z.string().optional(),
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
