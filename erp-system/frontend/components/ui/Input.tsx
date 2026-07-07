import React, { useState } from 'react';
import { TextInput, View, Text, StyleSheet, TextInputProps, ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';
import { FontSizes, BorderRadius, Spacing } from '../../constants/typography';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  containerStyle?: ViewStyle;
}

export function Input({ label, error, icon, containerStyle, ...rest }: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[
        styles.inputWrapper,
        isFocused && styles.focused,
        error ? styles.errorBorder : undefined,
      ]}>
        {icon && <View style={styles.icon}>{icon}</View>}
        <TextInput
          style={[styles.input, icon ? { paddingLeft: 0 } : undefined]}
          placeholderTextColor={Colors.textMuted}
          selectionColor={Colors.primary}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...rest}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.base },
  label: {
    color: Colors.textSecondary, fontSize: FontSizes.sm,
    fontWeight: '500', marginBottom: Spacing.sm, letterSpacing: -0.1,
  },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.bgSurface, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.base,
  },
  focused: { borderColor: Colors.primaryDark, backgroundColor: Colors.bgCard },
  errorBorder: { borderColor: Colors.error },
  icon: { marginRight: Spacing.sm },
  input: {
    flex: 1, color: Colors.text, fontSize: FontSizes.base,
    paddingVertical: Spacing.md + 2, letterSpacing: -0.1,
  },
  errorText: { color: Colors.error, fontSize: FontSizes.xs, marginTop: Spacing.xs },
});
