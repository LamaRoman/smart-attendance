import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiGet, apiDelete } from '../../../../lib/api';
import { Colors } from '../../../../constants/colors';
import { BS_MONTHS_EN, todayBS } from '../../../../lib/nepali-date';

interface BalanceData {
  bsYear: number;
  membershipId: string;
  annualEntitlement: number; sickEntitlement: number; casualEntitlement: number;
  annualCarriedOver: number; sickCarriedOver: number; casualCarriedOver: number;
  annualUsed: number; sickUsed: number; casualUsed: number;
  annualAvailable: number; sickAvailable: number; casualAvailable: number;
}

interface LeaveRecord {
  id: string; type: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  startDate: string; endDate: string;
  bsStartYear: number | null; bsStartMonth: number | null; bsStartDay: number | null;
  bsEndYear: number | null; bsEndMonth: number | null; bsEndDay: number | null;
  reason: string; rejectionMessage: string | null;
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
  ANNUAL: 'Annual', SICK: 'Sick', CASUAL: 'Casual',
  MATERNITY: 'Maternity', PATERNITY: 'Paternity', UNPAID: 'Unpaid',
};
const STATUS_FILTERS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const;

function statusStyle(status: string) {
  if (status === 'PENDING') return { bg: '#FEF9C3', text: '#92400E' };
  if (status === 'APPROVED') return { bg: '#DCFCE7', text: '#065F46' };
  if (status === 'REJECTED') return { bg: '#FEE2E2', text: '#991B1B' };
  return { bg: Colors.slate100, text: Colors.slate600 };
}

function formatDateRange(r: LeaveRecord): string {
  if (r.bsStartYear && r.bsStartMonth && r.bsStartDay) {
    const start = `${r.bsStartDay} ${BS_MONTHS_EN[r.bsStartMonth - 1]} ${r.bsStartYear}`;
    if (r.bsEndDay === r.bsStartDay && r.bsEndMonth === r.bsStartMonth) return start;
    if (r.bsEndYear && r.bsEndMonth && r.bsEndDay)
      return `${start} – ${r.bsEndDay} ${BS_MONTHS_EN[r.bsEndMonth - 1]}`;
  }
  const s = new Date(r.startDate).toLocaleDateString([], { month: 'short', day: 'numeric' });
  const e = new Date(r.endDate).toLocaleDateString([], { month: 'short', day: 'numeric' });
  return s === e ? s : `${s} – ${e}`;
}

function countDays(r: LeaveRecord): number {
  return Math.ceil((new Date(r.endDate).getTime() - new Date(r.startDate).getTime()) / 86400000) + 1;
}

function BalanceCard({ data }: { data: BalanceData }) {
  const items = [
    { label: 'Annual', available: data.annualAvailable, total: data.annualEntitlement, icon: 'sunny-outline' as const, color: '#EA580C' },
    { label: 'Sick', available: data.sickAvailable, total: data.sickEntitlement, icon: 'medkit-outline' as const, color: '#DC2626' },
    { label: 'Casual', available: data.casualAvailable, total: data.casualEntitlement, icon: 'leaf-outline' as const, color: '#16A34A' },
  ];
  return (
    <View style={s.balanceCard}>
      <Text style={s.balanceTitle}>Leave Balance — BS {data.bsYear}</Text>
      <View style={s.balanceRow}>
        {items.map(item => (
          <View key={item.label} style={s.balanceItem}>
            <View style={[s.balanceIconWrap, { backgroundColor: item.color + '15' }]}>
              <Ionicons name={item.icon} size={16} color={item.color} />
            </View>
            <Text style={s.balanceVal}>{item.available}</Text>
            <Text style={s.balanceLbl}>{item.label}</Text>
            <Text style={s.balanceUsed}>{data[`${item.label.toLowerCase()}Used` as keyof BalanceData] as number}/{item.total}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function LeaveRow({ item, onCancel }: { item: LeaveRecord; onCancel: (id: string) => void }) {
  const days = countDays(item);
  const ss = statusStyle(item.status);
  return (
    <View style={s.card}>
      <View style={s.cardTop}>
        <View style={s.typeRow}>
          <Text style={s.typeName}>{LEAVE_TYPE_LABELS[item.type] ?? item.type}</Text>
          <Text style={s.typeDays}>{days}d</Text>
        </View>
        <View style={[s.statusPill, { backgroundColor: ss.bg }]}>
          <Text style={[s.statusText, { color: ss.text }]}>
            {item.status.charAt(0) + item.status.slice(1).toLowerCase()}
          </Text>
        </View>
      </View>
      <View style={s.dateRow}>
        <Ionicons name="calendar-outline" size={13} color={Colors.slate400} />
        <Text style={s.dates}>{formatDateRange(item)}</Text>
      </View>
      {item.reason ? <Text style={s.reason} numberOfLines={2}>{item.reason}</Text> : null}
      {item.status === 'REJECTED' && item.rejectionMessage ? (
        <View style={s.rejection}>
          <Ionicons name="alert-circle" size={13} color="#991B1B" />
          <Text style={s.rejectionText}>{item.rejectionMessage}</Text>
        </View>
      ) : null}
      {item.status === 'PENDING' && (
        <TouchableOpacity style={s.cancelBtn} onPress={() => onCancel(item.id)}>
          <Text style={s.cancelBtnText}>Cancel Request</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function LeavesScreen() {
  const router = useRouter();
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [filter, setFilter] = useState<typeof STATUS_FILTERS[number]>('ALL');
  const [featureDisabled, setFeatureDisabled] = useState(false);

  const loadBalance = useCallback(async () => {
    setBalanceLoading(true);
    try {
      const today = todayBS();
      const data = await apiGet<BalanceData | null>(`/api/leave-balance/my?bsYear=${today.year}`);
      setBalance(data ?? null);
    } catch (err: any) {
      if (err?.response?.status === 403) setFeatureDisabled(true);
    } finally { setBalanceLoading(false); }
  }, []);

  const loadLeaves = useCallback(async (status: string) => {
    setLoading(true);
    try {
      const params = status !== 'ALL' ? `?status=${status}&limit=50` : '?limit=50';
      const data = await apiGet<any>(`/api/leaves/my${params}`);
      setLeaves(Array.isArray(data) ? data : data.leaves ?? []);
    } catch (err: any) {
      if (err?.response?.status === 403) setFeatureDisabled(true);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadBalance(); loadLeaves('ALL'); }, []);
  useEffect(() => { loadLeaves(filter); }, [filter]);

  const handleCancel = (id: string) => {
    Alert.alert('Cancel Leave', 'Are you sure you want to cancel this request?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel', style: 'destructive',
        onPress: async () => {
          try { await apiDelete(`/api/leaves/${id}`); loadLeaves(filter); loadBalance(); }
          catch { Alert.alert('Error', 'Failed to cancel.'); }
        },
      },
    ]);
  };

  if (featureDisabled) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <Ionicons name="lock-closed" size={40} color={Colors.slate300} />
          <Text style={s.disabledTitle}>Leave Management</Text>
          <Text style={s.disabledSub}>This feature is not enabled for your organization.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.headerIcon}>
            <Ionicons name="calendar" size={16} color={Colors.white} />
          </View>
          <Text style={s.headerTitle}>Leaves</Text>
        </View>
        <TouchableOpacity
          style={s.requestBtn}
          onPress={() => router.push('/(app)/(tabs)/leaves/request')}
        >
          <Ionicons name="add" size={16} color={Colors.white} />
          <Text style={s.requestBtnText}>Request</Text>
        </TouchableOpacity>
      </View>

      {/* Balance */}
      {balanceLoading ? (
        <View style={[s.balanceCard, { height: 80, alignItems: 'center', justifyContent: 'center' }]}>
          <ActivityIndicator color={Colors.slate900} />
        </View>
      ) : balance ? (
        <BalanceCard data={balance} />
      ) : null}

      {/* Filter */}
      <View style={s.filterRow}>
        {STATUS_FILTERS.map(f => (
          <TouchableOpacity key={f} style={[s.tab, filter === f && s.tabActive]} onPress={() => setFilter(f)}>
            <Text style={[s.tabText, filter === f && s.tabTextActive]}>
              {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {loading ? (
        <View style={s.center}><ActivityIndicator color={Colors.slate900} size="large" /></View>
      ) : leaves.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="document-text-outline" size={40} color={Colors.slate300} />
          <Text style={s.emptyText}>No leave requests found</Text>
        </View>
      ) : (
        <FlatList
          data={leaves}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <LeaveRow item={item} onCancel={handleCancel} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.slate50 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.slate100,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.slate900,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 15, fontWeight: '700', color: Colors.slate900 },
  requestBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.slate900, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
  },
  requestBtnText: { color: Colors.white, fontSize: 13, fontWeight: '600' },

  // Balance
  balanceCard: {
    margin: 16, backgroundColor: Colors.white, borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: Colors.slate200,
  },
  balanceTitle: { fontSize: 12, fontWeight: '500', color: Colors.slate500, marginBottom: 14 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-around' },
  balanceItem: { alignItems: 'center' },
  balanceIconWrap: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  balanceVal: { fontSize: 26, fontWeight: '600', color: Colors.slate900, letterSpacing: -0.5 },
  balanceLbl: { fontSize: 12, fontWeight: '500', color: Colors.slate700, marginTop: 2 },
  balanceUsed: { fontSize: 11, color: Colors.slate400, marginTop: 1 },

  // Filter
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 6, marginBottom: 10 },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.slate200 },
  tabActive: { backgroundColor: Colors.slate900, borderColor: Colors.slate900 },
  tabText: { fontSize: 12, fontWeight: '600', color: Colors.slate600 },
  tabTextActive: { color: Colors.white },

  // Cards
  card: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: Colors.slate200,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeName: { fontSize: 15, fontWeight: '600', color: Colors.slate900 },
  typeDays: { fontSize: 13, color: Colors.slate500 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  dates: { fontSize: 13, color: Colors.slate500 },
  reason: { fontSize: 13, color: Colors.slate400, marginTop: 2 },
  rejection: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 8, backgroundColor: '#FEF2F2', borderRadius: 8, padding: 10,
  },
  rejectionText: { fontSize: 12, color: '#991B1B', flex: 1 },
  cancelBtn: {
    marginTop: 10, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.slate200, alignItems: 'center',
  },
  cancelBtnText: { fontSize: 13, color: Colors.slate600, fontWeight: '600' },

  // Empty / Disabled
  disabledTitle: { fontSize: 18, fontWeight: '600', color: Colors.slate900, marginTop: 12 },
  disabledSub: { fontSize: 13, color: Colors.slate500, textAlign: 'center', marginTop: 4 },
  emptyText: { fontSize: 14, color: Colors.slate400, marginTop: 12 },
});
