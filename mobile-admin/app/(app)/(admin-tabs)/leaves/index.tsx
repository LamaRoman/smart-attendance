import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  RefreshControl, ActivityIndicator, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiGet, apiPut } from '../../../../lib/api';

const PURPLE = '#7C3AED';

type LeaveRequest = {
  id: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string | null;
  status: string;
  leaveType?: { name: string } | null;
  user?: {
    firstName: string;
    lastName: string;
    employeeId?: string;
  };
  createdAt: string;
};

function statusStyle(status: string) {
  if (status === 'PENDING') return { bg: '#FEF3C7', text: '#92400E' };
  if (status === 'APPROVED') return { bg: '#D1FAE5', text: '#065F46' };
  if (status === 'REJECTED') return { bg: '#FEE2E2', text: '#991B1B' };
  return { bg: '#F3F4F6', text: '#6B7280' };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function LeavesScreen() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'PENDING' | 'ALL'>('PENDING');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const params = filter === 'PENDING' ? '?status=PENDING&limit=50' : '?limit=50';
      const data = await apiGet<any>(`/api/leaves${params}`);
      setLeaves(data?.records ?? data?.leaves ?? data ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => {
    setLoading(true);
    fetchData();
  }, [filter]));

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleAction = (id: string, action: 'APPROVED' | 'REJECTED') => {
    const label = action === 'APPROVED' ? 'Approve' : 'Reject';
    Alert.alert(
      `${label} Leave`,
      `Are you sure you want to ${label.toLowerCase()} this leave request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: label,
          style: action === 'REJECTED' ? 'destructive' : 'default',
          onPress: async () => {
            setActionLoading(id);
            try {
              await apiPut(`/api/leaves/${id}/status`, { status: action });
              await fetchData();
            } catch {
              Alert.alert('Error', `Failed to ${label.toLowerCase()} leave request.`);
            }
            setActionLoading(null);
          },
        },
      ]
    );
  };

  const pendingCount = leaves.filter(l => l.status === 'PENDING').length;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Leave Requests</Text>
        <Text style={s.subtitle}>
          {filter === 'PENDING' ? `${pendingCount} pending` : `${leaves.length} total`}
        </Text>
      </View>

      {/* Filter toggle */}
      <View style={s.filterRow}>
        <TouchableOpacity
          style={[s.filterBtn, filter === 'PENDING' && s.filterActive]}
          onPress={() => setFilter('PENDING')}
        >
          <Text style={[s.filterText, filter === 'PENDING' && s.filterTextActive]}>Pending</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.filterBtn, filter === 'ALL' && s.filterActive]}
          onPress={() => setFilter('ALL')}
        >
          <Text style={[s.filterText, filter === 'ALL' && s.filterTextActive]}>All</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator size="large" color={PURPLE} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PURPLE} />}
          contentContainerStyle={s.list}
        >
          {leaves.length === 0 ? (
            <View style={s.emptyBox}>
              <Ionicons name="checkmark-done-circle-outline" size={48} color="#D1D5DB" />
              <Text style={s.emptyText}>
                {filter === 'PENDING' ? 'No pending leave requests' : 'No leave requests found'}
              </Text>
            </View>
          ) : (
            leaves.map((leave) => {
              const name = `${leave.user?.firstName ?? ''} ${leave.user?.lastName ?? ''}`.trim() || '—';
              const ss = statusStyle(leave.status);
              const isPending = leave.status === 'PENDING';
              const isActioning = actionLoading === leave.id;
              return (
                <View key={leave.id} style={s.card}>
                  <View style={s.cardTop}>
                    <View style={[s.avatar, { backgroundColor: PURPLE }]}>
                      <Text style={s.avatarText}>{name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={s.cardInfo}>
                      <Text style={s.cardName}>{name}</Text>
                      <Text style={s.cardType}>{leave.leaveType?.name ?? 'Leave'}</Text>
                    </View>
                    <View style={[s.statusPill, { backgroundColor: ss.bg }]}>
                      <Text style={[s.statusText, { color: ss.text }]}>{leave.status}</Text>
                    </View>
                  </View>

                  <View style={s.detailRow}>
                    <Ionicons name="calendar-outline" size={14} color="#9CA3AF" />
                    <Text style={s.detailText}>
                      {formatDate(leave.startDate)} — {formatDate(leave.endDate)} ({leave.totalDays}d)
                    </Text>
                  </View>

                  {leave.reason ? (
                    <View style={s.detailRow}>
                      <Ionicons name="chatbubble-outline" size={14} color="#9CA3AF" />
                      <Text style={s.detailText} numberOfLines={2}>{leave.reason}</Text>
                    </View>
                  ) : null}

                  {isPending && (
                    <View style={s.actionRow}>
                      <TouchableOpacity
                        style={[s.actionBtn, s.rejectBtn]}
                        onPress={() => handleAction(leave.id, 'REJECTED')}
                        disabled={isActioning}
                      >
                        {isActioning ? (
                          <ActivityIndicator size="small" color="#991B1B" />
                        ) : (
                          <>
                            <Ionicons name="close" size={16} color="#991B1B" />
                            <Text style={[s.actionText, { color: '#991B1B' }]}>Reject</Text>
                          </>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.actionBtn, s.approveBtn]}
                        onPress={() => handleAction(leave.id, 'APPROVED')}
                        disabled={isActioning}
                      >
                        {isActioning ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                            <Text style={[s.actionText, { color: '#FFFFFF' }]}>Approve</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
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
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  filterRow: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 12,
    backgroundColor: '#F3F4F6', borderRadius: 10, padding: 3,
  },
  filterBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  filterActive: { backgroundColor: PURPLE },
  filterText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  filterTextActive: { color: '#FFFFFF' },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  list: { paddingHorizontal: 16 },
  emptyBox: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 14, color: '#9CA3AF', marginTop: 12 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  cardType: { fontSize: 12, color: '#7C3AED', fontWeight: '600', marginTop: 1 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  detailText: { fontSize: 13, color: '#6B7280', flex: 1 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 10, gap: 4,
  },
  rejectBtn: { backgroundColor: '#FEE2E2' },
  approveBtn: { backgroundColor: '#16A34A' },
  actionText: { fontSize: 14, fontWeight: '700' },
});