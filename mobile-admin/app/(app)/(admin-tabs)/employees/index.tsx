import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  RefreshControl, ActivityIndicator, TouchableOpacity,
  TextInput, Modal, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiGet } from '../../../../lib/api';
import { Colors } from '../../../../constants/colors';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  employeeId: string | null;
  panNumber: string | null;
  role: string;
  isActive?: boolean;
  shiftStartTime: string | null;
  shiftEndTime: string | null;
  joinedAt: string | null;
  leftAt: string | null;
  createdAt: string | null;
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatShiftTime(time: string | null | undefined): string {
  if (!time) return '—';
  const parts = time.split(':');
  if (parts.length < 2) return time;
  const h = parseInt(parts[0], 10);
  const m = parts[1];
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function getTenure(joinedAt: string | null | undefined): string {
  if (!joinedAt) return '—';
  const joined = new Date(joinedAt);
  const now = new Date();
  let years = now.getFullYear() - joined.getFullYear();
  let months = now.getMonth() - joined.getMonth();
  if (months < 0) {
    years--;
    months += 12;
  }
  if (years > 0 && months > 0) return `${years}y ${months}m`;
  if (years > 0) return `${years}y`;
  if (months > 0) return `${months}m`;
  const days = Math.floor((now.getTime() - joined.getTime()) / (1000 * 60 * 60 * 24));
  return `${days}d`;
}

function InfoRow({ icon, label, value }: { icon: IoniconsName; label: string; value: string }) {
  return (
    <View style={s.infoRow}>
      <View style={s.infoIcon}>
        <Ionicons name={icon} size={16} color={Colors.slate900} />
      </View>
      <View style={s.infoContent}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function EmployeesScreen() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Employee | null>(null);

  const fetchData = async () => {
    setError('');
    try {
      const data = await apiGet<any>('/api/v1/users');
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

  const filtered = useMemo(() => {
    if (!search.trim()) return employees;
    const q = search.toLowerCase().trim();
    return employees.filter((e) => {
      const name = `${e.firstName} ${e.lastName}`.toLowerCase();
      return (
        name.includes(q) ||
        e.email.toLowerCase().includes(q) ||
        (e.employeeId && e.employeeId.toLowerCase().includes(q)) ||
        (e.phone && e.phone.includes(q))
      );
    });
  }, [employees, search]);

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

      {/* Search bar */}
      {!loading && !error && employees.length > 0 && (
        <View style={s.searchWrap}>
          <Ionicons name="search-outline" size={16} color={Colors.slate400} style={s.searchIcon} />
          <TextInput
            style={s.searchInput}
            placeholder="Search by name, email, ID or phone..."
            placeholderTextColor={Colors.slate400}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={Colors.slate300} />
            </TouchableOpacity>
          )}
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
          keyboardShouldPersistTaps="handled"
        >
          {filtered.length === 0 ? (
            <View style={s.emptyBox}>
              <Ionicons name={search ? 'search-outline' : 'people-outline'} size={48} color={Colors.slate300} />
              <Text style={s.emptyText}>
                {search ? 'No employees match your search' : 'No employees found'}
              </Text>
            </View>
          ) : (
            filtered.map((emp) => {
              const name = `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim() || '—';
              const isActive = emp.isActive !== false;
              return (
                <TouchableOpacity
                  key={emp.id}
                  style={s.card}
                  activeOpacity={0.7}
                  onPress={() => setSelected(emp)}
                >
                  <View style={[s.avatar, { backgroundColor: isActive ? Colors.slate900 : Colors.slate300 }]}>
                    <Text style={s.avatarText}>{name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={s.cardBody}>
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
                  <View style={{ alignItems: 'center', gap: 6 }}>
                    <View style={[s.statusDot, { backgroundColor: isActive ? '#16A34A' : Colors.slate400 }]} />
                    <Ionicons name="chevron-forward" size={16} color={Colors.slate300} />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      {/* Employee detail modal */}
      <Modal
        visible={selected !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelected(null)}
      >
        {selected && <EmployeeDetail employee={selected} onClose={() => setSelected(null)} />}
      </Modal>
    </SafeAreaView>
  );
}

function EmployeeDetail({ employee, onClose }: { employee: Employee; onClose: () => void }) {
  const name = `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim() || '—';
  const isActive = employee.isActive !== false;
  const tenure = getTenure(employee.joinedAt);
  const hasShift = employee.shiftStartTime && employee.shiftEndTime;

  return (
    <SafeAreaView style={s.modalSafe}>
      {/* Modal header */}
      <View style={s.modalHeader}>
        <Text style={s.modalTitle}>Employee Details</Text>
        <TouchableOpacity onPress={onClose} style={s.modalClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={22} color={Colors.slate500} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile card */}
        <View style={s.profileCard}>
          <View style={[s.profileAvatar, { backgroundColor: isActive ? Colors.slate900 : Colors.slate300 }]}>
            <Text style={s.profileAvatarText}>{name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={s.profileName}>{name}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <View style={[s.pillBadge, { backgroundColor: isActive ? '#D1FAE5' : '#FEE2E2' }]}>
              <View style={[s.pillDot, { backgroundColor: isActive ? '#16A34A' : '#DC2626' }]} />
              <Text style={[s.pillTextBold, { color: isActive ? '#065F46' : '#991B1B' }]}>
                {isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
            <View style={[s.pillBadge, { backgroundColor: Colors.slate100 }]}>
              <Text style={[s.pillTextBold, { color: Colors.slate700 }]}>{employee.role}</Text>
            </View>
          </View>
        </View>

        {/* Tenure banner */}
        {employee.joinedAt && (
          <View style={s.tenureBanner}>
            <View style={s.tenureIconWrap}>
              <Ionicons name="time-outline" size={18} color={Colors.slate900} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.tenureLabel}>Tenure</Text>
              <Text style={s.tenureValue}>{tenure}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.tenureLabel}>Joined</Text>
              <Text style={s.tenureValue}>{formatDate(employee.joinedAt)}</Text>
            </View>
          </View>
        )}

        {/* Contact info */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Contact</Text>
          <View style={s.sectionCard}>
            <InfoRow icon="mail-outline" label="Email" value={employee.email} />
            <View style={s.divider} />
            <InfoRow icon="call-outline" label="Phone" value={employee.phone ?? 'Not set'} />
          </View>
        </View>

        {/* Work info */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Work</Text>
          <View style={s.sectionCard}>
            <InfoRow icon="id-card-outline" label="Employee ID" value={employee.employeeId ?? '—'} />
            <View style={s.divider} />
            <InfoRow
              icon="time-outline"
              label="Shift"
              value={hasShift ? `${formatShiftTime(employee.shiftStartTime)} – ${formatShiftTime(employee.shiftEndTime)}` : 'Not set'}
            />
            {employee.panNumber ? (
              <>
                <View style={s.divider} />
                <InfoRow icon="document-text-outline" label="PAN Number" value={employee.panNumber} />
              </>
            ) : null}
          </View>
        </View>

        {/* Personal info */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Personal</Text>
          <View style={s.sectionCard}>
            <InfoRow icon="calendar-outline" label="Date of Birth" value={formatDate(employee.dateOfBirth)} />
            <View style={s.divider} />
            <InfoRow icon="log-in-outline" label="Joined" value={formatDate(employee.joinedAt)} />
            <View style={s.divider} />
            <InfoRow icon="person-add-outline" label="Account Created" value={formatDate(employee.createdAt)} />
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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

  // Search
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: Colors.white, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.slate200,
    paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1, fontSize: 14, color: Colors.slate900,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
  },

  // List
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  errorBox: { alignItems: 'center', paddingTop: 80, gap: 8 },
  errorText: { fontSize: 14, color: Colors.slate500 },
  list: { paddingHorizontal: 16, paddingTop: 12 },
  emptyBox: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 14, color: Colors.slate400, marginTop: 12 },

  // Card
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
  cardBody: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: Colors.slate900 },
  email: { fontSize: 12, color: Colors.slate500, marginTop: 2 },
  metaRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  metaPill: {
    backgroundColor: Colors.slate100, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
  },
  metaText: { fontSize: 10, fontWeight: '600', color: Colors.slate500 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },

  // Modal
  modalSafe: { flex: 1, backgroundColor: Colors.slate50 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.slate100,
    paddingHorizontal: 20, paddingVertical: 14,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: Colors.slate900 },
  modalClose: { padding: 4 },

  // Profile card
  profileCard: {
    alignItems: 'center', marginHorizontal: 16, marginTop: 16,
    backgroundColor: Colors.white, borderRadius: 16, padding: 24,
    borderWidth: 1, borderColor: Colors.slate200,
  },
  profileAvatar: {
    width: 68, height: 68, borderRadius: 34,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  profileAvatarText: { color: Colors.white, fontWeight: '700', fontSize: 26 },
  profileName: { fontSize: 20, fontWeight: '700', color: Colors.slate900 },

  // Pill badges
  pillBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillTextBold: { fontSize: 12, fontWeight: '600' },

  // Tenure banner
  tenureBanner: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: Colors.white, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.slate200,
  },
  tenureIconWrap: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: Colors.slate100, alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  tenureLabel: { fontSize: 11, fontWeight: '600', color: Colors.slate400 },
  tenureValue: { fontSize: 15, fontWeight: '700', color: Colors.slate900, marginTop: 1 },

  // Sections
  section: { marginTop: 16 },
  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: Colors.slate400,
    textTransform: 'uppercase', letterSpacing: 0.5,
    paddingHorizontal: 20, marginBottom: 8,
  },
  sectionCard: {
    marginHorizontal: 16, backgroundColor: Colors.white,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.slate200, overflow: 'hidden',
  },

  // Info rows
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  infoIcon: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: Colors.slate100, alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, color: Colors.slate400, fontWeight: '600' },
  infoValue: { fontSize: 14, color: Colors.slate900, fontWeight: '500', marginTop: 1 },
  divider: { height: 1, backgroundColor: Colors.slate100, marginLeft: 58 },
});