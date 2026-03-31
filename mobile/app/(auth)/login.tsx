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
import { useAuthStore } from '../../store/auth.store';
import { Colors } from '../../constants/colors';

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
      // Navigation happens automatically via the auth guard in _layout.tsx
    } catch {
      // Error is set in the store — displayed below
    } finally {
      setSubmitting(false);
    }
  };

  const busy = submitting || isLoading;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo / branding */}
          <View style={styles.header}>
            <View style={styles.logoBox}>
              <Text style={styles.logoText}>SA</Text>
            </View>
            <Text style={styles.appName}>Smart Attendance</Text>
            <Text style={styles.tagline}>Employee Portal</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign In</Text>
            <Text style={styles.cardSubtitle}>Enter your work email and password</Text>

            {/* Error banner */}
            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Work Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@company.com"
                placeholderTextColor={Colors.textMuted}
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
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.textMuted}
                  value={password}
                  onChangeText={(t) => { setPassword(t); clearError(); }}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  editable={!busy}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.btn, busy && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={busy || !email.trim() || !password.trim()}
              activeOpacity={0.85}
            >
              {busy ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.btnText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.footer}>
            Having trouble? Contact your HR administrator.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },

  // Header
  header: { alignItems: 'center', marginBottom: 32 },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoText: { color: Colors.white, fontSize: 26, fontWeight: '700' },
  appName: { fontSize: 24, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  tagline: { fontSize: 14, color: Colors.textSecondary },

  // Card
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: 20 },

  // Error
  errorBanner: {
    backgroundColor: Colors.errorLight,
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: Colors.error, fontSize: 14 },

  // Fields
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.gray700, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.white,
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
  eyeText: { fontSize: 18 },

  // Button
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },

  footer: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 13,
    color: Colors.textMuted,
  },
});
