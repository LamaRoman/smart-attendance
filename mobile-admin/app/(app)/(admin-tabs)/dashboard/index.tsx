import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  RefreshControl, ActivityIndicator, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, getOrgName } from '../../../../store/auth.store';
import { Colors } from '../../../../constants/colors';
import { apiGet } from '../../../../lib/api';
import { todayBS, BS_MONTHS_EN } from '../../../../lib/nepali-date';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

type EmployeeRecord = {
  id: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  isLate: boolean;
  leaveType?: { name: string } | null;
  user?: { firstName: string; lastName: string; employeeId?: string };
};

function formatTime(iso: string | null | undefined) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function AdminDashboard() {
  const { user, logout } = useAuthStore();
  const orgName = getOrgName(user);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingLeaves, setPendingLeaves] = useState(0);
  const [records, setRecords] = useState<EmployeeRecord[]>([]);

  const fetchData = async () => {
    setError('');
    try {
      const today = todayBS();
      const [attData, leaveData] = await Promise.allSettled([
        apiGet<any>(`/api/v1/attendance?bsYear=${today.year}&bsMonth=${today.month}&bsDay=${today.day}`),
        apiGet<any>('/api/v1/leaves?status=PENDING&limit=1'),
      ]);

      const rawRecords: EmployeeRecord[] = attData.status === 'fulfilled'
        ? (attData.value?.records ?? attData.value ?? []) : [];

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      setRecords(rawRecords.filter((r) => {
        if (!r.checkInTime) return true;
        return new Date(r.checkInTime) >= todayStart;
      }));

      setPendingLeaves(
        leaveData.status === 'fulfilled'
          ? (leaveData.value?.pagination?.total ?? leaveData.value?.total ?? 0)
          : 0
      );
    } catch (err: any) {
      console.error('Dashboard fetch error:', err?.response?.data ?? err?.message);
      setError(err?.response?.data?.error?.message ?? 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const today = todayBS();
  const dateStr = `${today.day} ${BS_MONTHS_EN[today.month - 1]} ${today.year}`;

  const onTime = records.filter(r => r.checkInTime && !r.isLate).length;
  const late = records.filter(r => r.isLate).length;
  const onLeave = records.filter(r => !r.checkInTime && r.leaveType).length;
  const absent = records.filter(r => !r.checkInTime && !r.leaveType && !r.isLate).length;

  // Recent activity — last 5 clock-ins
  const recentClockIns = records
    .filter(r => r.checkInTime)
    .sort((a, b) => new Date(b.checkInTime!).getTime() - new Date(a.checkInTime!).getTime())
    .slice(0, 5);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.slate900} />}
      >
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerRow}>
            <View style={s.logoBox}>
              <Ionicons name="shield-checkmark" size={16} color={Colors.white} />
            </View>
            <View>
              <Text style={s.headerTitle}>{orgName}</Text>
              <Text style={s.headerDate}>{dateStr} BS</Text>
            </View>
          </View>
          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color={Colors.slate400} />
          </TouchableOpacity>
        </View>

        <View style={s.content}>
          {loading ? (
            <View style={s.loadingBox}>
              <ActivityIndicator size="large" color={Colors.slate900} />
            </View>
          ) : error ? (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle-outline" size={40} color={Colors.slate300} />
              <Text style={s.errorText}>{error}</Text>
              <TouchableOpacity style={s.retryBtn} onPress={fetchData}>
                <Text style={s.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Stats row */}
              <View style={s.statsRow}>
                <View style={s.statCard}>
                  <Text style={[s.statNum, { color: '#065F46' }]}>{onTime}</Text>
                  <Text style={s.statLabel}>On Time</Text>
                </View>
                <View style={s.statCard}>
                  <Text style={[s.statNum, { color: '#92400E' }]}>{late}</Text>
                  <Text style={s.statLabel}>Late</Text>
                </View>
                <View style={s.statCard}>
                  <Text style={[s.statNum, { color: '#5B21B6' }]}>{onLeave}</Text>
                  <Text style={s.statLabel}>Leave</Text>
                </View>
                <View style={s.statCard}>
                  <Text style={[s.statNum, { color: '#991B1B' }]}>{absent}</Text>
                  <Text style={s.statLabel}>Absent</Text>
                </View>
              </View>

              {/* Pending leaves banner */}
              {pendingLeaves > 0 && (
                <View style={s.pendingBanner}>
                  <Ionicons name="alert-circle" size={18} color="#EA580C" />
                  <Text style={s.pendingText}>
                    {pendingLeaves} leave request{pendingLeaves > 1 ? 's' : ''} pending
                  </Text>
                </View>
              )}

              {/* Recent activity */}
              <Text style={s.sectionTitle}>Recent Activity</Text>
              {recentClockIns.length === 0 ? (
                <View style={s.emptyCard}>
                  <Text style={s.emptyText}>No clock-ins yet today</Text>
                </View>
              ) : (
                <View style={s.activityCard}>
                  {recentClockIns.map((r, i) => {
                    const name = `${r.user?.firstName ?? ''} ${r.user?.lastName ?? ''}`.trim() || '—';
                    return (
                      <View key={r.id} style={[s.actRow, i < recentClockIns.length - 1 && s.actRowBorder]}>
                        <View style={[s.actAvatar, r.isLate && { backgroundColor: '#F59E0B' }]}>
                          <Text style={s.actAvatarText}>{name.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={s.actInfo}>
                          <Text style={s.actName}>{name}</Text>
                          <Text style={s.actSub}>{r.user?.employeeId ?? '—'}</Text>
                        </View>
                        <View style={s.actTimeWrap}>
                          <Text style={s.actTime}>{formatTime(r.checkInTime)}</Text>
                          {r.isLate && <Text style={s.actLate}>Late</Text>}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          )}
        </View>
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.slate50 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.slate100,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBox: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: Colors.slate900, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 15, fontWeight: '700', color: Colors.slate900 },
  headerDate: { fontSize: 12, color: Colors.slate500, marginTop: 1 },
  logoutBtn: { padding: 8, borderRadius: 10 },
  content: { padding: 16 },
  loadingBox: { height: 200, alignItems: 'center', justifyContent: 'center' },
  errorBox: { alignItems: 'center', paddingTop: 60, gap: 8 },
  errorText: { fontSize: 14, color: Colors.slate500 },
  retryBtn: { backgroundColor: Colors.slate900, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 8, marginTop: 8 },
  retryText: { color: Colors.white, fontWeight: '600', fontSize: 13 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statCard: {
    flex: 1, backgroundColor: Colors.white, borderRadius: 12,
    padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.slate200,
  },
  statNum: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 11, fontWeight: '600', color: Colors.slate400, marginTop: 2 },
  pendingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFF7ED', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#FED7AA', marginBottom: 16,
  },
  pendingText: { fontSize: 13, fontWeight: '600', color: '#EA580C' },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: Colors.slate400,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 4,
  },
  emptyCard: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 32,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.slate200,
  },
  emptyText: { fontSize: 14, color: Colors.slate400 },
  activityCard: {
    backgroundColor: Colors.white, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.slate200, overflow: 'hidden',
  },
  actRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  actRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.slate100 },
  actAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.slate900, alignItems: 'center',
    justifyContent: 'center', marginRight: 10,
  },
  actAvatarText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  actInfo: { flex: 1 },
  actName: { fontSize: 14, fontWeight: '600', color: Colors.slate900 },
  actSub: { fontSize: 11, color: Colors.slate400, marginTop: 1 },
  actTimeWrap: { alignItems: 'flex-end' },
  actTime: { fontSize: 14, fontWeight: '700', color: Colors.slate900 },
  actLate: { fontSize: 10, fontWeight: '700', color: '#F59E0B', marginTop: 2 },
});
