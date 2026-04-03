import * as LocalAuthentication from 'expo-local-authentication';
import { useCallback } from 'react';

export type BiometricResult =
  | { success: true }
  | { success: false; reason: 'not_supported' | 'not_enrolled' | 'failed' | 'cancelled' };

export function useBiometric() {
  const isSupported = useCallback(async (): Promise<boolean> => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return compatible && enrolled;
  }, []);

  const authenticate = useCallback(async (): Promise<BiometricResult> => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) return { success: false, reason: 'not_supported' };
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) return { success: false, reason: 'not_enrolled' };
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Verify your identity',
      fallbackLabel: 'Use PIN',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });
    if (result.success) return { success: true };
    if (result.error === 'user_cancel' || result.error === 'system_cancel') {
      return { success: false, reason: 'cancelled' };
    }
    return { success: false, reason: 'failed' };
  }, []);

  return { isSupported, authenticate };
}
