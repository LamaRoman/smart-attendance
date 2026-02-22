import { z } from 'zod';

export const dailyReportQuerySchema = z.object({
  date: z.string().optional(), // AD date string, defaults to today
});

export const weeklyReportQuerySchema = z.object({
  startDate: z.string().optional(), // AD date string, defaults to current week start
});

export const monthlyReportQuerySchema = z.object({
  bsYear: z.coerce.number().int().min(2070).max(2090).optional(),
  bsMonth: z.coerce.number().int().min(1).max(12).optional(),
  // Fallback to AD year/month if BS not provided
  year: z.coerce.number().int().optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
});
