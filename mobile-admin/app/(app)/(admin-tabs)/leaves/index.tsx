import { useEffect, useState, useCallback } from 'react';
import {
    View, Text, ScrollView, StyleSheet,
    RefreshControl, ActivityIndicator, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../../constants/colors';
import { apiGet } from '../../../../lib/api';
import api from '../../../../lib/api';

type Leave = {
    id: string;
    user: { firstName: string; lastName: string; employeeId: string };
    leaveType: { name: string };
    startDate: string;
    endDate: string;
    reason: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    totalDays: number;
};

type Tab = 'PENDING' | 'APPROVED' | 'REJECTED';

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AdminLeavesScreen() {
    const [tab, setTab] = useState<Tab>('PENDING');
    const [leaves, setLeaves] = useState<Leave[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [actioning, setActioning] = useState<string | null>(null);

    const fetchLeaves = async () => {
        try {
            const data = await apiGet<any>(`/api/leaves?status=${tab}&limit=50`);
            setLeaves(data?.leaves ?? data ?? []);
        } catch { /* non-critical */ }
        finally { setLoading(false); }
    };

    useEffect(() => { setLoading(true); fetchLeaves(); }, [tab]);
    useFocusEffect(useCallback(() => { fetchLeaves(); }, [tab]));

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchLeaves();
        setRefreshing(false);
    };

    const handleAction = (leave: Leave, action: 'APPROVED' | 'REJECTED') => {
        const label = action === 'APPROVED' ? 'Approve' : 'Reject';
        const name = `${leave.user.firstName} ${leave.user.lastName}`;
        Alert.alert(`${label} Leave`, `${label} leave request from ${name}?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: label,
                style: action === 'REJECTED' ? 'destructive' : 'default',
                onPress: async () => {
                    setActioning(leave.id);
                    try {
                        await api.put(`/api/leaves/${leave.id}/status`, { status: action }); setLeaves(prev => prev.filter(l => l.id !== leave.id));
                    } catch (err: any) {
                        Alert.alert('Error', err?.response?.data?.error?.message ?? 'Action failed.');
                    } finally { setActioning(null); }
                },
            },
        ]);
    };

    const tabs: Tab[] = ['PENDING', 'APPROVED', 'REJECTED'];

    return (
        <SafeAreaView style={s.safe}>
            <View style={s.header}>
                <Text style={s.title}>Leave Requests</Text>
            </View>

            <View style={s.tabRow}>
                {tabs.map(t => (
                    <TouchableOpacity
                        key={t}
                        style={[s.tabBtn, tab === t && s.tabBtnActive]}
                        onPress={() => setTab(t)}
                    >
                        <Text style={[s.tabLabel, tab === t && s.tabLabelActive]}>
                            {t.charAt(0) + t.slice(1).toLowerCase()}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <View style={s.loadingBox}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
                    contentContainerStyle={{ padding: 16 }}
                >
                    {leaves.length === 0 ? (
                        <View style={s.emptyBox}>
                            <Ionicons name="calendar-outline" size={40} color={Colors.gray300} />
                            <Text style={s.emptyText}>No {tab.toLowerCase()} leave requests</Text>
                        </View>
                    ) : (
                        leaves.map(leave => {
                            const name = `${leave.user.firstName} ${leave.user.lastName}`;
                            return (
                                <View key={leave.id} style={s.card}>
                                    <View style={s.cardHeader}>
                                        <View style={s.avatar}>
                                            <Text style={s.avatarText}>{name.charAt(0).toUpperCase()}</Text>
                                        </View>
                                        <View style={s.cardInfo}>
                                            <Text style={s.cardName}>{name}</Text>
                                            <Text style={s.cardSub}>{leave.user.employeeId} · {leave.leaveType?.name}</Text>
                                        </View>
                                        <View style={s.daysBadge}>
                                            <Text style={s.daysText}>{leave.totalDays}d</Text>
                                        </View>
                                    </View>

                                    <View style={s.dateRow}>
                                        <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
                                        <Text style={s.dateText}>
                                            {formatDate(leave.startDate)} — {formatDate(leave.endDate)}
                                        </Text>
                                    </View>

                                    {leave.reason ? (
                                        <Text style={s.reason} numberOfLines={2}>{leave.reason}</Text>
                                    ) : null}

                                    {tab === 'PENDING' && (
                                        <View style={s.actionRow}>
                                            <TouchableOpacity
                                                style={[s.actionBtn, s.rejectBtn, actioning === leave.id && { opacity: 0.5 }]}
                                                onPress={() => handleAction(leave, 'REJECTED')}
                                                disabled={actioning === leave.id}
                                            >
                                                {actioning === leave.id
                                                    ? <ActivityIndicator size="small" color={Colors.error} />
                                                    : <Text style={[s.actionBtnText, { color: Colors.error }]}>Reject</Text>}
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[s.actionBtn, s.approveBtn, actioning === leave.id && { opacity: 0.5 }]}
                                                onPress={() => handleAction(leave, 'APPROVED')}
                                                disabled={actioning === leave.id}
                                            >
                                                {actioning === leave.id
                                                    ? <ActivityIndicator size="small" color={Colors.white} />
                                                    : <Text style={[s.actionBtnText, { color: Colors.white }]}>Approve</Text>}
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
    safe: { flex: 1, backgroundColor: Colors.background },
    header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
    title: { fontSize: 22, fontWeight: '700', color: Colors.text },
    tabRow: {
        flexDirection: 'row', marginHorizontal: 16, marginBottom: 12,
        backgroundColor: Colors.gray100, borderRadius: 10, padding: 3,
    },
    tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
    tabBtnActive: { backgroundColor: Colors.white, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    tabLabel: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
    tabLabelActive: { color: Colors.text },
    loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyBox: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
    emptyText: { fontSize: 14, color: Colors.textMuted },
    card: {
        backgroundColor: Colors.card, borderRadius: 14,
        borderWidth: 1, borderColor: Colors.border,
        padding: 16, marginBottom: 12,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    avatar: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: Colors.primary, alignItems: 'center',
        justifyContent: 'center', marginRight: 10,
    },
    avatarText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
    cardInfo: { flex: 1 },
    cardName: { fontSize: 14, fontWeight: '600', color: Colors.text },
    cardSub: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
    daysBadge: { backgroundColor: Colors.gray100, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    daysText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
    dateText: { fontSize: 12, color: Colors.textMuted },
    reason: { fontSize: 13, color: Colors.textSecondary, marginBottom: 12, fontStyle: 'italic' },
    actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
    actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
    rejectBtn: { borderWidth: 1, borderColor: Colors.error },
    approveBtn: { backgroundColor: Colors.primary },
    actionBtnText: { fontSize: 14, fontWeight: '700' },
});