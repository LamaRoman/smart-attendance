import { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, getOrgName } from '../../../../store/auth.store';
import { useAttendanceStore } from '../../../../store/attendance.store';
import { Colors } from '../../../../constants/colors';
import { apiGet } from '../../../../lib/api';

function formatTime(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const orgName = getOrgName(user);
  const { status, isLoading, fetchStatus } = useAttendanceStore();
  const [refreshing, setRefreshing] = useState(false);
  const [quickStats, setQuickStats] = useState<{
    present: number;
    hoursToday: number;
  } | null>(null);
  const [todayRecord, setTodayRecord] = useState<{
    checkInTime: string | null;
    checkOutTime: string | null;
  } | null>(null);

  const fetchQuickStats = async () => {
    try {
      const attData = await apiGet<any>('/api/attendance/my?limit=60');
      const records: any[] = attData?.records ?? [];
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const present = records.filter((r: any) => {
        if (!r.checkInTime) return false;
        const d = new Date(r.checkInTime);
        return d >= monthStart && d <= now;
      }).length;

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayRec = records.find((r: any) => {
        if (!r.checkInTime) return false;
        return new Date(r.checkInTime) >= todayStart;
      });
      const hoursToday = todayRec?.duration
        ? Math.round((todayRec.duration / 60) * 10) / 10
        : 0;

      setQuickStats({ present, hoursToday });
    } catch { /* non-critical */ }
  };

  const fetchTodayRecord = async () => {
    try {
      const data = await apiGet<any>('/api/attendance/my?limit=5');
      const records = data?.records ?? [];
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const rec = records.find((r: any) => {
        if (!r.checkInTime) return false;
        return new Date(r.checkInTime) >= todayStart;
      });
      if (rec) {
        setTodayRecord({
          checkInTime: rec.checkInTime ?? null,
          checkOutTime: rec.checkOutTime ?? null,
        });
      } else {
        setTodayRecord(null);
      }
    } catch { /* non-critical */ }
  };

  const fetchAll = useCallback(async () => {
    await Promise.all([fetchStatus(), fetchQuickStats(), fetchTodayRecord()]);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  const attendanceMode = user?.organization?.attendanceMode ?? 'BOTH';

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  const statusRecordIsToday = status?.record?.checkInTime
    ? new Date(status.record.checkInTime) >= todayMidnight
    : false;

  const isClockedIn = (status?.isClockedIn ?? false) && statusRecordIsToday;
  const elapsedFormatted = isClockedIn ? (status?.currentDuration?.formatted ?? null) : null;
  const checkInTime = todayRecord?.checkInTime ?? null;
  const checkOutTime = todayRecord?.checkOutTime ?? null;
  const attendanceComplete = !!(checkInTime && checkOutTime);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.slate900} />
        }
      >
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerTop}>
            <View style={s.headerLeft}>
              <View style={s.headerLogoBox}>
                <Ionicons name="shield-checkmark" size={16} color={Colors.white} />
              </View>
              <View>
                <Text style={s.headerTitle}>My Attendance</Text>
                <Text style={s.headerSub}>{user ? `${user.firstName} ${user.lastName}` : '—'}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={s.headerBtn}
              onPress={handleLogout}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="log-out-outline" size={18} color={Colors.slate400} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.content}>
          {/* Status Card */}
          {isLoading && !status ? (
            <View style={s.loadingCard}>
              <ActivityIndicator color={Colors.slate900} size="large" />
            </View>
          ) : (
            <View style={[s.statusCard, isClockedIn ? s.statusCardActive : s.statusCardInactive]}>
              {isClockedIn ? (
                <>
                  <View style={s.statusIconCircleActive}>
                    <Ionicons name="checkmark-circle" size={36} color={Colors.white} />
                  </View>
                  <Text style={s.statusTextActive}>Clocked In</Text>
                  <Text style={s.statusSubActive}>
                    Since {formatTime(checkInTime)}
                  </Text>
                  {elapsedFormatted && (
                    <View style={s.durationPill}>
                      <Ionicons name="timer-outline" size={16} color={Colors.white} />
                      <Text style={s.durationText}>{elapsedFormatted}</Text>
                    </View>
                  )}
                </>
              ) : (
                <>
                  <View style={s.statusIconCircleInactive}>
                    <Ionicons name="time-outline" size={36} color={Colors.slate400} />
                  </View>
                  <Text style={s.statusTextInactive}>Not Clocked In</Text>
                  <Text style={s.statusSubInactive}>
                    Tap below to clock in
                  </Text>
                </>
              )}
            </View>
          )}

          {/* Check-in Methods */}
          {attendanceComplete ? (
            <View style={s.clockBtnDone}>
              <Ionicons name="checkmark-done" size={18} color={Colors.white} />
              <Text style={s.clockBtnText}>Attendance Complete</Text>
            </View>
          ) : attendanceMode === 'BOTH' ? (
            <View style={s.methodRow}>
              <TouchableOpacity
                style={s.methodCard}
                onPress={() => router.push('/(app)/attendance/scan')}
                activeOpacity={0.85}
              >
                <View style={[s.methodIconWrap, { backgroundColor: Colors.slate100 }]}>
                  <Ionicons name="qr-code-outline" size={22} color={Colors.slate900} />
                </View>
                <Text style={s.methodLabel}>
                  {isClockedIn ? 'QR Clock Out' : 'QR Scan'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.methodCard}
                onPress={() => router.push('/(app)/attendance/gps-checkin')}
                activeOpacity={0.85}
              >
                <View style={[s.methodIconWrap, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="location-outline" size={22} color={Colors.success} />
                </View>
                <Text style={s.methodLabel}>
                  {isClockedIn ? 'GPS Clock Out' : 'GPS Check-in'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[s.clockBtn, isClockedIn ? s.clockBtnOut : s.clockBtnIn]}
              onPress={() => router.push(
                attendanceMode === 'QR_ONLY'
                  ? '/(app)/attendance/scan'
                  : '/(app)/attendance/gps-checkin'
              )}
              activeOpacity={0.85}
            >
              <Ionicons
                name={attendanceMode === 'QR_ONLY' ? 'qr-code-outline' : 'location-outline'}
                size={20}
                color={Colors.white}
              />
              <Text style={s.clockBtnText}>
                {isClockedIn ? 'Clock Out' : 'Clock In'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Times Card */}
          <View style={s.card}>
            <View style={s.timesRow}>
              <View style={s.timeItem}>
                <Text style={s.timeLabel}>Clock In</Text>
                <Text style={s.timeValue}>{formatTime(checkInTime)}</Text>
              </View>
              <View style={s.timeDivider} />
              <View style={s.timeItem}>
                <Text style={s.timeLabel}>Clock Out</Text>
                <Text style={s.timeValue}>{formatTime(checkOutTime)}</Text>
              </View>
            </View>
          </View>

          {/* Quick Stats */}
          <View style={s.statsRow}>
            <View style={s.statCard}>
              <View style={s.statIconWrap}>
                <Ionicons name="calendar-outline" size={16} color={Colors.slate900} />
              </View>
              <Text style={s.statValue}>{quickStats ? String(quickStats.present) : '—'}</Text>
              <Text style={s.statLabel}>Days this month</Text>
            </View>
            <View style={s.statCard}>
              <View style={[s.statIconWrap, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="timer-outline" size={16} color={Colors.success} />
              </View>
              <Text style={s.statValue}>
                {quickStats && quickStats.hoursToday > 0 ? `${quickStats.hoursToday}h` : '—'}
              </Text>
              <Text style={s.statLabel}>Hours today</Text>
            </View>
          </View>

          {/* Quick Links */}
          <View style={s.linksGrid}>
            <TouchableOpacity style={s.linkCard} onPress={() => router.push('/(app)/(tabs)/leaves')}>
              <View style={[s.linkIconWrap, { backgroundColor: Colors.slate100 }]}>
                <Ionicons name="calendar" size={18} color={Colors.slate900} />
              </View>
              <Text style={s.linkText}>Request Leave</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.linkCard} onPress={() => router.push('/(app)/(tabs)/profile')}>
              <View style={[s.linkIconWrap, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons name="person" size={18} color="#2563EB" />
              </View>
              <Text style={s.linkText}>My Profile</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 32 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.slate50 },

  // Header
  header: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerLogoBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.slate900,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.slate900,
  },
  headerSub: {
    fontSize: 12,
    color: Colors.slate500,
    marginTop: 1,
  },
  headerBtn: {
    padding: 8,
    borderRadius: 10,
  },

  // Content
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // Loading
  loadingCard: {
    height: 200,
    backgroundColor: Colors.white,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.slate200,
  },

  // Status Card
  statusCard: {
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
    overflow: 'hidden',
  },
  statusCardActive: {
    backgroundColor: '#16A34A',
  },
  statusCardInactive: {
    backgroundColor: Colors.slate100,
  },
  statusIconCircleActive: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  statusIconCircleInactive: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  statusTextActive: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.white,
  },
  statusTextInactive: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.slate700,
  },
  statusSubActive: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  statusSubInactive: {
    fontSize: 13,
    color: Colors.slate500,
    marginTop: 4,
  },
  durationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 16,
  },
  durationText: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.white,
  },

  // Check-in Methods
  methodRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  methodCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.slate200,
    paddingVertical: 18,
    gap: 10,
  },
  methodIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.slate900,
  },

  // Clock Button (single mode)
  clockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 12,
  },
  clockBtnIn: {
    backgroundColor: Colors.slate900,
  },
  clockBtnOut: {
    backgroundColor: '#EA580C',
  },
  clockBtnDone: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 12,
    backgroundColor: Colors.slate300,
  },
  clockBtnText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '600',
  },

  // Times Card
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.slate200,
    marginTop: 12,
    overflow: 'hidden',
  },
  timesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  timeItem: { flex: 1, alignItems: 'center' },
  timeLabel: {
    fontSize: 12,
    color: Colors.slate500,
    fontWeight: '500',
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.slate900,
  },
  timeDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.slate200,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.slate200,
    padding: 16,
  },
  statIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.slate900,
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.slate500,
    fontWeight: '500',
  },

  // Quick Links
  linksGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  linkCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.slate200,
    padding: 14,
  },
  linkIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.slate700,
  },
});
