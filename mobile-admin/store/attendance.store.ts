import { create } from 'zustand';
import { apiGet } from '../lib/api';

export interface AttendanceStatus {
  isClockedIn: boolean;
  clockInTime: string | null;   // ISO timestamp
  shiftStart: string | null;
  todaySummary: {
    date: string;
    present: boolean;
    clockIn: string | null;
    clockOut: string | null;
    durationMinutes: number | null;
    status: 'ON_TIME' | 'LATE' | 'ABSENT' | 'AUTO_CLOSED' | null;
  } | null;
}

interface AttendanceState {
  status: AttendanceStatus | null;
  isLoading: boolean;
  error: string | null;
  lastFetched: Date | null;

  fetchStatus: () => Promise<void>;
  reset: () => void;
}

export const useAttendanceStore = create<AttendanceState>((set) => ({
  status: null,
  isLoading: false,
  error: null,
  lastFetched: null,

  fetchStatus: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiGet<AttendanceStatus>('/api/attendance/status');
      set({ status: data, isLoading: false, lastFetched: new Date() });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to load attendance status.';
      set({ error: message, isLoading: false });
    }
  },

  reset: () => set({ status: null, isLoading: false, error: null, lastFetched: null }),
}));
