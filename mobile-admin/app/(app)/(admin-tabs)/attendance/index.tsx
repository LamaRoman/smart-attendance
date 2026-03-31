import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  RefreshControl, ActivityIndicator, TextInput, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../../constants/colors';
import { apiGet } from '../../../../lib/api';
import { todayBS } from '../../../../lib/nepali-date';

function formatTime(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    PRESENT:  { bg: '#D1FAE5', text: '#065F46', label: 'Present' },
    LATE:     { bg: '#FEF3C7', text: '#92400E', label: 'Late' },
    ABSENT:   { bg: '#FEE2E2', text: '#991B1B', label: 'Absent' },
    ON_LEAVE: { bg: '#EDE9FE', text: '#5B21B6', label: 'On Leave' },
  };
  const style = map[status] ?? { bg: Colors.gray100, text: Colors.textMuted, label: status };
  return (
    <View style={[b.wrap, { backgroundColor: style.bg }]}>
      <Text style={[b.text, { color: style.text }]}>{style.label}</Text>
    </View>
  );
}

const b = StyleSheet.create({
  wrap: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  text: { fontSize: 11, fontWeight: '700' },
});

export default function AdminAttendanceScreen() {
  const [records, setRecords] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const fetchRecords = async () => {
    try {
      const today = todayBS();
      const data = await apiGet<any>(
        `/api/attendance?bsYear=${today.year}&bsMonth=${today.month}&bsDay=${today.day}`
      );
      const list = data?.records ?? data ?? [];
      setRecords(list);
      setFiltered(list);
    } catch { /* non-critical */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRecords(); }, []);
  useFocusEffect(useCallback(() => { fetchRecords(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRecords();
    setRefreshing(false);
  };

  const handleSearch = (text: string) => {
    setSearch(text);
    if (!text.trim()) { setFiltered(records); return; }
    const q = text.toLowerCase();
    setFiltered(records.filter((r: any) => {
      const name = `${r.user?.firstName ?? ''} ${r.user?.lastName ?? ''}`.toLowerCase();
      return name.includes(q) || r.user?.employeeId?.toLowerCase().includes(q);
    }));
  };

  const today = todayBS();

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Attendance</Text>
        <Text style={s.sub}>Today — {today.year}/{today.month}/{today.day} BS</Text>
      </View>

      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color={Colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput}
          placeholder="Search by name or employee ID..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={handleSearch}
          autoCapitalize="none"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
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
          {filtered.length === 0 ? (
            <View style={s.emptyBox}>
              <Ionicons name="time-outline" size={40} color={Colors.gray300} />
              <Text style={s.emptyText}>No attendance records for today</Text>
            </View>
          ) : (
            filtered.map((rec: any, i: number) => {
              const name = `${rec.user?.firstName ?? ''} ${rec.user?.lastName ?? ''}`.trim() || '—';
              const empId = rec.user?.employeeId ?? '—';
              const status = rec.isLate ? 'LATE'
                : rec.checkInTime ? 'PRESENT'
                : rec.leaveType ? 'ON_LEAVE'
                : 'ABSENT';
              return (
                <View key={rec.id ?? i} style={s.row}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>{name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={s.rowInfo}>
                    <Text style={s.rowName}>{name}</Text>
                    <Text style={s.rowSub}>
                      {empId} · In: {formatTime(rec.checkInTime)} · Out: {formatTime(rec.checkOutTime)}
                    </Text>
                  </View>
                  <StatusBadge status={status} />
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
  sub: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: Colors.card, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 14, color: Colors.textMuted },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.card, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
    padding: 14, marginBottom: 10,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary, alignItems: 'center',
    justifyContent: 'center', marginRight: 12,
  },
  avatarText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  rowSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
});