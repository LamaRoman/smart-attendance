import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBiometric } from '../hooks/useBiometric';
import { useBiometricStore } from '../store/biometricStore';
import { router } from 'expo-router';

export function BiometricLockScreen() {
  const { authenticate } = useBiometric();
  const setLocked = useBiometricStore((s) => s.setLocked);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAuthenticate = async () => {
    setLoading(true);
    setError(null);

    const result = await authenticate();

    if (result.success) {
      setLocked(false);
    } else if (result.reason === 'cancelled') {
      setError('Authentication cancelled. Tap to try again.');
    } else if (result.reason === 'not_supported' || result.reason === 'not_enrolled') {
      // Device has no biometrics — unlock silently
      setLocked(false);
    } else {
      setError('Authentication failed. Try again or use your PIN.');
    }

    setLoading(false);
  };

  const handleUsePIN = () => {
    // Navigate to a PIN entry screen or sign out
    // Adjust this route to match your PIN screen route
    router.push('/(auth)/pin-verify');
  };

  // Auto-trigger on mount
  useEffect(() => {
    handleAuthenticate();
  }, []);

  return (
    <View className="flex-1 bg-white items-center justify-center px-8">
      {/* Lock icon */}
      <View className="w-24 h-24 rounded-full bg-blue-50 items-center justify-center mb-8">
        <Ionicons name="finger-print" size={48} color="#3B82F6" />
      </View>

      <Text className="text-2xl font-bold text-gray-900 mb-2 text-center">
        App Locked
      </Text>
      <Text className="text-base text-gray-500 text-center mb-10">
        Verify your identity to continue
      </Text>

      {error && (
        <Text className="text-sm text-red-500 text-center mb-6">{error}</Text>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#3B82F6" />
      ) : (
        <>
          <TouchableOpacity
            onPress={handleAuthenticate}
            className="w-full bg-blue-500 py-4 rounded-2xl items-center mb-4"
          >
            <Text className="text-white text-base font-semibold">
              Use Biometrics
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleUsePIN} className="py-3">
            <Text className="text-blue-500 text-sm font-medium">Use PIN instead</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}