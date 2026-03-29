import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { apiGet } from '../../../../lib/api';
import api from '../../../../lib/api';
import { Colors } from '../../../../constants/colors';
import { BS_MONTHS_EN } from '../../../../lib/nepali-date';
import StatusBadge from '../../../../components/StatusBadge';

interface PayslipRecord {
  id: string;
  bsYear: number;
  bsMonth: number;
  status: 'DRAFT' | 'PROCESSED' | 'APPROVED' | 'PAID';
  daysPresent: number;
  daysAbsent: number;
  workingDaysInMonth: number;
  basicSalary: number;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  employeeSsf: number;
  tds: number;
  orgName: string;
}

function formatNPR(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function PayslipRow({ item }: { item: PayslipRecord }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const response = await api.get(`/api/payroll/my-payslip/${item.id}/pdf`, {
        responseType: 'arraybuffer',
      });

      const bytes = new Uint8Array(response.data);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      const filename = `payslip-${item.bsYear}-${item.bsMonth}.pdf`;
      const fileUri = (FileSystem.documentDirectory ?? '') + filename;

      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Payslip ${BS_MONTHS_EN[item.bsMonth - 1]} ${item.bsYear}`,
      });
    } catch {
      Alert.alert('Error', 'Failed to download payslip PDF.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <View style={s.card}>
      <View style={s.cardTop}>
        <View>
          <Text style={s.monthLabel}>{BS_MONTHS_EN[item.bsMonth - 1]} {item.bsYear}</Text>
          <Text style={s.orgName}>{item.orgName}</Text>
        </View>
        <StatusBadge status={item.status} size="sm" />
      </View>

      <View style={s.netRow}>
        <Text style={s.netLabel}>Net Salary</Text>
        <Text style={s.netAmount}>{formatNPR(item.netSalary)}</Text>
      </View>

      <View style={s.statsRow}>
        <View style={s.statItem}>
          <Text style={s.statVal}>{item.daysPresent}</Text>
          <Text style={s.statLbl}>Present</Text>
        </View>
        <View style={s.statItem}>
          <Text style={s.statVal}>{item.daysAbsent}</Text>
          <Text style={s.statLbl}>Absent</Text>
        </View>
        <View style={s.statItem}>
          <Text style={s.statVal}>{formatNPR(item.grossSalary)}</Text>
          <Text style={s.statLbl}>Gross</Text>
        </View>
        <View style={s.statItem}>
          <Text style={[s.statVal, { color: Colors.error }]}>{formatNPR(item.totalDeductions)}</Text>
          <Text style={s.statLbl}>Deductions</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[s.pdfBtn, downloading && { opacity: 0.6 }]}
        onPress={handleDownloadPDF}
        disabled={downloading}
      >
        {downloading ? (
          <ActivityIndicator color={Colors.primary} size="small" />
        ) : (
          <Text style={s.pdfBtnText}>📄 View Payslip PDF</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function SalaryScreen() {
  const [records, setRecords] = useState<PayslipRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await apiGet<PayslipRecord[]>('/api/payroll/my-payslips');
        setRecords(Array.isArray(data) ? data : []);
      } catch {
        setError('Failed to load salary history.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Salary History</Text>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={Colors.primary} size="large" /></View>
      ) : error ? (
        <View style={s.center}>
          <Text style={{ color: Colors.error, marginBottom: 12 }}>{error}</Text>
        </View>
      ) : records.length === 0 ? (
        <View style={s.center}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>💰</Text>
          <Text style={{ color: Colors.textSecondary }}>No salary records found.</Text>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <PayslipRow item={item} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  card: { backgroundColor: Colors.card, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  monthLabel: { fontSize: 17, fontWeight: '700', color: Colors.text },
  orgName: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  netRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.primaryLight, borderRadius: 10, padding: 12, marginBottom: 12 },
  netLabel: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  netAmount: { fontSize: 20, fontWeight: '700', color: Colors.primary },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  statItem: { alignItems: 'center' },
  statVal: { fontSize: 14, fontWeight: '700', color: Colors.text },
  statLbl: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  pdfBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: Colors.primary },
  pdfBtnText: { fontSize: 14, fontWeight: '600', color: Colors.primary },
});