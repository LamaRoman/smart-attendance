import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, ActivityIndicator, Alert, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, getOrgName } from '../../../../store/auth.store';
import api from '../../../../lib/api';
import { useBiometric } from '../../../../hooks/useBiometric';
import { useBiometricStore } from '../../../../store/biometricStore';

const ADMIN_PRIMARY = '#7C3AED';
const ADMIN_PRIMARY_LIGHT = '#EDE9FE';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionCard}>{children}</View>
    </View>
  );
}

function InfoRow({ icon, label, value }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string; value: string;
}) {
  return (
    <View style={s.infoRow}>
      <View style={s.infoIconWrap}>
        <Ionicons name={icon} size={15} color="#9CA3AF" />
      </View>
      <View style={s.infoContent}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue}>{value || '—'}</Text>
      </View>
    </View>
  );
}

function Divider() { return <View style={s.divider} />; }

function Field({ label, value, onChangeText, placeholder, secureTextEntry, autoCapitalize, keyboardType }: {
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
        placeholderTextColor="#9CA3AF"
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize ?? 'sentences'}
        keyboardType={keyboardType ?? 'default'}
      />
    </View>
  );
}

export default function AdminProfileScreen() {
  const { user, initialize } = useAuthStore();
  const orgName = getOrgName(user);

  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const { isSupported, authenticate } = useBiometric();
  const { biometricEnabled, setBiometricEnabled, loadSettings } = useBiometricStore();
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    loadSettings();
    isSupported().then(setBiometricAvailable);
  }, []);

  // Sync local state when user updates in store
  useEffect(() => {
    setFirstName(user?.firstName ?? '');
    setLastName(user?.lastName ?? '');
    setPhone(user?.phone ?? '');
  }, [user]);

  const handleBiometricToggle = async (value: boolean) => {
    if (value) {
      const result = await authenticate();
      if (!result.success) {
        Alert.alert('Biometric Failed', 'Could not verify biometrics. Please try again.');
        return;
      }
    }
    await setBiometricEnabled(value);
  };

  const handleSaveProfile = async () => {
    if (!firstName.trim()) { Alert.alert('Error', 'First name is required.'); return; }
    setSavingProfile(true);
    try {
      await api.put(`/api/users/${user?.id}`, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
      });
      // Refresh user in store so updated values show immediately
      await initialize();
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error?.message ?? 'Failed to update profile.');
    } finally { setSavingProfile(false); }
  };

  const handleCancelEdit = () => {
    setFirstName(user?.firstName ?? '');
    setLastName(user?.lastName ?? '');
    setPhone(user?.phone ?? '');
    setIsEditing(false);
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
      setNewPassword(''); setConfirmPassword('');
      Alert.alert('Success', 'Password changed successfully.');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error?.message ?? 'Failed to change password.');
    } finally { setSavingPassword(false); }
  };

  const fullName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || '—';

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Profile & Settings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.body}>

        {/* Account */}
        <View style={s.section}>
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>Account</Text>
            {!isEditing ? (
              <TouchableOpacity style={s.editBtn} onPress={() => setIsEditing(true)}>
                <Ionicons name="pencil-outline" size={13} color={ADMIN_PRIMARY} />
                <Text style={s.editBtnText}>Edit</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={s.cancelBtn} onPress={handleCancelEdit}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={s.sectionCard}>
            {!isEditing ? (
              <>
                <InfoRow icon="person-outline" label="Full Name" value={fullName} />
                <Divider />
                <InfoRow icon="mail-outline" label="Email" value={user?.email ?? '—'} />
                <Divider />
                <InfoRow icon="call-outline" label="Phone" value={user?.phone ?? '—'} />
                <Divider />
                <InfoRow icon="shield-outline" label="Role" value={user?.role ?? '—'} />
                <Divider />
                <InfoRow icon="business-outline" label="Organisation" value={orgName} />
              </>
            ) : (
              <>
                <Field label="First Name" value={firstName} onChangeText={setFirstName} placeholder="First name" autoCapitalize="words" />
                <Field label="Last Name" value={lastName} onChangeText={setLastName} placeholder="Last name" autoCapitalize="words" />
                <Field label="Phone" value={phone} onChangeText={setPhone} placeholder="Phone number" autoCapitalize="none" keyboardType="phone-pad" />
                <View style={s.editActions}>
                  <TouchableOpacity style={s.cancelFullBtn} onPress={handleCancelEdit}>
                    <Text style={s.cancelFullBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.saveBtn, savingProfile && { opacity: 0.6 }]}
                    onPress={handleSaveProfile}
                    disabled={savingProfile}
                  >
                    {savingProfile
                      ? <ActivityIndicator color="#FFFFFF" size="small" />
                      : <Text style={s.saveBtnText}>Save Changes</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Security */}
        {biometricAvailable && (
          <Section title="Security">
            <View style={s.toggleRow}>
              <View style={s.toggleLeft}>
                <Ionicons name="finger-print" size={20} color="#6B7280" style={{ marginRight: 12 }} />
                <View>
                  <Text style={s.toggleLabel}>Biometric Unlock</Text>
                  <Text style={s.toggleHint}>Lock app after 5 min in background</Text>
                </View>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={handleBiometricToggle}
                trackColor={{ false: '#E5E7EB', true: ADMIN_PRIMARY }}
                thumbColor="#FFFFFF"
              />
            </View>
          </Section>
        )}

        {/* Change password */}
        <Section title="Change Password">
          <Field label="New Password" value={newPassword} onChangeText={setNewPassword} placeholder="Min 8 chars, upper, lower, number, special" secureTextEntry autoCapitalize="none" />
          <Field label="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Repeat new password" secureTextEntry autoCapitalize="none" />
          <TouchableOpacity
            style={[s.btn, savingPassword && { opacity: 0.6 }]}
            onPress={handleChangePassword}
            disabled={savingPassword}
          >
            {savingPassword ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.btnText}>Change Password</Text>}
          </TouchableOpacity>
        </Section>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  body: { padding: 16 },
  section: { marginBottom: 20 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, marginLeft: 4 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionCard: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', padding: 16 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ADMIN_PRIMARY_LIGHT, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  editBtnText: { fontSize: 12, fontWeight: '600', color: ADMIN_PRIMARY },
  cancelBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  cancelBtnText: { fontSize: 12, fontWeight: '600', color: '#9CA3AF' },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  infoIconWrap: { width: 28, alignItems: 'center' },
  infoContent: { flex: 1, marginLeft: 8 },
  infoLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginBottom: 1 },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 2 },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  fieldInput: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827', backgroundColor: '#FFFFFF' },
  editActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelFullBtn: { flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  cancelFullBtnText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  saveBtn: { flex: 2, backgroundColor: ADMIN_PRIMARY, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  saveBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  btn: { backgroundColor: ADMIN_PRIMARY, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  toggleHint: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },
});