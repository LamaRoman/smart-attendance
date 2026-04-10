import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/auth.store';
import { apiPost, apiGet } from '../../lib/api';
import { Colors } from '../../constants/colors';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [pwFocused, setPwFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);

  const rules = [
    { test: password.length >= 8, label: 'At least 8 characters' },
    { test: /[A-Z]/.test(password), label: 'One uppercase letter' },
    { test: /[a-z]/.test(password), label: 'One lowercase letter' },
    { test: /[0-9]/.test(password), label: 'One number' },
    { test: /[!@#$%^&*(),.?":{}|<>]/.test(password), label: 'One special character' },
  ];
  const allValid = rules.every((r) => r.test) && password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async () => {
    if (!allValid) return;
    setError('');
    setSubmitting(true);
    try {
      await apiPost('/api/v1/auth/change-initial-password', { newPassword: password });
      // Refresh user to clear mustChangePassword
      const meData = await apiGet<{ user: typeof user }>('/api/v1/auth/me');
      useAuthStore.setState({ user: meData.user });
      router.replace('/(app)/(tabs)/home');
    } catch (err: unknown) {
      const message =
        (err as any)?.response?.data?.error?.message ??
        'Failed to change password. Please try again.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.flex}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.logoRow}>
            <View style={s.logoBox}>
              <Text style={s.logoText}>S</Text>
            </View>
            <Text style={s.logoLabel}>Smart Attendance</Text>
          </View>

          <View style={s.formSection}>
            <Text style={s.heading}>Set Your Password</Text>
            <Text style={s.subtitle}>You need to set a new password before continuing.</Text>

            {error ? (
              <View style={s.errorBanner}>
                <Ionicons name="alert-circle" size={16} color={Colors.error} />
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* New Password */}
            <View style={s.fieldGroup}>
              <Text style={s.label}>New Password</Text>
              <View style={[s.inputWrap, pwFocused && s.inputFocused]}>
                <Ionicons name="lock-closed-outline" size={16} color={Colors.slate400} style={s.inputIcon} />
                <TextInput
                  style={s.input}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.slate400}
                  value={password}
                  onChangeText={(t) => { setPassword(t); setError(''); }}
                  onFocus={() => setPwFocused(true)}
                  onBlur={() => setPwFocused(false)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.slate400} />
                </TouchableOpacity>
              </View>
              {password.length > 0 && (
                <View style={s.rulesWrap}>
                  {rules.map((rule) => (
                    <View key={rule.label} style={s.ruleRow}>
                      <Ionicons
                        name={rule.test ? 'checkmark-circle' : 'ellipse-outline'}
                        size={14}
                        color={rule.test ? Colors.success : Colors.slate300}
                      />
                      <Text style={[s.ruleText, rule.test && s.rulePass]}>{rule.label}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Confirm Password */}
            <View style={s.fieldGroup}>
              <Text style={s.label}>Confirm Password</Text>
              <View style={[s.inputWrap, confirmFocused && s.inputFocused]}>
                <Ionicons name="lock-closed-outline" size={16} color={Colors.slate400} style={s.inputIcon} />
                <TextInput
                  style={s.input}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.slate400}
                  value={confirmPassword}
                  onChangeText={(t) => { setConfirmPassword(t); setError(''); }}
                  onFocus={() => setConfirmFocused(true)}
                  onBlur={() => setConfirmFocused(false)}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
              {confirmPassword.length > 0 && (
                <View style={s.rulesWrap}>
                  <View style={s.ruleRow}>
                    <Ionicons
                      name={password === confirmPassword ? 'checkmark-circle' : 'close-circle'}
                      size={14}
                      color={password === confirmPassword ? Colors.success : Colors.error}
                    />
                    <Text style={[s.ruleText, password === confirmPassword ? s.rulePass : s.ruleFail]}>
                      {password === confirmPassword ? 'Passwords match' : "Passwords don't match"}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[s.btn, (!allValid || submitting) && s.btnDisabled]}
              onPress={handleSubmit}
              disabled={!allValid || submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <View style={s.btnRow}>
                  <ActivityIndicator color={Colors.white} size="small" />
                  <Text style={s.btnText}>Setting Password…</Text>
                </View>
              ) : (
                <Text style={s.btnText}>Set Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 40 },

  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 36 },
  logoBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.slate900, alignItems: 'center', justifyContent: 'center',
  },
  logoText: { color: Colors.white, fontSize: 18, fontWeight: '700' },
  logoLabel: { fontSize: 18, fontWeight: '700', color: Colors.slate900 },

  formSection: {},
  heading: { fontSize: 22, fontWeight: '700', color: Colors.slate900, marginBottom: 6 },
  subtitle: { fontSize: 14, color: Colors.slate500, marginBottom: 28 },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FEE2E2',
    borderRadius: 10, padding: 12, marginBottom: 20,
  },
  errorText: { color: '#DC2626', fontSize: 13, flex: 1 },

  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '500' as const, color: Colors.slate700, marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    borderWidth: 1, borderColor: Colors.slate200, borderRadius: 10, backgroundColor: Colors.white,
  },
  inputFocused: { borderColor: Colors.slate900, borderWidth: 2 },
  inputIcon: { marginLeft: 12 },
  input: {
    flex: 1, paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 13 : 10,
    fontSize: 14, color: Colors.slate900,
  },
  eyeBtn: { position: 'absolute' as const, right: 12, top: 0, bottom: 0, justifyContent: 'center' as const },

  rulesWrap: { marginTop: 8, gap: 4 },
  ruleRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 },
  ruleText: { fontSize: 12, color: Colors.slate400 },
  rulePass: { color: Colors.success },
  ruleFail: { color: Colors.error },

  btn: {
    backgroundColor: Colors.slate900, borderRadius: 10,
    paddingVertical: 13, alignItems: 'center' as const, marginTop: 8,
  },
  btnDisabled: { opacity: 0.5 },
  btnRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  btnText: { color: Colors.white, fontSize: 14, fontWeight: '600' as const },
});
