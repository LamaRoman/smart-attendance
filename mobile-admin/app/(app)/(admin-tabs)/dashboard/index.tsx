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
import { todayBS } from '../../../../lib/nepali-date';

const ADMIN_PRIMARY = '#7C3AED';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

type EmployeeRecord = {
  id: string;
  userId: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  isLate: boolean;
  leaveType?: { name: string } | null;
  user?: {
    firstName: string;
    lastName: string;
    employeeId?: string;
  };
};

type GroupedData = {
  clockedIn: EmployeeRecord[];
  late: EmployeeRecord[];
  onLeave: EmployeeRecord[];
  absent: EmployeeRecord[];
};

function formatTime(iso: string | null | undefined) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function SectionHeader({
  label, count, icon, color, expanded, onToggle,
}: {
  label: string; count: number; icon: IoniconsName;
  color: string; expanded: boolean; onToggle: () => void;
}) {
  return (
    <TouchableOpacity style={[sh.wrap, { borderLeftColor: color }]} onPress={onToggle} activeOpacity={0.8}>
      <View style={[sh.iconWrap, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={sh.label}>{label}</Text>
      <View style={[sh.badge, { backgroundColor: color + '20' }]}>
        <Text style={[sh.badgeText, { color }]}>{count}</Text>
      </View>
      <Ionicons
        name={expanded ? 'chevron-up' : 'chevron-down'}
        size={16} color="#9CA3AF" style={{ marginLeft: 6 }}
      />
    </TouchableOpacity>
  );
}

const sh = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
    borderLeftWidth: 4, padding: 14, marginBottom: 6,
  },
  iconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  label: { flex: 1, fontSize: 14, fontWeight: '700', color: '#111827' },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 13, fontWeight: '700' },
});

function EmployeeCard({ record }: { record: EmployeeRecord }) {
  const name = `${record.user?.firstName ?? ''} ${record.user?.lastName ?? ''}`.trim() || '—';
  const empId = record.user?.employeeId ?? '—';
  return (
    <View style={ec.wrap}>
      <View style={ec.avatar}>
        <Text style={ec.avatarText}>{name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={ec.info}>
        <Text style={ec.name}>{name}</Text>
        <Text style={ec.sub}>{empId}</Text>
      </View>
      {record.checkInTime ? (
        <View style={ec.timeWrap}>
          <Text style={ec.timeLabel}>In</Text>
          <Text style={ec.time}>{formatTime(record.checkInTime)}</Text>
        </View>
      ) : record.leaveType ? (
        <View style={ec.leavePill}>
          <Text style={ec.leaveText}>{record.leaveType.name}</Text>
        </View>
      ) : null}
    </View>
  );
}

const ec = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9FAFB', borderRadius: 10,
    padding: 12, marginBottom: 6,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: ADMIN_PRIMARY, alignItems: 'center',
    justifyContent: 'center', marginRight: 10,
  },
  avatarText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  info: { flex: 1 },
  name: { fontSize: 13, fontWeight: '600', color: '#111827' },
  sub: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  timeWrap: { alignItems: 'flex-end' },
  timeLabel: { fontSize: 10, color: '#9CA3AF' },
  time: { fontSize: 13, fontWeight: '700', color: '#065F46' },
  leavePill: { backgroundColor: '#EDE9FE', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  leaveText: { fontSize: 11, fontWeight: '600', color: '#5B21B6' },
});

export default function AdminDashboard() {
  const { user, logout } = useAuthStore();
  const orgName = getOrgName(user);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingLeaves, setPendingLeaves] = useState(0);
  const [grouped, setGrouped] = useState<GroupedData>({
    clockedIn: [], late: [], onLeave: [], absent: [],
  });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    clockedIn: true, late: true, onLeave: false, absent: false,
  });

  const fetchData = async () => {
    try {
      const today = todayBS();
      const [attData, leaveData] = await Promise.allSettled([
        apiGet<any>(`/api/attendance?bsYear=${today.year}&bsMonth=${today.month}&bsDay=${today.day}`),
        apiGet<any>('/api/leaves?status=PENDING&limit=1'),
      ]);

      const records: EmployeeRecord[] = attData.status === 'fulfilled'
        ? (attData.value?.records ?? attData.value ?? []) : [];

      const pending = leaveData.status === 'fulfilled'
        ? (leaveData.value?.total ?? leaveData.value?.count ?? 0) : 0;

      setPendingLeaves(pending);
      setGrouped({
        clockedIn: records.filter(r => r.checkInTime && !r.isLate),
        late: records.filter(r => r.isLate),
        onLeave: records.filter(r => !r.checkInTime && r.leaveType),
        absent: records.filter(r => !r.checkInTime && !r.leaveType && !r.isLate),
      });
    } catch { /* non-critical */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);
  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const toggle = (key: string) =>
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const today = todayBS();
  const total = grouped.clockedIn.length + grouped.late.length + grouped.onLeave.length + grouped.absent.length;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ADMIN_PRIMARY} />}
      >
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerTop}>
            <View>
              <Text style={s.title}>Dashboard</Text>
              <Text style={s.orgName}>{orgName}</Text>
              <Text style={s.date}>{today.year}/{today.month}/{today.day} BS</Text>
            </View>
            <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="log-out-outline" size={24} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Summary pills */}
        {!loading && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pillsRow}>
            <View style={[s.pill, { backgroundColor: '#D1FAE5' }]}>
              <Text style={[s.pillNum, { color: '#065F46' }]}>{grouped.clockedIn.length}</Text>
              <Text style={[s.pillLabel, { color: '#065F46' }]}>On Time</Text>
            </View>
            <View style={[s.pill, { backgroundColor: '#FEF3C7' }]}>
              <Text style={[s.pillNum, { color: '#92400E' }]}>{grouped.late.length}</Text>
              <Text style={[s.pillLabel, { color: '#92400E' }]}>Late</Text>
            </View>
            <View style={[s.pill, { backgroundColor: '#EDE9FE' }]}>
              <Text style={[s.pillNum, { color: '#5B21B6' }]}>{grouped.onLeave.length}</Text>
              <Text style={[s.pillLabel, { color: '#5B21B6' }]}>On Leave</Text>
            </View>
            <View style={[s.pill, { backgroundColor: '#FEE2E2' }]}>
              <Text style={[s.pillNum, { color: '#991B1B' }]}>{grouped.absent.length}</Text>
              <Text style={[s.pillLabel, { color: '#991B1B' }]}>Absent</Text>
            </View>
            {pendingLeaves > 0 && (
              <View style={[s.pill, { backgroundColor: '#FFF7ED' }]}>
                <Text style={[s.pillNum, { color: '#C2410C' }]}>{pendingLeaves}</Text>
                <Text style={[s.pillLabel, { color: '#C2410C' }]}>Pending</Text>
              </View>
            )}
          </ScrollView>
        )}

        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator size="large" color={ADMIN_PRIMARY} />
          </View>
        ) : (
          <View style={s.sections}>

            {/* Clocked In */}
            <SectionHeader
              label="Clocked In" count={grouped.clockedIn.length}
              icon="checkmark-circle" color="#10B981"
              expanded={expanded.clockedIn}
              onToggle={() => toggle('clockedIn')}
            />
            {expanded.clockedIn && grouped.clockedIn.map(r => (
              <EmployeeCard key={r.id} record={r} />
            ))}
            {expanded.clockedIn && grouped.clockedIn.length === 0 && (
              <Text style={s.emptyText}>No employees clocked in yet</Text>
            )}

            <View style={s.gap} />

            {/* Late */}
            <SectionHeader
              label="Late Arrivals" count={grouped.late.length}
              icon="time" color="#F59E0B"
              expanded={expanded.late}
              onToggle={() => toggle('late')}
            />
            {expanded.late && grouped.late.map(r => (
              <EmployeeCard key={r.id} record={r} />
            ))}
            {expanded.late && grouped.late.length === 0 && (
              <Text style={s.emptyText}>No late arrivals today</Text>
            )}

            <View style={s.gap} />

            {/* On Leave */}
            <SectionHeader
              label="On Leave" count={grouped.onLeave.length}
              icon="calendar" color="#8B5CF6"
              expanded={expanded.onLeave}
              onToggle={() => toggle('onLeave')}
            />
            {expanded.onLeave && grouped.onLeave.map(r => (
              <EmployeeCard key={r.id} record={r} />
            ))}
            {expanded.onLeave && grouped.onLeave.length === 0 && (
              <Text style={s.emptyText}>No one on leave today</Text>
            )}

            <View style={s.gap} />

            {/* Absent */}
            <SectionHeader
              label="Absent" count={grouped.absent.length}
              icon="close-circle" color="#EF4444"
              expanded={expanded.absent}
              onToggle={() => toggle('absent')}
            />
            {expanded.absent && grouped.absent.map(r => (
              <EmployeeCard key={r.id} record={r} />
            ))}
            {expanded.absent && grouped.absent.length === 0 && (
              <Text style={s.emptyText}>No absences today</Text>
            )}

          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  orgName: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  date: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  logoutBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB',
    alignItems: 'center', justifyContent: 'center',
  },
  pillsRow: { paddingHorizontal: 16, paddingBottom: 16, gap: 8 },
  pill: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 12, alignItems: 'center', minWidth: 70,
  },
  pillNum: { fontSize: 20, fontWeight: '700' },
  pillLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  loadingBox: { height: 300, alignItems: 'center', justifyContent: 'center' },
  sections: { paddingHorizontal: 16 },
  gap: { height: 10 },
  emptyText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingVertical: 12 },
});