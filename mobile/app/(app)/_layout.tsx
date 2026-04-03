import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Stack } from 'expo-router';
import { useBiometricStore } from '../../store/biometricStore';
import { BiometricLockScreen } from '../../components/BiometricLockScreen';

export default function AppLayout() {
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const { isLocked, setLocked, loadSettings, recordBackgroundTime, checkShouldLock } =
    useBiometricStore();

  useEffect(() => { loadSettings(); }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState) => {
      if (appState.current === 'active' && (nextState === 'background' || nextState === 'inactive')) {
        await recordBackgroundTime();
      }
      if (nextState === 'active' && appState.current !== 'active') {
        const shouldLock = await checkShouldLock();
        if (shouldLock) setLocked(true);
      }
      appState.current = nextState;
    });
    return () => subscription.remove();
  }, []);

  if (isLocked) return <BiometricLockScreen />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="attendance/scan" />
      <Stack.Screen name="attendance/gps-checkin" />
    </Stack>
  );
}
