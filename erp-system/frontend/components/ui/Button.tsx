import React from 'react';
import {
  TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { FontSizes, BorderRadius, Spacing } from '../../constants/typography';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  title, onPress, variant = 'primary', size = 'md',
  loading = false, disabled = false, fullWidth = false, icon,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        styles.base, styles[variant], styles[`size_${size}`],
        fullWidth && styles.fullWidth, isDisabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'primary' ? Colors.black : Colors.primary} />
      ) : (
        <>
          {icon}
          <Text style={[
            styles.text, styles[`text_${variant}`], styles[`textSize_${size}`],
            icon ? { marginLeft: 6 } : undefined,
          ]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.transparent,
  } as ViewStyle,
  primary: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  secondary: { backgroundColor: Colors.bgElevated, borderColor: Colors.border },
  outline: { backgroundColor: Colors.transparent, borderColor: Colors.borderLight },
  ghost: { backgroundColor: Colors.transparent, borderColor: Colors.transparent },
  danger: { backgroundColor: Colors.errorBg, borderColor: 'rgba(239,68,68,0.2)' },
  size_sm: { paddingVertical: 7, paddingHorizontal: Spacing.base },
  size_md: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg },
  size_lg: { paddingVertical: Spacing.base, paddingHorizontal: Spacing.xl },
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.45 },
  text: { fontWeight: '600', textAlign: 'center', letterSpacing: -0.2 } as TextStyle,
  text_primary: { color: Colors.black },
  text_secondary: { color: Colors.text },
  text_outline: { color: Colors.text },
  text_ghost: { color: Colors.primary },
  text_danger: { color: Colors.error },
  textSize_sm: { fontSize: FontSizes.sm },
  textSize_md: { fontSize: FontSizes.base },
  textSize_lg: { fontSize: FontSizes.md },
});
