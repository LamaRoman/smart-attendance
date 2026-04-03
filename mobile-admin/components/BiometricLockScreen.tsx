import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useBiometric } from '../hooks/useBiometric';
import { useBiometricStore } from '../store/biometricStore';
import { useAuthStore } from '../store/auth.store';

const ADMIN_PRIMARY = '#7C3AED';

export function BiometricLockScreen() {
  const { authenticate } = useBiometric();
  const setLocked = useBiometricStore((s) => s.setLocked);
  const { logout } = useAuthStore();
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
      setLocked(false);
    } else {
      setError('Authentication failed. Please try again.');
    }
    setLoading(false);
  };

  useEffect(() => { handleAuthenticate(); }, []);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        <View style={s.iconCircle}>
          <Ionicons name="finger-print" size={52} color={ADMIN_PRIMARY} />
        </View>
        <Text style={s.title}>App Locked</Text>
        <Text style={s.subtitle}>Verify your identity to continue</Text>
        {error && <Text style={s.error}>{error}</Text>}
        {loading ? (
          <ActivityIndicator size="large" color={ADMIN_PRIMARY} style={s.loader} />
        ) : (
          <>
            <TouchableOpacity style={s.primaryBtn} onPress={handleAuthenticate}>
              <Ionicons name="finger-print" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={s.primaryBtnText}>Use Biometrics</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.secondaryBtn} onPress={() => logout()}>
              <Text style={s.secondaryBtnText}>Sign out instead</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  iconCircle: { width: 104, height: 104, borderRadius: 52, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#6B7280', textAlign: 'center', marginBottom: 32 },
  error: { fontSize: 14, color: '#DC2626', textAlign: 'center', marginBottom: 20 },
  loader: { marginTop: 8 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: ADMIN_PRIMARY, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, width: '100%', justifyContent: 'center', marginBottom: 14 },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  secondaryBtn: { paddingVertical: 10 },
  secondaryBtnText: { color: '#6B7280', fontSize: 14, fontWeight: '500' },
});
