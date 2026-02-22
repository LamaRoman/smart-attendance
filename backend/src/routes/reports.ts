import { Router, Response, NextFunction } from 'express';
import { reportService } from '../services/report.service';
import { validate } from '../middleware/validate';
import { dailyReportQuerySchema, weeklyReportQuerySchema, monthlyReportQuerySchema } from '../schemas/report.schema';
import { authenticate, requireOrgAdmin, enforceOrgIsolation, AuthRequest } from '../middleware/auth';
import { requireFeature } from '../middleware/feature.guard';
const router = Router();


router.use(authenticate, requireOrgAdmin, enforceOrgIsolation);
// GET /api/reports/daily
router.get('/daily', validate(dailyReportQuerySchema, 'query'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const date = req.query.date ? new Date(req.query.date as string) : new Date();
    const data = await reportService.getDailyReport(date, req.user!);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

// GET /api/reports/weekly
router.get('/weekly', requireFeature('featurePayrollWorkflow'), validate(weeklyReportQuerySchema, 'query'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let startDate: Date;
    if (req.query.startDate) {
      startDate = new Date(req.query.startDate as string);
    } else {
      startDate = new Date();
      const day = startDate.getDay();
      const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
      startDate.setDate(diff);
    }
    const data = await reportService.getWeeklyReport(startDate, req.user!);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

// GET /api/reports/monthly
router.get('/monthly', requireFeature('featurePayrollWorkflow'), validate(monthlyReportQuerySchema, 'query'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const data = await reportService.getMonthlyReport(year, month, req.user!);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

export default router;
