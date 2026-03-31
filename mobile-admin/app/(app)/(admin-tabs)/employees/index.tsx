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

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  employeeId?: string;
  role: string;
  isActive: boolean;
};

export default function AdminEmployeesScreen() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filtered, setFiltered] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchEmployees = async () => {
    try {
      const data = await apiGet<any>('/api/users?limit=100');
      const list: Employee[] = data?.users ?? data ?? [];
      setEmployees(list);
      setFiltered(list);
    } catch { /* non-critical */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchEmployees(); }, []);
  useFocusEffect(useCallback(() => { fetchEmployees(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEmployees();
    setRefreshing(false);
  };

  const handleSearch = (text: string) => {
    setSearch(text);
    if (!text.trim()) { setFiltered(employees); return; }
    const q = text.toLowerCase();
    setFiltered(employees.filter(e => {
      const name = `${e.firstName} ${e.lastName}`.toLowerCase();
      return name.includes(q)
        || e.email.toLowerCase().includes(q)
        || e.employeeId?.toLowerCase().includes(q);
    }));
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Employees</Text>
        <Text style={s.sub}>{employees.length} total</Text>
      </View>

      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color={Colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput}
          placeholder="Search by name, email or ID..."
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
              <Ionicons name="people-outline" size={40} color={Colors.gray300} />
              <Text style={s.emptyText}>No employees found</Text>
            </View>
          ) : (
            filtered.map(emp => {
              const name = `${emp.firstName} ${emp.lastName}`.trim();
              const isOpen = expanded === emp.id;
              return (
                <TouchableOpacity
                  key={emp.id}
                  style={s.card}
                  onPress={() => setExpanded(isOpen ? null : emp.id)}
                  activeOpacity={0.8}
                >
                  <View style={s.cardRow}>
                    <View style={[s.avatar, !emp.isActive && s.avatarInactive]}>
                      <Text style={s.avatarText}>{name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={s.cardInfo}>
                      <Text style={s.cardName}>{name}</Text>
                      <Text style={s.cardSub}>{emp.employeeId ?? '—'} · {emp.role}</Text>
                    </View>
                    <View style={s.cardRight}>
                      {!emp.isActive && (
                        <View style={s.inactiveBadge}>
                          <Text style={s.inactiveBadgeText}>Inactive</Text>
                        </View>
                      )}
                      <Ionicons
                        name={isOpen ? 'chevron-up' : 'chevron-down'}
                        size={16} color={Colors.textMuted}
                      />
                    </View>
                  </View>

                  {isOpen && (
                    <View style={s.expanded}>
                      <View style={s.expandedDivider} />
                      <View style={s.expandedRow}>
                        <Ionicons name="mail-outline" size={14} color={Colors.textMuted} />
                        <Text style={s.expandedText}>{emp.email}</Text>
                      </View>
                      {emp.phone ? (
                        <View style={s.expandedRow}>
                          <Ionicons name="call-outline" size={14} color={Colors.textMuted} />
                          <Text style={s.expandedText}>{emp.phone}</Text>
                        </View>
                      ) : null}
                      <View style={s.expandedRow}>
                        <Ionicons name="shield-outline" size={14} color={Colors.textMuted} />
                        <Text style={s.expandedText}>{emp.role}</Text>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
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
  card: {
    backgroundColor: Colors.card, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border,
    padding: 14, marginBottom: 10,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: Colors.primary, alignItems: 'center',
    justifyContent: 'center', marginRight: 12,
  },
  avatarInactive: { backgroundColor: Colors.gray300 },
  avatarText: { color: Colors.white, fontWeight: '700', fontSize: 17 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  cardSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inactiveBadge: { backgroundColor: Colors.gray100, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  inactiveBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.textMuted },
  expanded: { marginTop: 8 },
  expandedDivider: { height: 1, backgroundColor: Colors.border, marginBottom: 10 },
  expandedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  expandedText: { fontSize: 13, color: Colors.textSecondary },
});