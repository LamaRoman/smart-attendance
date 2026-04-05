import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import { apiGet } from '../../../../lib/api';
import { Colors } from '../../../../constants/colors';
import { BS_MONTHS_EN } from '../../../../lib/nepali-date';
import StatusBadge from '../../../../components/StatusBadge';
import { TokenStorage } from '../../../../lib/auth';

const API_URL = __DEV__ ? 'http://192.168.1.65:5001' : 'https://api.zentaralabs.com';

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
      const token = await TokenStorage.getAccessToken();
      const filename = `payslip-${item.bsYear}-${item.bsMonth}.pdf`;
      const fileUri = (FileSystem.documentDirectory ?? '') + filename;
      const result = await FileSystem.downloadAsync(
        `${API_URL}/api/payroll/my-payslip/${item.id}/pdf`,
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
          dialogTitle: `Payslip ${BS_MONTHS_EN[item.bsMonth - 1]} ${item.bsYear}`,
        });
      }
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
        <View style={s.netIconWrap}>
          <Ionicons name="wallet-outline" size={18} color={Colors.slate900} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.netLabel}>Net Salary</Text>
          <Text style={s.netAmount}>{formatNPR(item.netSalary)}</Text>
        </View>
      </View>

      <View style={s.statsRow}>
        <View style={s.statItem}>
          <Text style={s.statVal}>{item.daysPresent}</Text>
          <Text style={s.statLbl}>Present</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statItem}>
          <Text style={s.statVal}>{item.daysAbsent}</Text>
          <Text style={s.statLbl}>Absent</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statItem}>
          <Text style={s.statVal}>{formatNPR(item.grossSalary)}</Text>
          <Text style={s.statLbl}>Gross</Text>
        </View>
        <View style={s.statDivider} />
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
          <ActivityIndicator color={Colors.slate900} size="small" />
        ) : (
          <>
            <Ionicons name="document-text-outline" size={16} color={Colors.slate900} />
            <Text style={s.pdfBtnText}>View Payslip PDF</Text>
          </>
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
        const all = Array.isArray(data) ? data : [];
        setRecords(all.filter(r => r.status === 'PAID'));
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
        <View style={s.headerLeft}>
          <View style={s.headerLogoBox}>
            <Ionicons name="wallet-outline" size={16} color={Colors.white} />
          </View>
          <Text style={s.headerTitle}>Salary History</Text>
        </View>
      </View>
      {loading ? (
        <View style={s.center}><ActivityIndicator color={Colors.slate900} size="large" /></View>
      ) : error ? (
        <View style={s.center}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.slate300} />
          <Text style={s.errorText}>{error}</Text>
        </View>
      ) : records.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="receipt-outline" size={48} color={Colors.slate300} />
          <Text style={s.emptyText}>No salary records found</Text>
          <Text style={s.emptySubtext}>Payslips will appear here once processed</Text>
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
  safe: { flex: 1, backgroundColor: Colors.slate50 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  header: {
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.slate100,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerLogoBox: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: Colors.slate900, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 15, fontWeight: '700', color: Colors.slate900 },
  errorText: { fontSize: 14, color: Colors.error, marginTop: 8 },
  emptyText: { fontSize: 15, fontWeight: '600', color: Colors.slate500, marginTop: 8 },
  emptySubtext: { fontSize: 13, color: Colors.slate400 },
  card: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: Colors.slate200,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  monthLabel: { fontSize: 17, fontWeight: '700', color: Colors.slate900 },
  orgName: { fontSize: 12, color: Colors.slate400, marginTop: 2 },
  netRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.slate100, borderRadius: 10, padding: 12, marginBottom: 12,
  },
  netIconWrap: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center',
  },
  netLabel: { fontSize: 12, fontWeight: '500', color: Colors.slate500 },
  netAmount: { fontSize: 20, fontWeight: '700', color: Colors.slate900 },
  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.slate50, borderRadius: 10, padding: 12, marginBottom: 12,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 28, backgroundColor: Colors.slate200 },
  statVal: { fontSize: 13, fontWeight: '700', color: Colors.slate900 },
  statLbl: { fontSize: 11, color: Colors.slate400, marginTop: 2 },
  pdfBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: Colors.slate200,
  },
  pdfBtnText: { fontSize: 14, fontWeight: '600', color: Colors.slate900 },
});