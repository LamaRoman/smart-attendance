import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../store/auth.store';

export default function RootLayout() {
  const { isAuthenticated, isLoading, initialize, user } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  // Initialize — restore session from secure storage on first mount
  useEffect(() => {
    initialize();
  }, []);

  // Auth guard — redirect based on auth state once loading is done
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      if (user?.mustChangePassword) {
        router.replace('/(auth)/change-password');
      } else {
        router.replace('/(app)/(admin-tabs)/dashboard');
      }
    } else if (isAuthenticated && !inAuthGroup && user?.mustChangePassword) {
      router.replace('/(auth)/change-password');
    }
  }, [isAuthenticated, isLoading, segments, user?.mustChangePassword]);

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
