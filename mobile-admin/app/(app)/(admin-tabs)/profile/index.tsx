import { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, getOrgName } from '../../../../store/auth.store';
import { useBiometricStore } from '../../../../store/biometricStore';
import { Colors } from '../../../../constants/colors';
import { useBiometric } from '../../../../hooks/useBiometric';


type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function InfoRow({ icon, label, value }: { icon: IoniconsName; label: string; value: string }) {
  return (
    <View style={s.infoRow}>
      <View style={s.infoIcon}>
        <Ionicons name={icon} size={18} color={Colors.slate900} />
      </View>
      <View style={s.infoContent}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue}>{value || '—'}</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { user } = useAuthStore();
  const orgName = getOrgName(user);
  const { biometricEnabled, setBiometricEnabled } = useBiometricStore();
  const { isSupported, authenticate } = useBiometric();
  const [toggling, setToggling] = useState(false);

  const handleBiometricToggle = async (value: boolean) => {
    setToggling(true);
    if (value) {
      const supported = await isSupported();
      if (!supported) {
        Alert.alert('Not Available', 'Biometric authentication is not set up on this device.');
        setToggling(false);
        return;
      }
      const result = await authenticate();
      if (result.success) {
        await setBiometricEnabled(true);
      }
    } else {
      await setBiometricEnabled(false);
    }
    setToggling(false);
  };

  const name = user ? `${user.firstName} ${user.lastName}` : '—';

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.headerTitle}>Profile</Text>
        </View>

        {/* Avatar card */}
        <View style={s.avatarCard}>
          <View style={s.avatarCircle}>
            <Text style={s.avatarText}>{name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={s.name}>{name}</Text>
          <View style={s.rolePill}>
            <Text style={s.roleText}>{user?.role ?? '—'}</Text>
          </View>
          <Text style={s.org}>{orgName}</Text>
        </View>

        {/* Info section */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Account Details</Text>
          <View style={s.sectionCard}>
            <InfoRow icon="mail-outline" label="Email" value={user?.email ?? ''} />
            <View style={s.divider} />
            <InfoRow icon="call-outline" label="Phone" value={user?.phone ?? 'Not set'} />
            <View style={s.divider} />
            <InfoRow icon="business-outline" label="Organization" value={orgName} />
            <View style={s.divider} />
            <InfoRow icon="id-card-outline" label="Employee ID" value={user?.employeeId ?? '—'} />
          </View>
        </View>

        {/* Security section */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Security</Text>
          <View style={s.sectionCard}>
            <View style={s.switchRow}>
              <View style={s.infoIcon}>
                <Ionicons name="finger-print" size={18} color={Colors.slate900} />
              </View>
              <View style={s.infoContent}>
                <Text style={s.infoLabel}>Biometric Lock</Text>
                <Text style={s.switchSub}>Lock app when returning from background</Text>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={handleBiometricToggle}
                disabled={toggling}
                trackColor={{ false: Colors.slate300, true: Colors.slate900 + '60' }}
                thumbColor={biometricEnabled ? Colors.slate900 : Colors.slate100}
              />
            </View>
          </View>
        </View>

        <Text style={s.version}>Attend Xpress Admin v1.0.0</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.slate50 },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.slate900 },
  avatarCard: {
    alignItems: 'center', marginHorizontal: 16, backgroundColor: Colors.white,
    borderRadius: 16, padding: 24, marginBottom: 16,
    borderWidth: 1, borderColor: Colors.slate200,
  },
  avatarCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.slate900, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { color: Colors.white, fontWeight: '700', fontSize: 28 },
  name: { fontSize: 20, fontWeight: '700', color: Colors.slate900, marginBottom: 6 },
  rolePill: {
    backgroundColor: Colors.slate100, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginBottom: 4,
  },
  roleText: { color: Colors.slate700, fontSize: 12, fontWeight: '700' },
  org: { fontSize: 13, color: Colors.slate500, marginTop: 4 },
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: Colors.slate400,
    textTransform: 'uppercase', letterSpacing: 0.5,
    paddingHorizontal: 20, marginBottom: 8,
  },
  sectionCard: {
    marginHorizontal: 16, backgroundColor: Colors.white,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.slate200,
    overflow: 'hidden',
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  infoIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: Colors.slate100, alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, color: Colors.slate400, fontWeight: '600' },
  infoValue: { fontSize: 15, color: Colors.slate900, fontWeight: '500', marginTop: 1 },
  divider: { height: 1, backgroundColor: Colors.slate100, marginLeft: 60 },
  switchRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  switchSub: { fontSize: 11, color: Colors.slate400, marginTop: 1 },
  version: { textAlign: 'center', fontSize: 12, color: Colors.slate300, marginTop: 20 },
});
