import { create } from 'zustand';
import { apiGet } from '../lib/api';

// Matches actual API response from /api/attendance/status
export interface AttendanceStatus {
  isClockedIn: boolean;
  record: {
    id: string;
    checkInTime: string | null;
    checkOutTime: string | null;
    status: string;
  } | null;
  currentDuration: {
    minutes: number;
    formatted: string;
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
      const data = await apiGet<AttendanceStatus>('/api/v1/attendance/status');
      set({ status: data, isLoading: false, lastFetched: new Date() });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Failed to load attendance status.';
      set({ error: message, isLoading: false });
    }
  },

  reset: () => set({ status: null, isLoading: false, error: null, lastFetched: null }),
}));
