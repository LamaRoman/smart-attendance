import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { apiGet, apiDelete } from '../../../../lib/api';
import { Colors } from '../../../../constants/colors';
import { BS_MONTHS_EN, todayBS } from '../../../../lib/nepali-date';
import StatusBadge from '../../../../components/StatusBadge';

// ─── Types — match /api/leave-balance/my response exactly ─────────────────────
interface BalanceData {
  bsYear: number;
  membershipId: string;
  annualEntitlement: number;
  sickEntitlement: number;
  casualEntitlement: number;
  annualCarriedOver: number;
  sickCarriedOver: number;
  casualCarriedOver: number;
  annualUsed: number;
  sickUsed: number;
  casualUsed: number;
  annualAvailable: number;
  sickAvailable: number;
  casualAvailable: number;
}

interface LeaveRecord {
  id: string;
  type: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  startDate: string;
  endDate: string;
  bsStartYear: number | null;
  bsStartMonth: number | null;
  bsStartDay: number | null;
  bsEndYear: number | null;
  bsEndMonth: number | null;
  bsEndDay: number | null;
  reason: string;
  rejectionMessage: string | null;
}

const LEAVE_TYPE_ICONS: Record<string, string> = {
  ANNUAL: '🏖', SICK: '🤒', CASUAL: '🌿',
  MATERNITY: '👶', PATERNITY: '👨‍👶', UNPAID: '📋',
};
const LEAVE_TYPE_LABELS: Record<string, string> = {
  ANNUAL: 'Annual', SICK: 'Sick', CASUAL: 'Casual',
  MATERNITY: 'Maternity', PATERNITY: 'Paternity', UNPAID: 'Unpaid',
};
const STATUS_FILTERS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const;

function formatDateRange(record: LeaveRecord): string {
  if (record.bsStartYear && record.bsStartMonth && record.bsStartDay) {
    const start = `${record.bsStartDay} ${BS_MONTHS_EN[record.bsStartMonth - 1]} ${record.bsStartYear}`;
    if (record.bsEndDay === record.bsStartDay && record.bsEndMonth === record.bsStartMonth) return start;
    if (record.bsEndYear && record.bsEndMonth && record.bsEndDay) {
      return `${start} – ${record.bsEndDay} ${BS_MONTHS_EN[record.bsEndMonth - 1]} ${record.bsEndYear}`;
    }
  }
  const s = new Date(record.startDate).toLocaleDateString();
  const e = new Date(record.endDate).toLocaleDateString();
  return s === e ? s : `${s} – ${e}`;
}

function countDays(record: LeaveRecord): number {
  return Math.ceil((new Date(record.endDate).getTime() - new Date(record.startDate).getTime()) / 86400000) + 1;
}

// ─── Balance Card — uses exact fields from /api/leave-balance/my ──────────────
function BalanceCard({ data }: { data: BalanceData }) {
  const items = [
    { label: 'Annual', available: data.annualAvailable, used: data.annualUsed, entitled: data.annualEntitlement },
    { label: 'Sick', available: data.sickAvailable, used: data.sickUsed, entitled: data.sickEntitlement },
    { label: 'Casual', available: data.casualAvailable, used: data.casualUsed, entitled: data.casualEntitlement },
  ];

  return (
    <View style={s.balanceCard}>
      <Text style={s.balanceTitle}>Leave Balance — BS {data.bsYear}</Text>
      <View style={s.balanceRow}>
        {items.map(item => (
          <View key={item.label} style={s.balanceItem}>
            <Text style={s.balanceVal}>{item.available}</Text>
            <Text style={s.balanceLbl}>{item.label}</Text>
            <Text style={s.balanceUsed}>{item.used}/{item.entitled} used</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Leave Row ────────────────────────────────────────────────────────────────
function LeaveRow({ item, onCancel }: { item: LeaveRecord; onCancel: (id: string) => void }) {
  const days = countDays(item);
  return (
    <View style={s.card}>
      <View style={s.cardTop}>
        <View style={s.typeRow}>
          <Text style={s.typeIcon}>{LEAVE_TYPE_ICONS[item.type] ?? '📋'}</Text>
          <Text style={s.typeName}>{LEAVE_TYPE_LABELS[item.type] ?? item.type}</Text>
          <Text style={s.typeDays}>{days}d</Text>
        </View>
        <StatusBadge status={item.status} size="sm" />
      </View>
      <Text style={s.dates}>{formatDateRange(item)}</Text>
      {item.reason ? <Text style={s.reason} numberOfLines={2}>{item.reason}</Text> : null}
      {item.status === 'REJECTED' && item.rejectionMessage ? (
        <View style={s.rejection}><Text style={s.rejectionText}>"{item.rejectionMessage}"</Text></View>
      ) : null}
      {item.status === 'PENDING' && (
        <TouchableOpacity style={s.cancelBtn} onPress={() => onCancel(item.id)}>
          <Text style={s.cancelBtnText}>Cancel Request</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function LeavesScreen() {
  const router = useRouter();
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<typeof STATUS_FILTERS[number]>('ALL');
  const [featureDisabled, setFeatureDisabled] = useState(false);

  const loadBalance = useCallback(async () => {
    setBalanceLoading(true);
    try {
      const today = todayBS();
      // Returns null when leaveBalanceEnabled = false — just hide the card
      const data = await apiGet<BalanceData | null>(`/api/leave-balance/my?bsYear=${today.year}`);
      setBalance(data ?? null);
    } catch (err: any) {
      if (err?.response?.status === 403) setFeatureDisabled(true);
      // Any other error — just hide balance card silently
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  const loadLeaves = useCallback(async (status: string) => {
    setLoading(true); setError('');
    try {
      const params = status !== 'ALL' ? `?status=${status}&limit=50` : '?limit=50';
      const data = await apiGet<any>(`/api/leaves/my${params}`);
      setLeaves(Array.isArray(data) ? data : data.leaves ?? []);
    } catch (err: any) {
      if (err?.response?.status === 403) setFeatureDisabled(true);
      else setError('Failed to load leaves.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadBalance(); loadLeaves('ALL'); }, []);
  useEffect(() => { loadLeaves(filter); }, [filter]);

  const handleCancel = (id: string) => {
    Alert.alert('Cancel Leave Request', 'Are you sure?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel', style: 'destructive',
        onPress: async () => {
          try {
            await apiDelete(`/api/leaves/${id}`);
            loadLeaves(filter);
            loadBalance();
          } catch { Alert.alert('Error', 'Failed to cancel.'); }
        },
      },
    ]);
  };

  if (featureDisabled) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>🔒</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 8 }}>Leave Management</Text>
          <Text style={{ fontSize: 14, color: Colors.textSecondary, textAlign: 'center' }}>
            This feature is not enabled for your organization.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* Balance card — only shown when leaveBalanceEnabled = true and data exists */}
      {balanceLoading ? (
        <View style={[s.balanceCard, { height: 80, alignItems: 'center', justifyContent: 'center' }]}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : balance ? (
        <BalanceCard data={balance} />
      ) : null}

      {/* Filter tabs */}
      <View style={s.filterRow}>
        {STATUS_FILTERS.map(f => (
          <TouchableOpacity key={f} style={[s.tab, filter === f && s.tabActive]} onPress={() => setFilter(f)}>
            <Text style={[s.tabText, filter === f && s.tabTextActive]}>
              {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={Colors.primary} size="large" /></View>
      ) : error ? (
        <View style={s.center}>
          <Text style={{ color: Colors.error, marginBottom: 12 }}>{error}</Text>
          <TouchableOpacity onPress={() => loadLeaves(filter)} style={s.retryBtn}>
            <Text style={{ color: Colors.white, fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : leaves.length === 0 ? (
        <View style={s.center}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>📭</Text>
          <Text style={{ color: Colors.textSecondary }}>No leave requests found.</Text>
        </View>
      ) : (
        <FlatList
          data={leaves}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <LeaveRow item={item} onCancel={handleCancel} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity style={s.fab} onPress={() => router.push('/(app)/(tabs)/leaves/request')}>
        <Text style={s.fabText}>+ New Request</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  balanceCard: { margin: 16, backgroundColor: Colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border },
  balanceTitle: { fontSize: 12, fontWeight: '600', color: Colors.textMuted, marginBottom: 12 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-around' },
  balanceItem: { alignItems: 'center' },
  balanceVal: { fontSize: 28, fontWeight: '700', color: Colors.primary },
  balanceLbl: { fontSize: 12, fontWeight: '600', color: Colors.text, marginTop: 2 },
  balanceUsed: { fontSize: 11, color: Colors.textMuted },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: Colors.gray100 },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: 12, fontWeight: '600', color: Colors.gray600 },
  tabTextActive: { color: Colors.white },
  card: { backgroundColor: Colors.card, borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeIcon: { fontSize: 18 },
  typeName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  typeDays: { fontSize: 13, color: Colors.textSecondary },
  dates: { fontSize: 13, color: Colors.textSecondary, marginBottom: 4 },
  reason: { fontSize: 13, color: Colors.textMuted, fontStyle: 'italic' },
  rejection: { marginTop: 8, backgroundColor: Colors.errorLight, borderRadius: 8, padding: 8 },
  rejectionText: { fontSize: 13, color: Colors.error },
  cancelBtn: { marginTop: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: Colors.error, alignItems: 'center' },
  cancelBtnText: { fontSize: 13, color: Colors.error, fontWeight: '600' },
  fab: { position: 'absolute', bottom: 24, right: 20, backgroundColor: Colors.primary, borderRadius: 28, paddingHorizontal: 20, paddingVertical: 14, elevation: 6 },
  fabText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  retryBtn: { backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
});