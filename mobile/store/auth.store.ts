import { create } from 'zustand';
import { TokenStorage } from '../lib/auth';
import { apiPost, onAuthRefreshFailed } from '../lib/api';

// ─── Types — match backend auth.service exactly ───────────────────────────────
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  organizationId: string | null;
  membershipId: string | null;
  employeeId: string | null;
  mustChangePassword?: boolean;
  // From login response
  organizationName: string | null;
  // From getMe response
  organization?: {
    id: string;
    name: string;
    slug: string | null;
    attendanceMode?: string;
    geofenceEnabled?: boolean;
  } | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => {
  onAuthRefreshFailed(() => {
    get().logout();
  });

  return {
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,

    initialize: async () => {
      try {
        const token = await TokenStorage.getAccessToken();
        if (!token) {
          set({ isAuthenticated: false, isLoading: false });
          return;
        }
        const { apiGet } = await import('../lib/api');
        const data = await apiGet<{ user: User }>('/api/v1/auth/me');

        // Only allow EMPLOYEE role in this app
        if (data.user.role !== 'EMPLOYEE') {
          await TokenStorage.clearTokens();
          set({ user: null, isAuthenticated: false, isLoading: false });
          return;
        }

        set({ user: data.user, isAuthenticated: true, isLoading: false });
      } catch {
        await TokenStorage.clearTokens();
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    },

    login: async (email: string, password: string) => {
      set({ error: null });
      try {
        const data = await apiPost<{
          user: User;
          accessToken: string;
          refreshToken: string;
        }>('/api/v1/auth/login', { email, password });

        // Only allow EMPLOYEE role in this app
        if (data.user.role !== 'EMPLOYEE') {
          await TokenStorage.clearTokens();
          set({ error: 'This app is for employees only. Please use the Admin app to sign in.' });
          return;
        }

        await TokenStorage.setTokens(data.accessToken, data.refreshToken);

        // Login response is flat (no org details) — fetch full profile
        const { apiGet } = await import('../lib/api');
        const meData = await apiGet<{ user: User }>('/api/v1/auth/me');
        set({ user: meData.user, isAuthenticated: true });
      } catch (err: unknown) {
        const message =
          (err as any)?.response?.data?.error?.message ??
          'Login failed. Please check your credentials.';
        set({ error: message });
        throw err;
      }
    },

    logout: async () => {
      try {
        await apiPost('/api/v1/auth/logout');
      } catch {
        // ignore
      } finally {
        await TokenStorage.clearTokens();
        set({ user: null, isAuthenticated: false, error: null });
      }
    },

    clearError: () => set({ error: null }),
  };
});

// Helper — get org name from either login or getMe response shape
export function getOrgName(user: User | null): string {
  if (!user) return '—';
  return user.organization?.name ?? user.organizationName ?? '—';
}

// Helper — get attendance mode
export function getAttendanceMode(user: User | null): string {
  return user?.organization?.attendanceMode ?? 'BOTH';
}