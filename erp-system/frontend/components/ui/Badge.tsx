import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { FontSizes, BorderRadius, Spacing } from '../../constants/typography';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'primary';

const VARIANT_STYLES: Record<BadgeVariant, { bg: string; text: string; border: string }> = {
  default: { bg: Colors.bgElevated, text: Colors.textSecondary, border: Colors.border },
  success: { bg: Colors.successBg, text: Colors.success, border: 'rgba(16,185,129,0.15)' },
  warning: { bg: Colors.warningBg, text: Colors.warning, border: 'rgba(245,158,11,0.15)' },
  error:   { bg: Colors.errorBg, text: Colors.error, border: 'rgba(239,68,68,0.15)' },
  info:    { bg: Colors.infoBg, text: Colors.info, border: 'rgba(59,130,246,0.15)' },
  primary: { bg: Colors.primaryMuted, text: Colors.primaryLight, border: 'rgba(16,185,129,0.15)' },
};

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

export function Badge({ label, variant = 'default' }: BadgeProps) {
  const v = VARIANT_STYLES[variant];
  return (
    <View style={[styles.badge, { backgroundColor: v.bg, borderColor: v.border }]}>
      <Text style={[styles.text, { color: v.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: BorderRadius.xs,
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  text: {
    fontSize: FontSizes.xs,
    fontWeight: '500',
    textTransform: 'capitalize',
    letterSpacing: -0.1,
  },
});
