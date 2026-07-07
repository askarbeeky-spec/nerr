import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';
import { BorderRadius, Spacing } from '../../constants/typography';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: keyof typeof Spacing;
  variant?: 'default' | 'glass';
}

export function Card({ children, style, padding = 'lg', variant = 'default' }: CardProps) {
  return (
    <View style={[
      styles.card,
      variant === 'glass' && styles.glass,
      { padding: Spacing[padding] },
      style,
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  glass: {
    backgroundColor: Colors.bgGlass,
    borderColor: Colors.borderSubtle,
  },
});
