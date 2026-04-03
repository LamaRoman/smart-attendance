import { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
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
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <View style={s.statCard}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statSub}>{sub}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const orgName = getOrgName(user);
  const { status, isLoading, fetchStatus } = useAttendanceStore();
  const [refreshing, setRefreshing] = useState(false);
  const [quickStats, setQuickStats] = useState<{
    present: number;
    leaveBalance: number;
  } | null>(null);
  const [todayRecord, setTodayRecord] = useState<{
    checkInTime: string | null;
    checkOutTime: string | null;
  } | null>(null);

  const fetchQuickStats = async () => {
    try {
      // Fetch last 60 records and count by checkInTime date
      // instead of bsYear/bsMonth to support records without BS fields
      const attData = await apiGet<any>('/api/attendance/my?limit=60');
      const records: any[] = attData?.records ?? [];

      // Count days present this month by checkInTime
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const present = records.filter((r: any) => {
        if (!r.checkInTime) return false;
        const d = new Date(r.checkInTime);
        return d >= monthStart && d <= now;
      }).length;

      // Hours worked today from todayRecord duration field
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayRec = records.find((r: any) => {
        if (!r.checkInTime) return false;
        return new Date(r.checkInTime) >= todayStart;
      });
      const hoursToday = todayRec?.duration
        ? Math.round((todayRec.duration / 60) * 10) / 10
        : null;

      setQuickStats({ present, leaveBalance: hoursToday ?? 0 });
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

  const handleClockAction = () => {
    const mode = user?.organization?.attendanceMode ?? 'BOTH';
    if (mode === 'QR_ONLY') {
      router.push('/(app)/attendance/scan');
    } else {
      router.push('/(app)/attendance/gps-checkin');
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  // Only treat as clocked in if the open record is from TODAY
  // Stale CHECKED_IN records from missed midnight cron are ignored
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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerTop}>
            <View>
              <Text style={s.greeting}>Good {getGreeting()},</Text>
              <Text style={s.userName}>
                {user ? `${user.firstName} ${user.lastName}` : '—'}
              </Text>
              <Text style={s.orgName}>{orgName}</Text>
            </View>
            <TouchableOpacity
              style={s.logoutBtn}
              onPress={handleLogout}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="log-out-outline" size={24} color={Colors.error} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Clock-in card */}
        {isLoading && !status ? (
          <View style={s.loadingCard}>
            <ActivityIndicator color={Colors.primary} size="large" />
          </View>
        ) : (
          <View style={s.clockCard}>
            {/* Circle */}
            <View style={[s.circle, isClockedIn ? s.circleGreen : s.circleGray]}>
              <Text style={s.circleEmoji}>{isClockedIn ? '✅' : '⏸'}</Text>
              <Text
                style={[
                  s.circleStatus,
                  isClockedIn ? s.circleStatusGreen : s.circleStatusGray,
                ]}
              >
                {isClockedIn ? 'Clocked In' : 'Not Clocked\nIn'}
              </Text>
              {isClockedIn && elapsedFormatted ? (
                <Text style={s.circleElapsed}>{elapsedFormatted}</Text>
              ) : null}
            </View>

            {/* Times row */}
            <View style={s.timesRow}>
              <View style={s.timeItem}>
                <Text style={s.timeItemLabel}>Clock In</Text>
                <Text style={s.timeItemValue}>{formatTime(checkInTime)}</Text>
              </View>
              <View style={s.timeDivider} />
              <View style={s.timeItem}>
                <Text style={s.timeItemLabel}>Clock Out</Text>
                <Text style={s.timeItemValue}>{formatTime(checkOutTime)}</Text>
              </View>
            </View>

            {/* Action button */}
            {attendanceComplete ? (
              <View style={[s.clockBtn, s.clockBtnDone]}>
                <Text style={s.clockBtnText}>Attendance Complete</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[s.clockBtn, isClockedIn ? s.clockBtnOut : s.clockBtnIn]}
                onPress={handleClockAction}
                activeOpacity={0.85}
              >
                <Text style={s.clockBtnText}>
                  {isClockedIn ? '⏹  Clock Out' : '▶  Clock In'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Quick stats */}
        <View style={s.statsRow}>
          <StatCard
            label="This Month"
            value={quickStats ? String(quickStats.present) : '—'}
            sub="days present"
          />
          <StatCard
            label="Hours Today"
            value={quickStats && quickStats.leaveBalance > 0 ? `${quickStats.leaveBalance}h` : '—'}
            sub="hours worked"
          />
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const CIRCLE_SIZE = 180;

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  greeting: { fontSize: 14, color: Colors.textSecondary },
  userName: { fontSize: 22, fontWeight: '700', color: Colors.text, marginTop: 2 },
  orgName: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  loadingCard: {
    marginHorizontal: 20,
    height: 300,
    backgroundColor: Colors.card,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockCard: {
    marginHorizontal: 20,
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 6,
  },
  circleGreen: { backgroundColor: Colors.successLight, borderColor: Colors.success },
  circleGray: { backgroundColor: Colors.gray100, borderColor: Colors.gray300 },
  circleEmoji: { fontSize: 32, marginBottom: 4 },
  circleStatus: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 18,
  },
  circleStatusGreen: { color: Colors.success },
  circleStatusGray: { color: Colors.gray500 },
  circleElapsed: {
    fontSize: 13,
    color: Colors.success,
    fontWeight: '600',
    marginTop: 4,
  },
  timesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
    backgroundColor: Colors.gray50,
    borderRadius: 12,
    padding: 16,
  },
  timeItem: { flex: 1, alignItems: 'center' },
  timeItemLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
    marginBottom: 4,
  },
  timeItemValue: { fontSize: 18, fontWeight: '700', color: Colors.text },
  timeDivider: { width: 1, height: 36, backgroundColor: Colors.border },
  clockBtn: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  clockBtnIn: { backgroundColor: Colors.primary },
  clockBtnOut: { backgroundColor: Colors.error },
  clockBtnDone: { backgroundColor: Colors.error, opacity: 0.5 },
  clockBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statLabel: { fontSize: 12, color: Colors.textMuted, marginBottom: 4 },
  statValue: { fontSize: 24, fontWeight: '700', color: Colors.text },
  statSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
});