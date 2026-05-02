import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import Constants from 'expo-constants';
import { TokenStorage } from './auth';

// ─── Config ─────────────────────────────────────────────────────────────────
// Dynamically resolves the dev machine's IP from the Expo dev server host.
// This means you never need to manually update the IP when switching networks.
const getDevBaseUrl = (): string => {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ??
    (Constants as any).manifest?.debuggerHost;

  if (hostUri) {
    const ip = hostUri.split(':')[0]; // strip port, keep IP
    return `http://${ip}:5001`;
  }
  // Fallback: emulator localhost tunnel
  return 'http://localhost:5001';
};

// Production base URL is supplied by EXPO_PUBLIC_API_URL at build time
// (set per-profile in eas.json). The hardcoded fallback exists only so a
// missing env var doesn't ship a broken build to the store; all real
// builds should set the env var explicitly.
const PROD_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.zentaralabs.com';

const BASE_URL = __DEV__ ? getDevBaseUrl() : PROD_BASE_URL;
// ─── Create instance ─────────────────────────────────────────────────────────
const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

// ─── Request interceptor — attach Bearer token + v1 prefix ──────────────────
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await TokenStorage.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Upgrade /api/ → /api/v1/
    if (config.url && config.url.startsWith('/api/') && !config.url.startsWith('/api/v1/')) {
      config.url = config.url.replace('/api/', '/api/v1/');
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// ─── Response interceptor — handle 401 + token refresh ──────────────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token!);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Only attempt refresh on 401 and only once per request
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Don't refresh on the login or refresh endpoints themselves
    const url = originalRequest.url ?? '';
    if (url.includes('/auth/login') || url.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue the request until the ongoing refresh completes
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((newToken) => {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = await TokenStorage.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, { refreshToken });
      const { accessToken, refreshToken: newRefreshToken } = response.data.data;

      await TokenStorage.setAccessToken(accessToken);
      // Server rotates the refresh token on every use (PR 3). Persist the
      // new one or the next refresh will be flagged as reuse and kill all
      // sessions for this user.
      if (newRefreshToken) {
        await TokenStorage.setRefreshToken(newRefreshToken);
      }
      api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
      processQueue(null, accessToken);
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      // Force logout — clear tokens and let auth guard redirect to login
      await TokenStorage.clearTokens();
      // Emit an event so the auth store can react
      authRefreshFailedCallbacks.forEach((cb) => cb());
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// ─── Auth failure callbacks (registered by auth store) ───────────────────────
const authRefreshFailedCallbacks: Array<() => void> = [];

export const onAuthRefreshFailed = (callback: () => void) => {
  authRefreshFailedCallbacks.push(callback);
  return () => {
    const idx = authRefreshFailedCallbacks.indexOf(callback);
    if (idx > -1) authRefreshFailedCallbacks.splice(idx, 1);
  };
};

// ─── Typed API helpers ────────────────────────────────────────────────────────
export const apiGet = <T>(url: string, params?: object) =>
  api.get<{ data: T }>(url, { params }).then((r) => r.data.data);

export const apiPost = <T>(url: string, body?: object) =>
  api.post<{ data: T }>(url, body).then((r) => r.data.data);

export const apiPut = <T>(url: string, body?: object) =>
  api.put<{ data: T }>(url, body).then((r) => r.data.data);

export const apiDelete = <T>(url: string) =>
  api.delete<{ data: T }>(url).then((r) => r.data.data);

export default api;