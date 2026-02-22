import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Generic validation middleware factory
 * Validates req.body, req.query, or req.params against a Zod schema
 *
 * Usage:
 *   router.post('/login', validate(loginSchema), controller.login)
 *   router.get('/records', validate(querySchema, 'query'), controller.list)
 */
export function validate(
  schema: ZodSchema,
  source: 'body' | 'query' | 'params' = 'body'
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const errors = formatZodErrors(result.error);
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: errors,
        },
      });
    }

    // Replace the source with the parsed (and transformed) data
    // This ensures defaults, coercion, and transforms are applied
    req[source] = result.data;
    next();
  };
}

/**
 * Format Zod errors into a clean array
 */
function formatZodErrors(error: ZodError): { field: string; message: string }[] {
  return error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));
}
