import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiGet } from '../../../lib/api';
import { todayBS, BS_MONTHS_EN } from '../../../lib/nepali-date';
import StatusBadge, { AttendanceStatus } from '../../../components/StatusBadge';
import { Colors } from '../../../constants/colors';

interface AttendanceRecord {
  id: string;
  bsDate: string;
  clockIn: string | null;
  clockOut: string | null;
  durationMinutes: number | null;
  status: AttendanceStatus | null;
  isHoliday: boolean;
  isWeekend: boolean;
}

interface AttendanceSummary {
  present: number;
  absent: number;
  late: number;
  totalHoursMinutes: number;
  records: AttendanceRecord[];
}

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function formatTotalHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ─── Month Picker Modal ───────────────────────────────────────────────────────
function MonthPicker({ visible, year, month, onSelect, onClose }: {
  visible: boolean; year: number; month: number;
  onSelect: (y: number, m: number) => void; onClose: () => void;
}) {
  const today = todayBS();
  const [pickerYear, setPickerYear] = useState(year);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Select Month</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.sheetClose}>✕</Text></TouchableOpacity>
        </View>
        <View style={styles.yearRow}>
          <TouchableOpacity onPress={() => setPickerYear(y => Math.max(2070, y - 1))} style={styles.yearBtn}>
            <Text style={styles.yearArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.yearText}>{pickerYear}</Text>
          <TouchableOpacity onPress={() => setPickerYear(y => Math.min(today.year, y + 1))} style={styles.yearBtn}>
            <Text style={styles.yearArrow}>›</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.monthGrid}>
          {BS_MONTHS_EN.map((name, idx) => {
            const m = idx + 1;
            const isFuture = pickerYear === today.year && m > today.month;
            const isSelected = pickerYear === year && m === month;
            return (
              <TouchableOpacity key={m} disabled={isFuture}
                style={[styles.mCell, isSelected && styles.mCellSel, isFuture && styles.mCellOff]}
                onPress={() => { onSelect(pickerYear, m); onClose(); }}>
                <Text style={[styles.mText, isSelected && styles.mTextSel, isFuture && styles.mTextOff]}>
                  {name.slice(0, 3)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

// ─── Record row ───────────────────────────────────────────────────────────────
function RecordRow({ item }: { item: AttendanceRecord }) {
  const day = item.bsDate?.split('-')[2] ?? '?';
  if (item.isHoliday || item.isWeekend) {
    return (
      <View style={[styles.row, { opacity: 0.4 }]}>
        <View style={styles.dayBadge}><Text style={styles.dayNum}>{day}</Text></View>
        <Text style={{ fontSize: 14, color: Colors.slate500, fontStyle: 'italic' }}>
          {item.isHoliday ? 'Holiday' : 'Weekend'}
        </Text>
      </View>
    );
  }
  const absent = !item.clockIn;
  return (
    <View style={styles.row}>
      <View style={[styles.dayBadge, absent && styles.dayBadgeAbsent]}>
        <Text style={[styles.dayNum, absent && { color: Colors.error }]}>{day}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.timeRange}>
            {absent ? 'No record'
              : `${formatTime(item.clockIn)} → ${item.clockOut ? formatTime(item.clockOut) : '…'}`}
          </Text>
          {item.status && <StatusBadge status={item.status} size="sm" />}
        </View>
        {item.durationMinutes ? (
          <Text style={{ fontSize: 12, color: Colors.slate400, marginTop: 2 }}>
            {formatDuration(item.durationMinutes)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function AttendanceScreen() {
  const router = useRouter();
  const today = todayBS();
  const [year, setYear] = useState(today.year);
  const [month, setMonth] = useState(today.month);
  const [data, setData] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  const load = useCallback(async (y: number, m: number) => {
    setLoading(true); setError('');
    try {
      const result = await apiGet<AttendanceSummary>(`/api/v1/attendance/my?bsYear=${y}&bsMonth=${m}`);
      setData(result);
    } catch { setError('Failed to load. Tap to retry.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(year, month); }, [year, month]);

  const canNext = year < today.year || (year === today.year && month < today.month);
  const prev = () => month === 1 ? (setYear(y => y - 1), setMonth(12)) : setMonth(m => m - 1);
  const next = () => canNext && (month === 12 ? (setYear(y => y + 1), setMonth(1)) : setMonth(m => m + 1));

  return (
    <SafeAreaView style={styles.safe}>
      {/* Month nav */}
      <View style={styles.nav}>
        <TouchableOpacity onPress={prev} style={styles.navBtn}><Text style={styles.navArrowTxt}>‹</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setPickerOpen(true)} style={styles.navLabel}>
          <Text style={styles.navLabelTxt}>{BS_MONTHS_EN[month - 1]} {year} ▾</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={next} style={styles.navBtn} disabled={!canNext}>
          <Text style={[styles.navArrowTxt, !canNext && { color: Colors.gray300 }]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Summary bar */}
      {data && !loading && (
        <View style={styles.summaryBar}>
          {[
            { label: 'Present', val: data.present, color: Colors.success },
            { label: 'Late', val: data.late, color: Colors.warning },
            { label: 'Absent', val: data.absent, color: Colors.error },
            { label: 'Total', val: formatTotalHours(data.totalHoursMinutes), color: Colors.slate900 },
          ].map(({ label, val, color }) => (
            <View key={label} style={styles.sumCell}>
              <Text style={[styles.sumVal, { color }]}>{val}</Text>
              <Text style={styles.sumLbl}>{label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Quick-access GPS check-in */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionChip}
          onPress={() => router.push('/(app)/attendance/gps-checkin')}>
          <Ionicons name="location-outline" size={16} color={Colors.success} />
          <Text style={styles.actionChipText}>GPS Check-in</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.slate900} size="large" /></View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={{ color: Colors.error, marginBottom: 12 }}>{error}</Text>
          <TouchableOpacity onPress={() => load(year, month)} style={styles.retryBtn}>
            <Text style={{ color: Colors.white, fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : !data?.records?.length ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>📭</Text>
          <Text style={{ color: Colors.slate500 }}>No records for this month.</Text>
        </View>
      ) : (
        <FlatList
          data={data.records}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <RecordRow item={item} />}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: Colors.slate100, marginLeft: 72 }} />}
          contentContainerStyle={{ paddingVertical: 8 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <MonthPicker
        visible={pickerOpen}
        year={year}
        month={month}
        onSelect={(y, m) => { setYear(y); setMonth(m); }}
        onClose={() => setPickerOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.slate50 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.slate100, paddingHorizontal: 8, paddingVertical: 10 },
  navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  navArrowTxt: { fontSize: 28, color: Colors.slate900, lineHeight: 32 },
  navLabel: {},
  navLabelTxt: { fontSize: 17, fontWeight: '700', color: Colors.slate900 },
  summaryBar: { flexDirection: 'row', backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.slate100 },
  sumCell: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  sumVal: { fontSize: 18, fontWeight: '700' },
  sumLbl: { fontSize: 11, color: Colors.slate400, marginTop: 2 },
  actionRow: { padding: 12 },
  actionChip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10, paddingVertical: 10, backgroundColor: Colors.successLight },
  actionChipText: { fontSize: 13, fontWeight: '700', color: Colors.success },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.white },
  dayBadge: { width: 44, height: 44, borderRadius: 10, backgroundColor: Colors.slate100, alignItems: 'center', justifyContent: 'center' },
  dayBadgeAbsent: { backgroundColor: Colors.errorLight },
  dayNum: { fontSize: 16, fontWeight: '700', color: Colors.slate900 },
  timeRange: { fontSize: 14, fontWeight: '600', color: Colors.slate900 },
  retryBtn: { backgroundColor: Colors.slate900, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },

  // Picker
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: Colors.slate900 },
  sheetClose: { fontSize: 18, color: Colors.slate500 },
  yearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  yearBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  yearArrow: { fontSize: 28, color: Colors.slate900 },
  yearText: { fontSize: 20, fontWeight: '700', color: Colors.slate900, width: 80, textAlign: 'center' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mCell: { width: '23%', paddingVertical: 12, alignItems: 'center', borderRadius: 10, backgroundColor: Colors.slate100 },
  mCellSel: { backgroundColor: Colors.slate900 },
  mCellOff: { opacity: 0.35 },
  mText: { fontSize: 13, fontWeight: '600', color: Colors.slate700 },
  mTextSel: { color: Colors.white },
  mTextOff: { color: Colors.slate400 },
});
