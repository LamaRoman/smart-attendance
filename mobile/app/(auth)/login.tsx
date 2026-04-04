import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/auth.store';
import { Colors } from '../../constants/colors';

export default function LoginScreen() {
  const { login, error, clearError, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return;
    clearError();
    setSubmitting(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch {
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
          {/* Logo */}
          <View style={s.logoRow}>
            <View style={s.logoBox}>
              <Text style={s.logoText}>S</Text>
            </View>
            <Text style={s.logoLabel}>Smart Attendance</Text>
          </View>

          {/* Form */}
          <View style={s.formSection}>
            <Text style={s.heading}>Sign in</Text>
            <Text style={s.subtitle}>Enter your credentials to access your account</Text>

            {/* Error */}
            {error ? (
              <View style={s.errorBanner}>
                <Ionicons name="alert-circle" size={16} color={Colors.error} />
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Email */}
            <View style={s.fieldGroup}>
              <Text style={s.label}>Email</Text>
              <View style={[s.inputWrap, emailFocused && s.inputFocused]}>
                <Ionicons name="mail-outline" size={16} color={Colors.slate400} style={s.inputIcon} />
                <TextInput
                  style={s.input}
                  placeholder="name@company.com"
                  placeholderTextColor={Colors.slate400}
                  value={email}
                  onChangeText={(t) => { setEmail(t); clearError(); }}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  editable={!busy}
                />
              </View>
            </View>

            {/* Password */}
            <View style={s.fieldGroup}>
              <Text style={s.label}>Password</Text>
              <View style={[s.inputWrap, passwordFocused && s.inputFocused]}>
                <Ionicons name="lock-closed-outline" size={16} color={Colors.slate400} style={s.inputIcon} />
                <TextInput
                  ref={passwordRef}
                  style={[s.input, { paddingRight: 44 }]}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.slate400}
                  value={password}
                  onChangeText={(t) => { setPassword(t); clearError(); }}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
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
                    size={18}
                    color={Colors.slate400}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Sign in button */}
            <TouchableOpacity
              style={[s.btn, busy && s.btnDisabled]}
              onPress={handleLogin}
              disabled={busy || !email.trim() || !password.trim()}
              activeOpacity={0.85}
            >
              {busy ? (
                <View style={s.btnRow}>
                  <ActivityIndicator color={Colors.white} size="small" />
                  <Text style={s.btnText}>Signing in...</Text>
                </View>
              ) : (
                <View style={s.btnRow}>
                  <Ionicons name="log-in-outline" size={16} color={Colors.white} />
                  <Text style={s.btnText}>Sign in</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Footer divider */}
            <View style={s.divider} />
            <Text style={s.footerText}>
              Having trouble? Contact your HR administrator.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },

  // Logo
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 40,
  },
  logoBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.slate900,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  logoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.slate900,
    letterSpacing: -0.3,
  },

  // Form
  formSection: {},
  heading: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.slate900,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.slate500,
    marginBottom: 28,
  },

  // Error
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  errorText: { color: '#DC2626', fontSize: 13, flex: 1 },

  // Fields
  fieldGroup: { marginBottom: 16 },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.slate700,
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.slate200,
    borderRadius: 10,
    backgroundColor: Colors.white,
  },
  inputFocused: {
    borderColor: Colors.slate900,
    borderWidth: 2,
  },
  inputIcon: {
    marginLeft: 12,
  },
  input: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 13 : 10,
    fontSize: 14,
    color: Colors.slate900,
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },

  // Button
  btn: {
    backgroundColor: Colors.slate900,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.5 },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },

  // Footer
  divider: {
    height: 1,
    backgroundColor: Colors.slate100,
    marginTop: 32,
    marginBottom: 16,
  },
  footerText: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.slate400,
  },
});
