import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiGet } from '../../../../lib/api';
import { todayBS, BS_MONTHS_EN } from '../../../../lib/nepali-date';
import { Colors } from '../../../../constants/colors';

type AttRecord = {
  id: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: string;
  isLate: boolean;
  duration: number | null;
  user?: { firstName: string; lastName: string; employeeId?: string };
};

function formatTime(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function statusColor(status: string, isLate: boolean) {
  if (isLate) return { bg: '#FEF3C7', text: '#92400E', label: 'Late' };
  if (status === 'CHECKED_IN') return { bg: '#D1FAE5', text: '#065F46', label: 'Working' };
  if (status === 'CHECKED_OUT') return { bg: '#DBEAFE', text: '#1E40AF', label: 'Completed' };
  if (status === 'AUTO_CLOSED') return { bg: '#FEE2E2', text: '#991B1B', label: 'Auto-Closed' };
  return { bg: Colors.slate100, text: Colors.slate500, label: status };
}

export default function AttendanceScreen() {
  const [records, setRecords] = useState<AttRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setError('');
    try {
      const today = todayBS();
      const data = await apiGet<any>(
        `/api/attendance?bsYear=${today.year}&bsMonth=${today.month}&bsDay=${today.day}&limit=50`
      );
      // Backend returns { records: [...], pagination: {...} } or just array
      let recs: AttRecord[] = [];
      if (data?.records && Array.isArray(data.records)) {
        recs = data.records;
      } else if (Array.isArray(data)) {
        recs = data;
      }
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const filtered = recs.filter((r) => {
        if (!r.checkInTime) return false;
        return new Date(r.checkInTime) >= todayStart;
      });
      setRecords(filtered);
    } catch (err: any) {
      console.error('Attendance fetch error:', err?.response?.data ?? err?.message);
      setError(err?.response?.data?.error?.message ?? 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => {
    setLoading(true);
    fetchData();
  }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const today = todayBS();
  const dateStr = `${today.day} ${BS_MONTHS_EN[today.month - 1]} ${today.year}`;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <View style={s.headerRow}>
          <View style={s.logoBox}>
            <Ionicons name="time" size={16} color={Colors.white} />
          </View>
          <View>
            <Text style={s.title}>Attendance</Text>
            <Text style={s.subtitle}>Today — {dateStr} BS</Text>
          </View>
        </View>
      </View>

      {!loading && !error && (
        <View style={s.summaryRow}>
          <View style={[s.summaryCard, { backgroundColor: '#D1FAE5' }]}>
            <Text style={[s.summaryNum, { color: '#065F46' }]}>{records.length}</Text>
            <Text style={[s.summaryLabel, { color: '#065F46' }]}>Checked In</Text>
          </View>
          <View style={[s.summaryCard, { backgroundColor: '#FEF3C7' }]}>
            <Text style={[s.summaryNum, { color: '#92400E' }]}>{records.filter(r => r.isLate).length}</Text>
            <Text style={[s.summaryLabel, { color: '#92400E' }]}>Late</Text>
          </View>
          <View style={[s.summaryCard, { backgroundColor: '#DBEAFE' }]}>
            <Text style={[s.summaryNum, { color: '#1E40AF' }]}>
              {records.filter(r => r.status === 'CHECKED_OUT').length}
            </Text>
            <Text style={[s.summaryLabel, { color: '#1E40AF' }]}>Done</Text>
          </View>
        </View>
      )}

      {loading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator size="large" color={Colors.slate900} />
        </View>
      ) : error ? (
        <View style={s.errorBox}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.slate300} />
          <Text style={s.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.slate900} />}
          contentContainerStyle={s.list}
        >
          {records.length === 0 ? (
            <View style={s.emptyBox}>
              <Ionicons name="calendar-outline" size={48} color={Colors.slate300} />
              <Text style={s.emptyText}>No attendance records for today</Text>
            </View>
          ) : (
            records.map((r) => {
              const name = `${r.user?.firstName ?? ''} ${r.user?.lastName ?? ''}`.trim() || '—';
              const sc = statusColor(r.status, r.isLate);
              const hours = r.duration ? Math.round(r.duration / 60 * 10) / 10 : null;
              return (
                <View key={r.id} style={s.card}>
                  <View style={s.cardTop}>
                    <View style={s.avatar}>
                      <Text style={s.avatarText}>{name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={s.cardInfo}>
                      <Text style={s.cardName}>{name}</Text>
                      <Text style={s.cardEmpId}>{r.user?.employeeId ?? '—'}</Text>
                    </View>
                    <View style={[s.statusPill, { backgroundColor: sc.bg }]}>
                      <Text style={[s.statusText, { color: sc.text }]}>{sc.label}</Text>
                    </View>
                  </View>
                  <View style={s.cardTimes}>
                    <View style={s.timeBlock}>
                      <Text style={s.timeLabel}>In</Text>
                      <Text style={s.timeVal}>{formatTime(r.checkInTime)}</Text>
                    </View>
                    <View style={s.timeDivider} />
                    <View style={s.timeBlock}>
                      <Text style={s.timeLabel}>Out</Text>
                      <Text style={s.timeVal}>{formatTime(r.checkOutTime)}</Text>
                    </View>
                    {hours !== null && (
                      <>
                        <View style={s.timeDivider} />
                        <View style={s.timeBlock}>
                          <Text style={s.timeLabel}>Hours</Text>
                          <Text style={s.timeVal}>{hours}h</Text>
                        </View>
                      </>
                    )}
                  </View>
                </View>
              );
            })
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.slate50 },
  header: {
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.slate100,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBox: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: Colors.slate900, alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 15, fontWeight: '700', color: Colors.slate900 },
  subtitle: { fontSize: 12, color: Colors.slate500, marginTop: 1 },
  summaryRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  summaryCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  summaryNum: { fontSize: 22, fontWeight: '700' },
  summaryLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  errorBox: { alignItems: 'center', paddingTop: 80, gap: 8 },
  errorText: { fontSize: 14, color: Colors.slate500 },
  list: { paddingHorizontal: 16 },
  emptyBox: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 14, color: Colors.slate400, marginTop: 12 },
  card: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: Colors.slate200,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.slate900, alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '600', color: Colors.slate900 },
  cardEmpId: { fontSize: 12, color: Colors.slate400, marginTop: 1 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardTimes: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.slate50, borderRadius: 10, padding: 12,
  },
  timeBlock: { flex: 1, alignItems: 'center' },
  timeLabel: { fontSize: 11, color: Colors.slate400, fontWeight: '600' },
  timeVal: { fontSize: 15, fontWeight: '700', color: Colors.slate900, marginTop: 2 },
  timeDivider: { width: 1, height: 28, backgroundColor: Colors.slate200 },
});
