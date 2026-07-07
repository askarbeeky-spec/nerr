import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/auth.store';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Colors } from '../../constants/colors';
import { FontSizes, Spacing, BorderRadius } from '../../constants/typography';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading } = useAuthStore();

  const handleLogin = async () => {
    setError('');
    if (!email || !password) { setError('Please fill in all fields'); return; }
    try { await login(email.trim(), password); }
    catch (err: any) { setError(err?.response?.data?.message || 'Authentication failed'); }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.inner}>
        {/* Branding */}
        <View style={styles.brand}>
          <View style={styles.logoRow}>
            <View style={styles.logoDiamond}>
              <Text style={styles.logoIcon}>◆</Text>
            </View>
            <Text style={styles.logoName}>ERP</Text>
          </View>
          <Text style={styles.heading}>Welcome back</Text>
          <Text style={styles.sub}>Sign in to continue to your workspace</Text>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={15} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Input
            label="Email"
            placeholder="admin@erp.local"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            icon={<Ionicons name="mail-outline" size={16} color={Colors.textMuted} />}
          />
          <Input
            label="Password"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            icon={<Ionicons name="lock-closed-outline" size={16} color={Colors.textMuted} />}
          />
          <View style={{ height: Spacing.sm }} />
          <Button title="Continue" onPress={handleLogin} loading={isLoading} fullWidth size="lg" />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.divider} />
          <Text style={styles.hint}>Demo: admin@erp.local / Admin@12345</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  inner: {
    flex: 1, justifyContent: 'center', paddingHorizontal: Spacing['2xl'],
    maxWidth: 400, width: '100%', alignSelf: 'center',
  },
  brand: { marginBottom: Spacing['2xl'] },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xl },
  logoDiamond: {
    width: 36, height: 36, borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  logoIcon: { color: Colors.black, fontSize: 16, fontWeight: '800' },
  logoName: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: '800', letterSpacing: 1 },
  heading: {
    fontSize: FontSizes['2xl'], fontWeight: '700', color: Colors.text, letterSpacing: -0.5,
  },
  sub: { fontSize: FontSizes.base, color: Colors.textMuted, marginTop: Spacing.xs },
  formCard: {
    backgroundColor: Colors.bgCard, borderRadius: BorderRadius.xl,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.xl,
  },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.errorBg, padding: Spacing.md,
    borderRadius: BorderRadius.sm, marginBottom: Spacing.base,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.15)',
  },
  errorText: { color: Colors.error, fontSize: FontSizes.sm },
  footer: { marginTop: Spacing['2xl'], alignItems: 'center' },
  divider: {
    width: 40, height: 1, backgroundColor: Colors.border, marginBottom: Spacing.base,
  },
  hint: { color: Colors.textMuted, fontSize: FontSizes.xs },
});
