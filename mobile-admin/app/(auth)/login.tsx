import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/auth.store';

const ADMIN_PRIMARY = '#7C3AED';
const ADMIN_PRIMARY_LIGHT = '#EDE9FE';

export default function LoginScreen() {
  const { login, error, clearError, isLoading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return;
    clearError();
    setSubmitting(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch {
      // Error is set in the store
    } finally {
      setSubmitting(false);
    }
  };

  const busy = submitting || isLoading;

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
          {/* Branding */}
          <View style={s.header}>
            <View style={s.logoBox}>
              <View style={s.logoInner}>
                <Text style={s.logoA}>A</Text>
              </View>
              <Text style={s.logoX}>x</Text>
            </View>
            <Text style={s.appName}>Attend  Xpress</Text>
            <View style={s.portalBadge}>
              <Ionicons name="shield-outline" size={12} color={ADMIN_PRIMARY} />
              <Text style={s.portalText}>Admin Portal</Text>
            </View>
          </View>

          {/* Card */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Admin Sign In</Text>
            <Text style={s.cardSubtitle}>Enter your admin email and password</Text>

            {/* Error banner */}
            {error ? (
              <View style={s.errorBanner}>
                <Ionicons name="alert-circle-outline" size={16} color="#DC2626" style={{ marginRight: 6 }} />
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Email */}
            <View style={s.fieldGroup}>
              <Text style={s.label}>Admin Email</Text>
              <TextInput
                style={s.input}
                placeholder="admin@company.com"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={(t) => { setEmail(t); clearError(); }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                returnKeyType="next"
                editable={!busy}
              />
            </View>

            {/* Password */}
            <View style={s.fieldGroup}>
              <Text style={s.label}>Password</Text>
              <View style={s.passwordRow}>
                <TextInput
                  style={[s.input, s.passwordInput]}
                  placeholder="••••••••"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={(t) => { setPassword(t); clearError(); }}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  editable={!busy}
                />
                <TouchableOpacity
                  style={s.eyeBtn}
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[s.btn, busy && s.btnDisabled]}
              onPress={handleLogin}
              disabled={busy || !email.trim() || !password.trim()}
              activeOpacity={0.85}
            >
              {busy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={s.btnText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={s.footer}>
            Admin access only. Unauthorised access is prohibited.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },

  // Branding
  header: { alignItems: 'center', marginBottom: 32 },
  logoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  logoInner: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: ADMIN_PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ADMIN_PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoA: { color: '#FFFFFF', fontSize: 38, fontWeight: '700' },
  logoX: { fontSize: 32, fontWeight: '700', color: '#111827', marginLeft: 6 },
  appName: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 10, letterSpacing: 0.5 },
  portalBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: ADMIN_PRIMARY_LIGHT,
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20,
  },
  portalText: { fontSize: 12, fontWeight: '600', color: ADMIN_PRIMARY },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 20 },

  // Error
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#DC2626',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: '#DC2626', fontSize: 14, flex: 1 },

  // Fields
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  passwordRow: { position: 'relative' },
  passwordInput: { paddingRight: 48 },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },

  // Button
  btn: {
    backgroundColor: ADMIN_PRIMARY,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  footer: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 13,
    color: '#9CA3AF',
  },
});
