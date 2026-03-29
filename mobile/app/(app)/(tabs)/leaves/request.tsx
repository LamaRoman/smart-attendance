import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { apiPost, apiGet } from '../../../../lib/api';
import { Colors } from '../../../../constants/colors';
import {
  todayBS,
  adToBS,
  bsToAD,
  BS_MONTHS_EN,
  daysInBSMonth,
} from '../../../../lib/nepali-date';

// ─── Constants ────────────────────────────────────────────────────────────────
const LEAVE_TYPES = [
  { value: 'CASUAL',    label: 'Casual Leave',   icon: '🌿' },
  { value: 'SICK',      label: 'Sick Leave',      icon: '🤒' },
  { value: 'ANNUAL',    label: 'Annual Leave',    icon: '🏖' },
  { value: 'MATERNITY', label: 'Maternity Leave', icon: '👶' },
  { value: 'PATERNITY', label: 'Paternity Leave', icon: '👨‍👶' },
  { value: 'UNPAID',    label: 'Unpaid Leave',    icon: '📋' },
];

const TRACKED_TYPES = ['ANNUAL', 'SICK', 'CASUAL'];

interface BSDate { year: number; month: number; day: number; }

interface LeaveBalance {
  annualAvailable: number;
  sickAvailable: number;
  casualAvailable: number;
}

// ─── Helper: get tomorrow in BS ───────────────────────────────────────────────
function tomorrowBS(): BSDate {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return adToBS(tomorrow);
}

// ─── BS Date Picker ───────────────────────────────────────────────────────────
function BSDatePicker({
  visible, value, title, minDate, onSelect, onClose,
}: {
  visible: boolean;
  value: BSDate;
  title: string;
  minDate?: BSDate;
  onSelect: (d: BSDate) => void;
  onClose: () => void;
}) {
  const today = todayBS();
  const tomorrow = tomorrowBS();
  const [year, setYear] = useState(value.year);
  const [month, setMonth] = useState(value.month);
  const [day, setDay] = useState(value.day);
  const totalDays = daysInBSMonth(year, month);

  // Max year — allow 2 years in the future for leave planning
  const maxYear = today.year + 2;

  const isDisabled = (y: number, m: number, d: number) => {
    // Disable today and all past dates — leave must be future
    if (y < tomorrow.year) return true;
    if (y === tomorrow.year && m < tomorrow.month) return true;
    if (y === tomorrow.year && m === tomorrow.month && d < tomorrow.day) return true;

    // Enforce minDate (end date cannot be before start date)
    if (minDate) {
      if (y < minDate.year) return true;
      if (y === minDate.year && m < minDate.month) return true;
      if (y === minDate.year && m === minDate.month && d < minDate.day) return true;
    }

    return false;
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.sheetHeader}>
          <Text style={s.sheetTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose}><Text style={s.sheetClose}>✕</Text></TouchableOpacity>
        </View>

        {/* Year + month nav */}
        <View style={s.ymRow}>
          <TouchableOpacity
            onPress={() => setYear(y => Math.max(tomorrow.year, y - 1))}
            style={s.arrowBtn}
          >
            <Text style={s.arrow}>‹</Text>
          </TouchableOpacity>
          <Text style={s.ymText}>{BS_MONTHS_EN[month - 1]} {year}</Text>
          <TouchableOpacity
            onPress={() => setYear(y => Math.min(maxYear, y + 1))}
            style={s.arrowBtn}
          >
            <Text style={s.arrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Month chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {BS_MONTHS_EN.map((name, idx) => {
            const m = idx + 1;
            const sel = m === month;
            return (
              <TouchableOpacity
                key={m}
                style={[s.monthChip, sel && s.monthChipSel]}
                onPress={() => {
                  setMonth(m);
                  if (day > daysInBSMonth(year, m)) setDay(1);
                }}
              >
                <Text style={[s.monthChipText, sel && s.monthChipTextSel]}>
                  {name.slice(0, 3)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Day grid */}
        <View style={s.dayGrid}>
          {Array.from({ length: totalDays }, (_, i) => i + 1).map(d => {
            const disabled = isDisabled(year, month, d);
            const sel = d === day;
            return (
              <TouchableOpacity
                key={d}
                disabled={disabled}
                style={[s.dayCell, sel && s.dayCellSel, disabled && s.dayCellOff]}
                onPress={() => setDay(d)}
              >
                <Text style={[s.dayCellText, sel && s.dayCellTextSel, disabled && s.dayCellTextOff]}>
                  {d}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={s.selectBtn}
          onPress={() => { onSelect({ year, month, day }); onClose(); }}
        >
          <Text style={s.selectBtnText}>
            Select {day} {BS_MONTHS_EN[month - 1]} {year}
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function LeaveRequestScreen() {
  const router = useRouter();
  const today = todayBS();
  const tomorrow = tomorrowBS();

  const [leaveType, setLeaveType] = useState('CASUAL');
  const [startDate, setStartDate] = useState<BSDate>(tomorrow);
  const [endDate, setEndDate] = useState<BSDate>(tomorrow);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [startPickerOpen, setStartPickerOpen] = useState(false);
  const [endPickerOpen, setEndPickerOpen] = useState(false);
  const [myBalance, setMyBalance] = useState<LeaveBalance | null>(null);

  useEffect(() => {
    apiGet<LeaveBalance>(`/api/leave-balance/my?bsYear=${today.year}`)
      .then(data => setMyBalance(data))
      .catch(() => {});
  }, []);

  // Duration calculation — same as web
  const startAD = bsToAD(startDate.year, startDate.month, startDate.day);
  const endAD = bsToAD(endDate.year, endDate.month, endDate.day);
  const durationDays = Math.max(1,
    Math.ceil((endAD.getTime() - startAD.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );

  // Balance hint — same as web
  const availableBalance =
    myBalance && leaveType === 'ANNUAL' ? myBalance.annualAvailable
    : myBalance && leaveType === 'SICK' ? myBalance.sickAvailable
    : myBalance && leaveType === 'CASUAL' ? myBalance.casualAvailable
    : null;

  const isTrackedType = TRACKED_TYPES.includes(leaveType);
  const showBalanceHint = myBalance !== null && isTrackedType && availableBalance !== null;
  const balanceOk = availableBalance !== null && availableBalance >= durationDays;

  const formatDate = (d: BSDate) => `${d.day} ${BS_MONTHS_EN[d.month - 1]} ${d.year}`;

  const handleSubmit = async () => {
    if (!reason.trim()) {
      Alert.alert('Error', 'Please enter a reason.');
      return;
    }
    if (endAD < startAD) {
      Alert.alert('Error', 'End date cannot be before start date.');
      return;
    }

    setSubmitting(true);
    try {
      await apiPost('/api/leaves', {
        type: leaveType,
        startDate: startAD.toISOString().split('T')[0],
        endDate: endAD.toISOString().split('T')[0],
        reason: reason.trim(),
        bsStartYear: startDate.year,
        bsStartMonth: startDate.month,
        bsStartDay: startDate.day,
        bsEndYear: endDate.year,
        bsEndMonth: endDate.month,
        bsEndDay: endDate.day,
      });
      Alert.alert('Success', 'Leave request submitted successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? 'Failed to submit leave request.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Request Leave</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">

        {/* Leave type */}
        <Text style={s.label}>Leave Type</Text>
        <View style={s.typeGrid}>
          {LEAVE_TYPES.map(t => (
            <TouchableOpacity
              key={t.value}
              style={[s.typeChip, leaveType === t.value && s.typeChipSel]}
              onPress={() => setLeaveType(t.value)}
            >
              <Text style={s.typeIcon}>{t.icon}</Text>
              <Text style={[s.typeChipText, leaveType === t.value && s.typeChipTextSel]}>
                {t.label}
              </Text>
              {leaveType === t.value && <Text style={s.checkmark}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>

        {/* Start date */}
        <Text style={s.label}>Start Date</Text>
        <TouchableOpacity style={s.dateBtn} onPress={() => setStartPickerOpen(true)}>
          <Text style={s.dateBtnText}>{formatDate(startDate)}</Text>
          <Text style={s.dateBtnIcon}>📅</Text>
        </TouchableOpacity>

        {/* End date */}
        <Text style={s.label}>End Date</Text>
        <TouchableOpacity style={s.dateBtn} onPress={() => setEndPickerOpen(true)}>
          <Text style={s.dateBtnText}>{formatDate(endDate)}</Text>
          <Text style={s.dateBtnIcon}>📅</Text>
        </TouchableOpacity>

        {/* Duration + balance hint */}
        <View style={s.durationBox}>
          <Text style={s.durationText}>
            Duration: {durationDays} day{durationDays > 1 ? 's' : ''}
          </Text>
          {showBalanceHint && (
            <Text style={[s.balanceHint, balanceOk ? s.balanceOk : s.balanceLow]}>
              {balanceOk
                ? `✓ Sufficient balance (${availableBalance} day${availableBalance !== 1 ? 's' : ''} available)`
                : `⚠ Low balance (only ${availableBalance} day${availableBalance !== 1 ? 's' : ''} available)`}
            </Text>
          )}
        </View>

        {/* Reason */}
        <Text style={s.label}>Reason</Text>
        <TextInput
          style={s.reasonInput}
          placeholder="Brief reason for leave..."
          placeholderTextColor={Colors.textMuted}
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {/* Buttons */}
        <View style={s.btnRow}>
          <TouchableOpacity style={s.cancelBtn} onPress={() => router.back()}>
            <Text style={s.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.submitBtn, submitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting
              ? <ActivityIndicator color={Colors.white} />
              : <Text style={s.submitBtnText}>Submit</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <BSDatePicker
        visible={startPickerOpen}
        value={startDate}
        title="Select Start Date"
        onSelect={d => {
          setStartDate(d);
          // If new start is after current end, reset end to same day as start
          const newStartAD = bsToAD(d.year, d.month, d.day);
          const currentEndAD = bsToAD(endDate.year, endDate.month, endDate.day);
          if (currentEndAD < newStartAD) setEndDate(d);
        }}
        onClose={() => setStartPickerOpen(false)}
      />
      <BSDatePicker
        visible={endPickerOpen}
        value={endDate}
        title="Select End Date"
        minDate={startDate}
        onSelect={d => setEndDate(d)}
        onClose={() => setEndPickerOpen(false)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 28, color: Colors.primary, lineHeight: 32 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: Colors.text },
  body: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '700', color: Colors.gray700, marginBottom: 8, marginTop: 16 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.gray100, borderWidth: 1, borderColor: Colors.border, width: '48%' },
  typeChipSel: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  typeIcon: { fontSize: 16 },
  typeChipText: { fontSize: 12, fontWeight: '600', color: Colors.gray700, flex: 1 },
  typeChipTextSel: { color: Colors.primary },
  checkmark: { fontSize: 12, color: Colors.primary, fontWeight: '700' },
  dateBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.card, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 14 },
  dateBtnText: { fontSize: 15, fontWeight: '600', color: Colors.text },
  dateBtnIcon: { fontSize: 18 },
  durationBox: { marginTop: 10, backgroundColor: Colors.gray50, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: Colors.border, gap: 4 },
  durationText: { fontSize: 13, fontWeight: '600', color: Colors.gray700 },
  balanceHint: { fontSize: 12, fontWeight: '500' },
  balanceOk: { color: Colors.success },
  balanceLow: { color: Colors.warning },
  reasonInput: { backgroundColor: Colors.card, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.text, minHeight: 100 },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: Colors.gray600 },
  submitBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center' },
  submitBtnText: { fontSize: 14, fontWeight: '700', color: Colors.white },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: Colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  sheetClose: { fontSize: 18, color: Colors.textSecondary },
  ymRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  arrowBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  arrow: { fontSize: 28, color: Colors.primary },
  ymText: { fontSize: 16, fontWeight: '700', color: Colors.text, width: 160, textAlign: 'center' },
  monthChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: Colors.gray100, marginRight: 6 },
  monthChipSel: { backgroundColor: Colors.primary },
  monthChipText: { fontSize: 12, fontWeight: '600', color: Colors.gray700 },
  monthChipTextSel: { color: Colors.white },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  dayCell: { width: 40, height: 40, borderRadius: 8, backgroundColor: Colors.gray100, alignItems: 'center', justifyContent: 'center' },
  dayCellSel: { backgroundColor: Colors.primary },
  dayCellOff: { opacity: 0.3 },
  dayCellText: { fontSize: 13, fontWeight: '600', color: Colors.gray700 },
  dayCellTextSel: { color: Colors.white },
  dayCellTextOff: { color: Colors.gray400 },
  selectBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  selectBtnText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
});