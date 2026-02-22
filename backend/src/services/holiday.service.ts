import NodeCache from 'node-cache';
import prisma from '../lib/prisma';
import { bsToAD, adToBS, BSDate } from '../lib/nepali-date';
import { config } from '../config';
import { createLogger } from '../logger';
import { getBuiltInHolidays, hasBuiltInData } from '../lib/nepal-holidays';
import { JWTPayload } from '../lib/jwt';
import { CreateHolidayInput } from '../schemas/holiday.schema';

const log = createLogger('holiday-service');
const cache = new NodeCache({ stdTTL: 86400 }); // 24 hour cache

interface CalendarificHoliday {
  name: string;
  description: string;
  date: { iso: string; datetime: { year: number; month: number; day: number } };
  type: string[];
}

export class HolidayService {
  /**
   * List holidays — org-scoped (includes national + org-specific)
   */
  async listHolidays(currentUser: JWTPayload, filters: { bsYear?: number; bsMonth?: number }) {
    const where: Record<string, unknown> = {};

    if (filters.bsYear) where.bsYear = filters.bsYear;
    if (filters.bsMonth) where.bsMonth = filters.bsMonth;

    // Show national holidays (orgId = null) + org-specific holidays
    if (currentUser.role !== 'SUPER_ADMIN' && currentUser.organizationId) {
      where.OR = [
        { organizationId: null },
        { organizationId: currentUser.organizationId },
      ];
    }

    where.isActive = true;

    return prisma.holiday.findMany({
      where,
      orderBy: [{ bsYear: 'desc' }, { bsMonth: 'asc' }, { bsDay: 'asc' }],
    });
  }

  /**
   * Create a holiday manually
   */
  async createHoliday(input: CreateHolidayInput, currentUser: JWTPayload) {
    const organizationId = currentUser.role === 'SUPER_ADMIN' ? null : currentUser.organizationId;

    return prisma.holiday.create({
      data: {
        name: input.name,
        nameNepali: input.nameNepali || null,
        bsYear: input.bsYear,
        bsMonth: input.bsMonth,
        bsDay: input.bsDay,
        date: input.date,
        type: input.type,
        isRecurring: input.isRecurring,
        isActive: true,
        organizationId,
        description: input.description,
      },
    });
  }

  /**
   * Toggle holiday active status
   */
  async updateHoliday(holidayId: string, isActive: boolean) {
    return prisma.holiday.update({
      where: { id: holidayId },
      data: { isActive },
    });
  }

  /**
   * Delete holiday
   */
  async deleteHoliday(holidayId: string) {
    await prisma.holiday.delete({ where: { id: holidayId } });
    return { message: 'Holiday deleted' };
  }

  /**
   * Sync holidays from Calendarific API for a BS year
   */
  async syncHolidaysForBSYear(bsYear: number): Promise<{ synced: number; skipped: number; source?: string }> {
    let synced = 0;
    let skipped = 0;
    let source = 'api';
    try {
      const startOfYear = bsToAD({ year: bsYear, month: 1, day: 1 });
      const endOfYear = bsToAD({ year: bsYear, month: 12, day: 30 });
      const adYears = new Set([startOfYear.getFullYear(), endOfYear.getFullYear()]);
      for (const adYear of adYears) {
        const holidays = await this.fetchHolidaysFromAPI(adYear);
        for (const holiday of holidays) {
          const adDate = new Date(holiday.date.iso);
          if (adDate < startOfYear || adDate > endOfYear) continue;
          const bs = adToBS(adDate);
          const existing = await prisma.holiday.findFirst({
            where: { bsYear: bs.year, bsMonth: bs.month, bsDay: bs.day, organizationId: null },
          });
          if (existing) { skipped++; continue; }
          await prisma.holiday.create({
            data: {
              name: holiday.name, nameNepali: this.getNepalName(holiday.name),
              bsYear: bs.year, bsMonth: bs.month, bsDay: bs.day,
              date: adDate, type: 'PUBLIC_HOLIDAY', isActive: true,
              isRecurring: this.isRecurringHoliday(holiday.name),
            },
          });
          synced++;
        }
      }
    } catch (apiErr: any) {
      log.warn({ bsYear, error: apiErr.message }, 'API sync failed, trying built-in data');
      synced = 0; skipped = 0; source = 'built-in';
      if (!hasBuiltInData(bsYear)) {
        throw new Error('No holiday data for BS ' + bsYear + '. Configure CALENDARIFIC_API_KEY or use a supported year.');
      }
      const builtIn = getBuiltInHolidays(bsYear);
      for (const h of builtIn) {
        const existing = await prisma.holiday.findFirst({
          where: { bsYear: h.bsYear, bsMonth: h.bsMonth, bsDay: h.bsDay, organizationId: null },
        });
        if (existing) { skipped++; continue; }
        await prisma.holiday.create({
          data: {
            name: h.name, nameNepali: h.nameNepali,
            bsYear: h.bsYear, bsMonth: h.bsMonth, bsDay: h.bsDay,
            date: new Date(h.adDate), type: h.type, isActive: true,
            isRecurring: h.isRecurring,
          },
        });
        synced++;
      }
    }
    log.info({ bsYear, synced, skipped, source }, 'Holiday sync complete');
    return { synced, skipped, source };
  }

  /**
   * Get holiday dates for a BS month (used by payroll)
   */
  async getHolidayDatesForMonth(bsYear: number, bsMonth: number, organizationId?: string): Promise<Date[]> {
    const where: Record<string, unknown> = {
      bsYear,
      bsMonth,
      isActive: true,
      type: 'PUBLIC_HOLIDAY',
    };

    if (organizationId) {
      where.OR = [
        { organizationId: null },
        { organizationId },
      ];
    }

    const holidays = await prisma.holiday.findMany({ where });
    return holidays.map((h) => h.date);
  }

  // ======== Private helpers ========

  private async fetchHolidaysFromAPI(adYear: number): Promise<CalendarificHoliday[]> {
    const apiKey = config.CALENDARIFIC_API_KEY;
    if (!apiKey || apiKey.startsWith('get_from')) {
      throw new Error('Calendarific API key not configured');
    }

    const cacheKey = `holidays_${adYear}`;
    const cached = cache.get<CalendarificHoliday[]>(cacheKey);
    if (cached) return cached;

    const url = `https://calendarific.com/api/v2/holidays?api_key=${apiKey}&country=NP&year=${adYear}`;

    const response = await fetch(url);
    const data = await response.json() as any;

    if (data.meta.code !== 200) {
      throw new Error(`Calendarific API error: ${data.meta.error_detail || 'Unknown'}`);
    }

    const holidays: CalendarificHoliday[] = data.response.holidays.filter(
      (h: any) => h.type.includes('National holiday') || h.type.includes('Public holiday')
    );

    cache.set(cacheKey, holidays);
    return holidays;
  }

  private getNepalName(englishName: string): string | null {
    const nameMap: Record<string, string> = {
      'Nepali New Year': 'नयाँ वर्ष',
      'Republic Day': 'गणतन्त्र दिवस',
      'Constitution Day': 'संविधान दिवस',
      'Democracy Day': 'लोकतन्त्र दिवस',
      'Dashain': 'दशैं',
      'Tihar': 'तिहार',
      'Buddha Jayanti': 'बुद्ध जयन्ती',
      'Holi': 'होली',
      'Teej': 'तीज',
      'Janai Purnima': 'जनै पूर्णिमा',
      'Krishna Janmashtami': 'कृष्ण जन्माष्टमी',
    };

    for (const [eng, nep] of Object.entries(nameMap)) {
      if (englishName.toLowerCase().includes(eng.toLowerCase())) return nep;
    }
    return null;
  }

  private isRecurringHoliday(name: string): boolean {
    const recurring = ['New Year', 'Republic Day', 'Constitution Day', 'Democracy Day', 'International Women', 'Labour Day'];
    return recurring.some((h) => name.toLowerCase().includes(h.toLowerCase()));
  }
}

export const holidayService = new HolidayService();
