// Brand colors — matches web frontend
export const Colors = {
  primary: '#2563EB',       // blue-600
  primaryDark: '#1D4ED8',   // blue-700
  primaryLight: '#EFF6FF',  // blue-50

  success: '#16A34A',       // green-600
  successLight: '#F0FDF4',  // green-50
  warning: '#D97706',       // amber-600
  warningLight: '#FFFBEB',  // amber-50
  error: '#DC2626',         // red-600
  errorLight: '#FEF2F2',    // red-50
  orange: '#EA580C',        // orange-600
  orangeLight: '#FFF7ED',   // orange-50

  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',

  white: '#FFFFFF',
  background: '#F9FAFB',
  card: '#FFFFFF',
  border: '#E5E7EB',
  text: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
};

export type ColorKey = keyof typeof Colors;
