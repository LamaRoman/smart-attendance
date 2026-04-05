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
  isActive?: boolean;
};

export default function EmployeesScreen() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setError('');
    try {
      const data = await apiGet<any>('/api/users');
      // Backend returns array directly for org admin, or { users: [] } for super admin
      let users: Employee[] = [];
      if (Array.isArray(data)) {
        users = data;
      } else if (data?.users && Array.isArray(data.users)) {
        users = data.users;
      }
      setEmployees(users);
    } catch (err: any) {
      console.error('Employees fetch error:', err?.response?.data ?? err?.message);
      setError(err?.response?.data?.error?.message ?? 'Failed to load employees');
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

  const activeCount = employees.filter(e => e.isActive !== false).length;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <View style={s.headerRow}>
          <View style={s.logoBox}>
            <Ionicons name="people" size={16} color={Colors.white} />
          </View>
          <View>
            <Text style={s.title}>Employees</Text>
            <Text style={s.subtitle}>{activeCount} active · {employees.length} total</Text>
          </View>
        </View>
      </View>

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
          {employees.length === 0 ? (
            <View style={s.emptyBox}>
              <Ionicons name="people-outline" size={48} color={Colors.slate300} />
              <Text style={s.emptyText}>No employees found</Text>
            </View>
          ) : (
            employees.map((emp) => {
              const name = `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim() || '—';
              const isActive = emp.isActive !== false;
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
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  errorBox: { alignItems: 'center', paddingTop: 80, gap: 8 },
  errorText: { fontSize: 14, color: Colors.slate500 },
  list: { paddingHorizontal: 16, paddingTop: 12 },
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
