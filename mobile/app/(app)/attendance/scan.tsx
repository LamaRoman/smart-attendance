import { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Vibration,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { apiPost } from '../../../lib/api';
import { useAttendanceStore } from '../../../store/attendance.store';
import { Colors } from '../../../constants/colors';

type ScanState = 'scanning' | 'loading' | 'success' | 'error';

export default function QRScannerScreen() {
  const router = useRouter();
  const { fetchStatus } = useAttendanceStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanState, setScanState] = useState<ScanState>('scanning');
  const [message, setMessage] = useState('');
  const [resultTime, setResultTime] = useState('');
  const scannedRef = useRef(false);

  if (!permission) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.permIcon}>📷</Text>
          <Text style={styles.permTitle}>Camera Permission Required</Text>
          <Text style={styles.permSub}>
            Smart Attendance needs camera access to scan the QR code.
          </Text>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
            <Text style={styles.permBtnText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelLink} onPress={() => router.replace('/(app)/(tabs)/home')}>
            <Text style={styles.cancelLinkText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scannedRef.current || scanState !== 'scanning') return;
    scannedRef.current = true;
    setScanState('loading');
    Vibration.vibrate(100);

    try {
      // Parse URL format QR code — extract token and signature
      let qrPayload = data;
      try {
        const url = new URL(data);
        const token = url.searchParams.get('token');
        const signature = url.searchParams.get('signature');
        if (token && signature) {
          qrPayload = JSON.stringify({ token, signature });
        }
      } catch {
        // Not a URL — use raw data as-is
      }

      // Get GPS coordinates — required if geofence is enabled on the org
      let latitude: number | undefined;
      let longitude: number | undefined;
      let accuracy: number | undefined;

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          latitude = loc.coords.latitude;
          longitude = loc.coords.longitude;
          accuracy = loc.coords.accuracy ?? undefined;
        }
      } catch {
        // Location failed — send without coords, backend will handle
      }

      const result = await apiPost<{ message: string; time: string }>(
        '/api/v1/attendance/scan',
        { qrPayload, latitude, longitude, accuracy }
      );

      setMessage(result.message ?? 'Success');
      setResultTime(
        result.time
          ? new Date(result.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : ''
      );
      setScanState('success');
      await fetchStatus();
      setTimeout(() => router.replace('/(app)/(tabs)/home'), 2500);
    } catch (err: unknown) {
      const msg =
        (err as any)?.response?.data?.error?.message ??
        (err as any)?.response?.data?.message ??
        'Scan failed. Please try again.';
      setMessage(msg);
      setScanState('error');
      setTimeout(() => {
        setScanState('scanning');
        scannedRef.current = false;
      }, 2500);
    }
  };

  return (
    <View style={styles.fullScreen}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanState === 'scanning' ? handleBarCodeScanned : undefined}
      />

      <View style={styles.overlay}>
        <View style={styles.overlayTop} />
        <View style={styles.overlayMiddle}>
          <View style={styles.overlaySide} />
          <View style={[
            styles.scanFrame,
            scanState === 'success' && styles.scanFrameSuccess,
            scanState === 'error' && styles.scanFrameError,
          ]}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <View style={styles.overlaySide} />
        </View>

        <View style={styles.overlayBottom}>
          {scanState === 'scanning' && (
            <Text style={styles.instruction}>Point at the attendance QR code</Text>
          )}
          {scanState === 'loading' && (
            <View style={styles.resultBox}>
              <ActivityIndicator color={Colors.white} />
              <Text style={styles.resultText}>Processing…</Text>
            </View>
          )}
          {scanState === 'success' && (
            <View style={styles.resultBox}>
              <Text style={styles.resultIcon}>✅</Text>
              <Text style={styles.resultText}>{message}</Text>
              {resultTime ? <Text style={styles.resultSub}>at {resultTime}</Text> : null}
            </View>
          )}
          {scanState === 'error' && (
            <View style={styles.resultBox}>
              <Text style={styles.resultIcon}>❌</Text>
              <Text style={styles.resultText}>{message}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.cancelBtn} onPress={() => router.replace('/(app)/(tabs)/home')}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>

      <SafeAreaView style={styles.topBar} edges={['top']}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/(app)/(tabs)/home')}>
          <Text style={styles.backBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>QR Check-in</Text>
      </SafeAreaView>
    </View>
  );
}

const FRAME_SIZE = 260;
const CORNER_SIZE = 28;
const CORNER_THICKNESS = 4;

const styles = StyleSheet.create({
  fullScreen: { flex: 1, backgroundColor: '#000' },
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  permIcon: { fontSize: 56, marginBottom: 16 },
  permTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, textAlign: 'center', marginBottom: 8 },
  permSub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  permBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 32 },
  permBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  cancelLink: { marginTop: 16 },
  cancelLinkText: { color: Colors.primary, fontSize: 15 },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  overlayTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  overlayMiddle: { flexDirection: 'row', height: FRAME_SIZE },
  overlaySide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  overlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', paddingTop: 32 },
  scanFrame: { width: FRAME_SIZE, height: FRAME_SIZE, borderRadius: 12 },
  scanFrameSuccess: { backgroundColor: 'rgba(22,163,74,0.15)' },
  scanFrameError: { backgroundColor: 'rgba(220,38,38,0.15)' },
  corner: { position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE, borderColor: Colors.white },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS, borderTopLeftRadius: 8 },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS, borderTopRightRadius: 8 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS, borderBottomRightRadius: 8 },
  instruction: { color: Colors.white, fontSize: 15, textAlign: 'center', paddingHorizontal: 32 },
  resultBox: { alignItems: 'center', paddingHorizontal: 32 },
  resultIcon: { fontSize: 40, marginBottom: 8 },
  resultText: { color: Colors.white, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  resultSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 },
  cancelBtn: { marginTop: 32, paddingVertical: 12, paddingHorizontal: 32, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  cancelBtnText: { color: Colors.white, fontSize: 15, fontWeight: '600' },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  backBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  topTitle: { flex: 1, textAlign: 'center', color: Colors.white, fontSize: 17, fontWeight: '700', marginRight: 36 },
});