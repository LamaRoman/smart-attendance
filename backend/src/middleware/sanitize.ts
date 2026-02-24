import { Request, Response, NextFunction } from 'express';

// Keys that must never be used as object keys — prototype pollution vectors
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Sanitize request body, query, and params to prevent XSS and prototype pollution.
 * IMPORTANT: This middleware must be registered AFTER express.json() in app.js/app.ts,
 * otherwise req.body will be undefined and sanitization is skipped entirely.
 */
function sanitizeValue(value: any): any {
  if (typeof value === 'string') {
    return value
      .replace(/<script[^>]*>.*?<\/script>/gi, '')  // Remove script tags
      .replace(/<[^>]*>/g, '')                        // Remove HTML tags
      .replace(/javascript:/gi, '')                   // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '')                    // Remove event handlers
      .trim();
  }
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (value !== null && typeof value === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      // FIX C-02: Block prototype pollution keys
      if (DANGEROUS_KEYS.has(k)) {
        continue;
      }
      // Skip password fields — they can contain special chars
      if (k === 'password') { sanitized[k] = v; continue; }
      sanitized[k] = sanitizeValue(v);
    }
    return sanitized;
  }
  return value;
}

export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // FIX C-01: If body is not yet parsed (not an object), skip sanitization.
  // This acts as a safeguard — the real fix is ensuring this middleware is
  // registered AFTER express.json() in app.js/app.ts.
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }

  if (req.query && typeof req.query === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [k, v] of Object.entries(req.query)) {
      if (DANGEROUS_KEYS.has(k)) continue; // also protect query params
      sanitized[k] = sanitizeValue(v);
    }
    req.query = sanitized;
  }

  next();
};
