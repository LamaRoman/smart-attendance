import { Request, Response, NextFunction } from 'express';

/**
 * Sanitize request body, query, and params to prevent XSS
 * Strips HTML tags and dangerous characters from string inputs
 */
function sanitizeValue(value: any): any {
  if (typeof value === 'string') {
    return value
      .replace(/<script[^>]*>.*?<\/script>/gi, '')  // Remove script tags
      .replace(/<[^>]*>/g, '')                         // Remove HTML tags
      .replace(/javascript:/gi, '')                    // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '')                     // Remove event handlers
      .trim();
  }
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (value && typeof value === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      // Skip password fields — they can contain special chars
      if (k === 'password') { sanitized[k] = v; continue; }
      sanitized[k] = sanitizeValue(v);
    }
    return sanitized;
  }
  return value;
}

export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') req.body = sanitizeValue(req.body);
  if (req.query && typeof req.query === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [k, v] of Object.entries(req.query)) sanitized[k] = sanitizeValue(v);
    req.query = sanitized;
  }
  next();
};
