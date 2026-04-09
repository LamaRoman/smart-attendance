import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import { apiGet } from '../../../../lib/api';
import { Colors } from '../../../../constants/colors';
import { BS_MONTHS_EN } from '../../../../lib/nepali-date';
import StatusBadge from '../../../../components/StatusBadge';
import { TokenStorage } from '../../../../lib/auth';

const API_URL = __DEV__ ? 'http://192.168.1.65:5001' : 'https://api.zentaralabs.com';

interface PayslipDetail {
  id: string;
  bsYear: number;
  bsMonth: number;
  status: 'DRAFT' | 'PROCESSED' | 'APPROVED' | 'PAID';
  workingDaysInMonth: number;
  daysPresent: number;
  daysAbsent: number;
  basicSalary: number;
  grossSalary: number;
  dearnessAllowance: number;
  transportAllowance: number;
  medicalAllowance: number;
  otherAllowances: number;
  overtimePay: number;
  dashainBonus: number;
  absenceDeduction: number;
  employeeSsf: number;
  employeePf: number;
  citDeduction: number;
  tds: number;
  advanceDeduction: number;
  totalDeductions: number;
  netSalary: number;
  orgName: string;
}

function formatNPR(amount: number): string {
  if (!amount) return 'Rs. 0';
  return `Rs. ${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function Row({ label, amount, highlight, negative }: {
  label: string; amount: number;
  highlight?: boolean; negative?: boolean;
}) {
  if (!amount || amount === 0) return null;
  return (
    <View style={[s.row, highlight && s.rowHighlight]}>
      <Text style={[s.rowLabel, highlight && s.rowLabelBold]}>{label}</Text>
      <Text style={[s.rowAmount, highlight && s.rowAmountBold, negative && { color: Colors.error }]}>
        {negative ? '- ' : ''}{formatNPR(amount)}
      </Text>
    </View>
  );
}

export default function PayslipDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [record, setRecord] = useState<PayslipDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        // Get from list since there's no single-record endpoint
        const records = await apiGet<PayslipDetail[]>('/api/v1/payroll/my-payslips');
        const found = Array.isArray(records) ? records.find((r: any) => r.id === id) : null;
        if (found) setRecord(found as any);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const token = await TokenStorage.getAccessToken();
      const filename = `payslip-${record?.bsYear}-${record?.bsMonth}.pdf`;
      const fileUri = (FileSystem.documentDirectory ?? '') + filename;
      const result = await FileSystem.downloadAsync(
        `${API_URL}/api/v1/payroll/my-payslip/${id}/pdf`,
        fileUri,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (result.status !== 200) {
        throw new Error(`Download failed (status ${result.status})`);
      }
      if (Platform.OS === 'android') {
        const contentUri = await FileSystem.getContentUriAsync(result.uri);
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: contentUri,
          flags: 1,
          type: 'application/pdf',
        });
      } else {
        await Sharing.shareAsync(result.uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Payslip ${record ? BS_MONTHS_EN[record.bsMonth - 1] + ' ' + record.bsYear : ''}`,
        });
      }
    } catch {
      Alert.alert('Error', 'Failed to download payslip PDF.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}><ActivityIndicator color={Colors.slate900} size="large" /></View>
      </SafeAreaView>
    );
  }

  if (!record) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}><Text style={{ color: Colors.slate500 }}>Payslip not found.</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>{BS_MONTHS_EN[record.bsMonth - 1]} {record.bsYear}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Status + org */}
        <View style={s.topCard}>
          <Text style={s.orgName}>{record.orgName}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <Text style={s.periodLabel}>{BS_MONTHS_EN[record.bsMonth - 1]} {record.bsYear}</Text>
            <StatusBadge status={record.status} />
          </View>
        </View>

        {/* Net salary */}
        <View style={s.netCard}>
          <Text style={s.netLabel}>Net Salary</Text>
          <Text style={s.netAmount}>{formatNPR(record.netSalary)}</Text>
        </View>

        {/* Attendance */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Attendance</Text>
          <View style={s.attendanceRow}>
            <View style={s.attItem}><Text style={s.attVal}>{record.workingDaysInMonth}</Text><Text style={s.attLbl}>Working Days</Text></View>
            <View style={s.attItem}><Text style={[s.attVal, { color: Colors.success }]}>{record.daysPresent}</Text><Text style={s.attLbl}>Present</Text></View>
            <View style={s.attItem}><Text style={[s.attVal, { color: Colors.error }]}>{record.daysAbsent}</Text><Text style={s.attLbl}>Absent</Text></View>
          </View>
        </View>

        {/* Earnings */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Earnings</Text>
          <Row label="Basic Salary" amount={record.basicSalary} />
          <Row label="Dearness Allowance" amount={record.dearnessAllowance} />
          <Row label="Transport Allowance" amount={record.transportAllowance} />
          <Row label="Medical Allowance" amount={record.medicalAllowance} />
          <Row label="Other Allowances" amount={record.otherAllowances} />
          <Row label="Overtime Pay" amount={record.overtimePay} />
          <Row label="Dashain Bonus" amount={record.dashainBonus} />
          <View style={s.divider} />
          <Row label="Gross Salary" amount={record.grossSalary} highlight />
        </View>

        {/* Deductions */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Deductions</Text>
          <Row label="Absence Deduction" amount={record.absenceDeduction} negative />
          <Row label="Employee SSF (11%)" amount={record.employeeSsf} negative />
          <Row label="Employee PF (10%)" amount={record.employeePf} negative />
          <Row label="CIT" amount={record.citDeduction} negative />
          <Row label="TDS (Income Tax)" amount={record.tds} negative />
          <Row label="Advance Deduction" amount={record.advanceDeduction} negative />
          <View style={s.divider} />
          <Row label="Total Deductions" amount={record.totalDeductions} highlight negative />
        </View>

        {/* Net */}
        <View style={[s.section, s.netSection]}>
          <Text style={s.netSectionLabel}>Net Salary</Text>
          <Text style={s.netSectionAmount}>{formatNPR(record.netSalary)}</Text>
        </View>

        {/* PDF button */}
        <TouchableOpacity
          style={[s.pdfBtn, downloading && { opacity: 0.6 }]}
          onPress={handleDownloadPDF}
          disabled={downloading}
        >
          {downloading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={s.pdfBtnText}>📄  View Payslip PDF</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.slate50 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.slate100 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 28, color: Colors.slate900, lineHeight: 32 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: Colors.slate900 },
  topCard: { margin: 16, backgroundColor: Colors.white, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.slate200 },
  orgName: { fontSize: 13, color: Colors.slate400, fontWeight: '600' },
  periodLabel: { fontSize: 15, fontWeight: '700', color: Colors.slate900 },
  netCard: { marginHorizontal: 16, backgroundColor: Colors.slate900, borderRadius: 14, padding: 20, alignItems: 'center', marginBottom: 16 },
  netLabel: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  netAmount: { fontSize: 32, fontWeight: '700', color: Colors.white },
  section: { marginHorizontal: 16, backgroundColor: Colors.white, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.slate200 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: Colors.slate400, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  attendanceRow: { flexDirection: 'row', justifyContent: 'space-around' },
  attItem: { alignItems: 'center' },
  attVal: { fontSize: 22, fontWeight: '700', color: Colors.slate900 },
  attLbl: { fontSize: 12, color: Colors.slate400, marginTop: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowHighlight: { paddingTop: 10 },
  rowLabel: { fontSize: 14, color: Colors.slate700 },
  rowLabelBold: { fontWeight: '700', color: Colors.slate900 },
  rowAmount: { fontSize: 14, color: Colors.slate900 },
  rowAmountBold: { fontWeight: '700', fontSize: 15 },
  divider: { height: 1, backgroundColor: Colors.slate200, marginVertical: 6 },
  netSection: { backgroundColor: Colors.successLight, borderColor: '#BBF7D0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  netSectionLabel: { fontSize: 16, fontWeight: '700', color: Colors.success },
  netSectionAmount: { fontSize: 20, fontWeight: '700', color: Colors.success },
  pdfBtn: { marginHorizontal: 16, marginTop: 8, backgroundColor: Colors.slate900, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  pdfBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
});