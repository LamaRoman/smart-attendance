import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiGet } from '../../../../lib/api';
import { Colors } from '../../../../constants/colors';


type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  employeeId: string | null;
  role: string;
  status?: string;
  membership?: {
    status: string;
  } | null;
};

export default function EmployeesScreen() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const data = await apiGet<any>('/api/users?limit=100');
      const users: Employee[] = data?.users ?? data ?? [];
      setEmployees(users);
    } catch { /* ignore */ }
    finally { setLoading(false); }
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

  const activeCount = employees.filter(
    (e) => (e.membership?.status ?? e.status ?? 'ACTIVE') === 'ACTIVE'
  ).length;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Employees</Text>
        <Text style={s.subtitle}>{activeCount} active · {employees.length} total</Text>
      </View>

      {loading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator size="large" color={Colors.slate900} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.slate900} />}
          contentContainerStyle={s.list}
        >
          {employees.length === 0 ? (
            <View style={s.emptyBox}>
              <Ionicons name="people-outline" size={48} color="#D1D5DB" />
              <Text style={s.emptyText}>No employees found</Text>
            </View>
          ) : (
            employees.map((emp) => {
              const name = `${emp.firstName} ${emp.lastName}`.trim();
              const memberStatus = emp.membership?.status ?? emp.status ?? 'ACTIVE';
              const isActive = memberStatus === 'ACTIVE';
              return (
                <View key={emp.id} style={s.card}>
                  <View style={[s.avatar, { backgroundColor: isActive ? Colors.slate900 : Colors.slate300 }]}>
                    <Text style={s.avatarText}>{name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={s.info}>
                    <Text style={s.name}>{name}</Text>
                    <Text style={s.email}>{emp.email}</Text>
                    <View style={s.metaRow}>
                      {emp.employeeId && (
                        <View style={s.metaPill}>
                          <Text style={s.metaText}>ID: {emp.employeeId}</Text>
                        </View>
                      )}
                      <View style={s.metaPill}>
                        <Text style={s.metaText}>{emp.role}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={[s.statusDot, { backgroundColor: isActive ? '#16A34A' : Colors.slate400 }]} />
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
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.slate900 },
  subtitle: { fontSize: 13, color: Colors.slate500, marginTop: 2 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  list: { paddingHorizontal: 16 },
  emptyBox: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 14, color: Colors.slate400, marginTop: 12 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: 14, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: Colors.slate200,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { color: Colors.white, fontWeight: '700', fontSize: 17 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: Colors.slate900 },
  email: { fontSize: 12, color: Colors.slate500, marginTop: 2 },
  metaRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  metaPill: {
    backgroundColor: Colors.slate100, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
  },
  metaText: { fontSize: 10, fontWeight: '600', color: Colors.slate500 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginLeft: 8 },
});
