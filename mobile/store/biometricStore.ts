import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const BACKGROUND_TIME_KEY = 'app_background_time';
const LOCK_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

interface BiometricState {
  isLocked: boolean;
  biometricEnabled: boolean;
  isLoading: boolean;

  // Actions
  loadSettings: () => Promise<void>;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  setLocked: (locked: boolean) => void;
  recordBackgroundTime: () => Promise<void>;
  checkShouldLock: () => Promise<boolean>;
}

export const useBiometricStore = create<BiometricState>((set, get) => ({
  isLocked: false,
  biometricEnabled: false,
  isLoading: true,

  loadSettings: async () => {
    try {
      const val = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
      set({ biometricEnabled: val === 'true', isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  setBiometricEnabled: async (enabled: boolean) => {
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
    set({ biometricEnabled: enabled });
  },

  setLocked: (locked: boolean) => set({ isLocked: locked }),

  recordBackgroundTime: async () => {
    const now = Date.now().toString();
    await SecureStore.setItemAsync(BACKGROUND_TIME_KEY, now);
  },

  checkShouldLock: async () => {
    const { biometricEnabled } = get();
    if (!biometricEnabled) return false;

    try {
      const stored = await SecureStore.getItemAsync(BACKGROUND_TIME_KEY);
      if (!stored) return false;

      const elapsed = Date.now() - parseInt(stored, 10);
      return elapsed >= LOCK_THRESHOLD_MS;
    } catch {
      return false;
    }
  },
}));