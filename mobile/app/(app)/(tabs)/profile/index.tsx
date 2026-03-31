import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore, getOrgName } from '../../../../store/auth.store';
import { apiPost } from '../../../../lib/api';
import api from '../../../../lib/api';
import { Colors } from '../../../../constants/colors';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionCard}>{children}</View>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={s.divider} />;
}

function Field({
  label, value, onChangeText, placeholder, secureTextEntry, autoCapitalize, keyboardType,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'words' | 'sentences';
  keyboardType?: 'default' | 'phone-pad';
}) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={s.fieldInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize ?? 'sentences'}
        keyboardType={keyboardType ?? 'default'}
      />
    </View>
  );
}

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const orgName = getOrgName(user);

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [savingPin, setSavingPin] = useState(false);

  const handleSaveProfile = async () => {
    if (!firstName.trim()) { Alert.alert('Error', 'First name is required.'); return; }
    setSavingProfile(true);
    try {
      await api.put(`/api/users/${user?.id}`, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
      });
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error?.message ?? 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword) { Alert.alert('Error', 'Please enter a new password.'); return; }
    if (newPassword !== confirmPassword) { Alert.alert('Error', 'Passwords do not match.'); return; }
    if (newPassword.length < 8) { Alert.alert('Error', 'Password must be at least 8 characters.'); return; }
    if (!/[A-Z]/.test(newPassword)) { Alert.alert('Error', 'Must contain an uppercase letter.'); return; }
    if (!/[a-z]/.test(newPassword)) { Alert.alert('Error', 'Must contain a lowercase letter.'); return; }
    if (!/[0-9]/.test(newPassword)) { Alert.alert('Error', 'Must contain a number.'); return; }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) { Alert.alert('Error', 'Must contain a special character.'); return; }

    setSavingPassword(true);
    try {
      await api.put(`/api/users/${user?.id}`, { password: newPassword });
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Success', 'Password changed successfully.');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error?.message ?? 'Failed to change password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleChangePin = async () => {
    if (!/^\d{4}$/.test(currentPin)) { Alert.alert('Error', 'Current PIN must be 4 digits.'); return; }
    if (!/^\d{4}$/.test(newPin)) { Alert.alert('Error', 'New PIN must be 4 digits.'); return; }
    if (currentPin === newPin) { Alert.alert('Error', 'New PIN must differ from current PIN.'); return; }
    setSavingPin(true);
    try {
      await apiPost('/api/auth/attendance-pin', { currentPin, newPin });
      setCurrentPin('');
      setNewPin('');
      Alert.alert('Success', 'Attendance PIN changed successfully.');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error?.message ?? 'Failed to change PIN.');
    } finally {
      setSavingPin(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Profile & Settings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.body}>

        {/* Account — read only */}
        <Section title="Account">
          <InfoRow label="Name" value={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || '—'} />
          <Divider />
          <InfoRow label="Email" value={user?.email ?? '—'} />
          <Divider />
          <InfoRow label="Phone" value={user?.phone ?? '—'} />
          <Divider />
          <InfoRow label="Employee ID" value={user?.employeeId ?? '—'} />
          <Divider />
          <InfoRow label="Role" value={user?.role ?? '—'} />
          <Divider />
          <InfoRow label="Organisation" value={orgName} />
        </Section>

        {/* Edit profile */}
        <Section title="Edit Profile">
          <Field label="First Name" value={firstName} onChangeText={setFirstName} placeholder="First name" autoCapitalize="words" />
          <Field label="Last Name" value={lastName} onChangeText={setLastName} placeholder="Last name" autoCapitalize="words" />
          <Field label="Phone" value={phone} onChangeText={setPhone} placeholder="Phone number" autoCapitalize="none" keyboardType="phone-pad" />
          <TouchableOpacity style={[s.btn, savingProfile && { opacity: 0.6 }]} onPress={handleSaveProfile} disabled={savingProfile}>
            {savingProfile ? <ActivityIndicator color={Colors.white} /> : <Text style={s.btnText}>Save Profile</Text>}
          </TouchableOpacity>
        </Section>

        {/* Change password */}
        <Section title="Change Password">
          <Field label="New Password" value={newPassword} onChangeText={setNewPassword} placeholder="Min 8 chars, upper, lower, number, special" secureTextEntry autoCapitalize="none" />
          <Field label="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Repeat new password" secureTextEntry autoCapitalize="none" />
          <TouchableOpacity style={[s.btn, savingPassword && { opacity: 0.6 }]} onPress={handleChangePassword} disabled={savingPassword}>
            {savingPassword ? <ActivityIndicator color={Colors.white} /> : <Text style={s.btnText}>Change Password</Text>}
          </TouchableOpacity>
        </Section>

        {/* Change attendance PIN */}
        <Section title="Attendance PIN">
          <Field label="Current PIN" value={currentPin} onChangeText={setCurrentPin} placeholder="4-digit current PIN" secureTextEntry autoCapitalize="none" keyboardType="phone-pad" />
          <Field label="New PIN" value={newPin} onChangeText={setNewPin} placeholder="4-digit new PIN" secureTextEntry autoCapitalize="none" keyboardType="phone-pad" />
          <TouchableOpacity style={[s.btn, savingPin && { opacity: 0.6 }]} onPress={handleChangePin} disabled={savingPin}>
            {savingPin ? <ActivityIndicator color={Colors.white} /> : <Text style={s.btnText}>Change PIN</Text>}
          </TouchableOpacity>
        </Section>

        {/* Sign out */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <Text style={s.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  body: { padding: 16 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginLeft: 4 },
  sectionCard: { backgroundColor: Colors.card, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  infoLabel: { fontSize: 14, color: Colors.textSecondary },
  infoValue: { fontSize: 14, fontWeight: '600', color: Colors.text, maxWidth: '60%', textAlign: 'right' },
  divider: { height: 1, backgroundColor: Colors.gray100, marginVertical: 8 },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.gray700, marginBottom: 6 },
  fieldInput: { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.text, backgroundColor: Colors.white },
  btn: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  btnText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  logoutBtn: { borderWidth: 1, borderColor: Colors.error, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  logoutText: { color: Colors.error, fontSize: 15, fontWeight: '700' },
});