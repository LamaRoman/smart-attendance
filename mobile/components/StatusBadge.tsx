import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

export type AttendanceStatus = 'ON_TIME' | 'LATE' | 'ABSENT' | 'AUTO_CLOSED' | 'ACTIVE';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type SalaryStatus = 'DRAFT' | 'PROCESSED' | 'APPROVED' | 'PAID';

type BadgeStatus = AttendanceStatus | LeaveStatus | SalaryStatus;

const CONFIG: Record<BadgeStatus, { label: string; bg: string; text: string; dot: string }> = {
  ON_TIME:    { label: 'On Time',    bg: Colors.successLight, text: Colors.success, dot: Colors.success },
  LATE:       { label: 'Late',       bg: Colors.warningLight, text: Colors.warning, dot: Colors.warning },
  ABSENT:     { label: 'Absent',     bg: Colors.errorLight,   text: Colors.error,   dot: Colors.error },
  AUTO_CLOSED:{ label: 'Auto-closed',bg: Colors.orangeLight,  text: Colors.orange,  dot: Colors.orange },
  ACTIVE:     { label: 'Active',     bg: Colors.successLight, text: Colors.success, dot: Colors.success },

  PENDING:    { label: 'Pending',    bg: Colors.warningLight, text: Colors.warning, dot: Colors.warning },
  APPROVED:   { label: 'Approved',   bg: Colors.successLight, text: Colors.success, dot: Colors.success },
  REJECTED:   { label: 'Rejected',   bg: Colors.errorLight,   text: Colors.error,   dot: Colors.error },

  DRAFT:      { label: 'Draft',      bg: Colors.gray100,      text: Colors.gray600, dot: Colors.gray400 },
  PROCESSED:  { label: 'Processed',  bg: Colors.primaryLight, text: Colors.primary, dot: Colors.primary },
  PAID:       { label: 'Paid',       bg: Colors.successLight, text: Colors.success, dot: Colors.success },
};

interface Props {
  status: BadgeStatus;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'md' }: Props) {
  const cfg = CONFIG[status] ?? { label: status, bg: Colors.gray100, text: Colors.gray600, dot: Colors.gray400 };
  const isSmall = size === 'sm';

  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }, isSmall && styles.badgeSm]}>
      <View style={[styles.dot, { backgroundColor: cfg.dot }, isSmall && styles.dotSm]} />
      <Text style={[styles.label, { color: cfg.text }, isSmall && styles.labelSm]}>{cfg.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 5,
    alignSelf: 'flex-start',
  },
  badgeSm: { paddingHorizontal: 8, paddingVertical: 3 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  dotSm: { width: 6, height: 6 },
  label: { fontSize: 13, fontWeight: '600' },
  labelSm: { fontSize: 11 },
});
