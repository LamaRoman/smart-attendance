import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { apiPost } from '../../../lib/api';
import { useAttendanceStore } from '../../../store/attendance.store';
import { useAuthStore } from '../../../store/auth.store';
import { Colors } from '../../../constants/colors';

type ScreenState = 'idle' | 'locating' | 'ready' | 'submitting' | 'success' | 'error';

export default function GPSCheckinScreen() {
  const router = useRouter();
  const { status, fetchStatus } = useAttendanceStore();
  const { org } = useAuthStore();
  const isClockedIn = status?.isClockedIn ?? false;

  const [screenState, setScreenState] = useState<ScreenState>('idle');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Fetch location on mount
  useEffect(() => {
    getLocation();
  }, []);

  const getLocation = async () => {
    setScreenState('locating');
    setMessage('');

    const { status: perm } = await Location.requestForegroundPermissionsAsync();
    if (perm !== 'granted') {
      setPermissionDenied(true);
      setScreenState('error');
      setMessage('Location permission denied. Please enable it in Settings.');
      return;
    }

    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      setAccuracy(Math.round(loc.coords.accuracy ?? 0));
      setScreenState('ready');
    } catch {
      setScreenState('error');
      setMessage('Could not get your location. Make sure GPS is enabled.');
    }
  };

  const handleCheckInOut = async () => {
    if (!coords) return;
    setScreenState('submitting');

    try {
      const result = await apiPost<{ message: string; time: string }>(
        '/api/attendance/mobile-checkin-auth',
        { latitude: coords.lat, longitude: coords.lng }
      );
      setMessage(result.message ?? (isClockedIn ? 'Clocked out successfully!' : 'Clocked in successfully!'));
      setScreenState('success');
      await fetchStatus();
      setTimeout(() => router.replace('/(app)/home'), 2500);
    } catch (err: unknown) {
  const error = err as any;
  console.log('CHECKIN ERROR:', JSON.stringify(error?.response?.data));
  console.log('CHECKIN STATUS:', error?.response?.status);
  const msg = error?.response?.data?.error?.message ?? error?.response?.data?.message ?? 'Check-in failed. Please try again.';
  setMessage(msg);
  setScreenState('error');
}
  };

  const accuracyColor =
    accuracy !== null
      ? accuracy <= 20 ? Colors.success : accuracy <= 50 ? Colors.warning : Colors.error
      : Colors.textMuted;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>GPS Check-{isClockedIn ? 'Out' : 'In'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.body}>
        {/* Map pin illustration */}
        <View style={styles.pinContainer}>
          <Text style={styles.pinEmoji}>📍</Text>
          {screenState === 'locating' && (
            <View style={styles.locatingRow}>
              <ActivityIndicator color={Colors.primary} size="small" />
              <Text style={styles.locatingText}>Getting your location…</Text>
            </View>
          )}
        </View>

        {/* Coords card */}
        {coords && screenState !== 'error' && (
          <View style={styles.coordsCard}>
            <Text style={styles.coordsLabel}>Your Location</Text>
            <Text style={styles.coordsValue}>
              {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
            </Text>
            {accuracy !== null && (
              <View style={styles.accuracyRow}>
                <View style={[styles.accuracyDot, { backgroundColor: accuracyColor }]} />
                <Text style={[styles.accuracyText, { color: accuracyColor }]}>
                  ±{accuracy}m accuracy
                </Text>
                <TouchableOpacity onPress={getLocation} style={styles.refreshBtn}>
                  <Text style={styles.refreshText}>↻ Refresh</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Org info */}
        {org && (
          <View style={styles.orgCard}>
            <Text style={styles.orgCardLabel}>Workplace</Text>
            <Text style={styles.orgCardName}>{org.name}</Text>
          </View>
        )}

        {/* Result message */}
        {(screenState === 'success' || (screenState === 'error' && message)) && (
          <View style={[styles.resultBanner, screenState === 'success' ? styles.bannerSuccess : styles.bannerError]}>
            <Text style={styles.resultIcon}>{screenState === 'success' ? '✅' : '⚠️'}</Text>
            <Text style={styles.resultText}>{message}</Text>
          </View>
        )}

        {/* Permission denied */}
        {permissionDenied && (
          <Text style={styles.permDeniedText}>
            Open your device Settings → Privacy → Location to enable access.
          </Text>
        )}

        {/* Action button */}
        {(screenState === 'ready' || screenState === 'error') && (
          <TouchableOpacity
            style={[
              styles.actionBtn,
              isClockedIn ? styles.actionBtnOut : styles.actionBtnIn,
              screenState === 'error' && !permissionDenied && styles.actionBtnRetry,
            ]}
            onPress={screenState === 'error' && !permissionDenied ? getLocation : handleCheckInOut}
            disabled={!coords && screenState !== 'error'}
            activeOpacity={0.85}
          >
            <Text style={styles.actionBtnText}>
              {screenState === 'error' && !permissionDenied
                ? '↻ Retry'
                : isClockedIn
                ? '⏹  Clock Out'
                : '▶  Clock In'}
            </Text>
          </TouchableOpacity>
        )}

        {screenState === 'submitting' && (
          <View style={styles.actionBtn}>
            <ActivityIndicator color={Colors.white} />
          </View>
        )}

        {screenState === 'success' && (
          <Text style={styles.redirectText}>Redirecting to home…</Text>
        )}

        {/* Cancel */}
        {screenState !== 'success' && (
          <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 28, color: Colors.primary, lineHeight: 32 },
  title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: Colors.text },

  body: { flex: 1, padding: 24, alignItems: 'center' },

  pinContainer: { alignItems: 'center', marginBottom: 24, marginTop: 16 },
  pinEmoji: { fontSize: 64, marginBottom: 12 },
  locatingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locatingText: { fontSize: 14, color: Colors.textSecondary },

  coordsCard: {
    width: '100%',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  coordsLabel: { fontSize: 12, color: Colors.textMuted, marginBottom: 4 },
  coordsValue: { fontSize: 15, fontWeight: '600', color: Colors.text, fontFamily: 'monospace' },
  accuracyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 },
  accuracyDot: { width: 8, height: 8, borderRadius: 4 },
  accuracyText: { fontSize: 13, fontWeight: '500' },
  refreshBtn: { marginLeft: 'auto' },
  refreshText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },

  orgCard: {
    width: '100%',
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 24,
  },
  orgCardLabel: { fontSize: 12, color: Colors.primary, marginBottom: 2 },
  orgCardName: { fontSize: 16, fontWeight: '700', color: Colors.primaryDark },

  resultBanner: {
    width: '100%',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  bannerSuccess: { backgroundColor: Colors.successLight, borderWidth: 1, borderColor: '#BBF7D0' },
  bannerError: { backgroundColor: Colors.errorLight, borderWidth: 1, borderColor: '#FECACA' },
  resultIcon: { fontSize: 22 },
  resultText: { flex: 1, fontSize: 14, fontWeight: '500', color: Colors.text },

  permDeniedText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },

  actionBtn: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionBtnIn: { backgroundColor: Colors.primary },
  actionBtnOut: { backgroundColor: Colors.error },
  actionBtnRetry: { backgroundColor: Colors.gray600 },
  actionBtnText: { color: Colors.white, fontSize: 17, fontWeight: '700' },

  redirectText: { fontSize: 13, color: Colors.textMuted, marginTop: 8 },

  cancelBtn: { marginTop: 4, paddingVertical: 12 },
  cancelText: { fontSize: 15, color: Colors.textSecondary },
});