// ─── ERP Design System Colors ─────────────────────────
// Premium dark palette with emerald accent — inspired by Linear, Raycast

export const Colors = {
  // Primary brand — rich emerald
  primary: '#10B981',
  primaryLight: '#34D399',
  primaryDark: '#059669',
  primaryMuted: 'rgba(16, 185, 129, 0.10)',
  primaryGlow: 'rgba(16, 185, 129, 0.25)',

  // Accent — soft violet
  accent: '#A78BFA',
  accentLight: '#C4B5FD',
  accentMuted: 'rgba(167, 139, 250, 0.10)',

  // Backgrounds — deep charcoal
  bg: '#09090B',
  bgSurface: '#111113',
  bgCard: '#18181B',
  bgElevated: '#27272A',
  bgInput: '#18181B',
  bgOverlay: 'rgba(0, 0, 0, 0.75)',
  bgGlass: 'rgba(24, 24, 27, 0.80)',
  bgHover: 'rgba(255, 255, 255, 0.04)',
  bgGradientStart: '#09090B',
  bgGradientEnd: '#0C1222',

  // Text
  text: '#FAFAFA',
  textSecondary: '#A1A1AA',
  textMuted: '#52525B',
  textInverse: '#09090B',

  // Borders
  border: 'rgba(255, 255, 255, 0.06)',
  borderLight: 'rgba(255, 255, 255, 0.10)',
  borderFocus: '#10B981',
  borderSubtle: 'rgba(255, 255, 255, 0.03)',

  // Status
  success: '#10B981',
  successBg: 'rgba(16, 185, 129, 0.10)',
  warning: '#F59E0B',
  warningBg: 'rgba(245, 158, 11, 0.10)',
  error: '#EF4444',
  errorBg: 'rgba(239, 68, 68, 0.10)',
  info: '#3B82F6',
  infoBg: 'rgba(59, 130, 246, 0.10)',

  // Misc
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export type ColorKey = keyof typeof Colors;
