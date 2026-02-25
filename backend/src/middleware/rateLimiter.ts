import rateLimit from 'express-rate-limit';
import { createLogger } from '../logger';

const log = createLogger('rate-limiter');

/**
 * Strict rate limit for auth endpoints (login, password reset)
 * Prevents brute-force attacks
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  skip: (req) => req.ip === "127.0.0.1" || req.ip === "::1",  // bypass for localhost testing // 5 attempts per 15 min per IP
  message: {
    error: {
      message: 'Too many login attempts. Please try again in 15 minutes.',
      code: 'RATE_LIMIT_AUTH',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    log.warn({ ip: req.ip, path: req.path }, 'Auth rate limit exceeded');
    res.status(429).json(options.message);
  },
});

/**
 * Rate limit for QR scan endpoint (public, unauthenticated)
 * 100 requests per 15 min per IP — covers 50 employees scanning from same office network
 */
export const scanRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 scans per 15 min — supports 500 employees on same WiFi
  message: {
    error: {
      message: 'Too many scan attempts. Please try again later.',
      code: 'RATE_LIMIT_SCAN',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    log.warn({ ip: req.ip, path: req.path }, 'Scan rate limit exceeded');
    res.status(429).json(options.message);
  },
});

/**
 * General API rate limit — prevents abuse across all endpoints
 */
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per 15 min per IP
  message: {
    error: {
      message: 'Too many requests. Please slow down.',
      code: 'RATE_LIMIT_GENERAL',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
