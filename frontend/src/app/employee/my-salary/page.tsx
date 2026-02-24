'use client';
import { useState,useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import {
  Calendar,
  Clock,
  FileText,
  TrendingUp,
  DollarSign,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  Download,
  X,
  Lock,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const BS_MONTHS_EN = ['Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'];
const BS_MONTHS_NP = ['à¤¬à¥ˆà¤¶à¤¾à¤–', 'à¤œà¥‡à¤ ', 'à¤…à¤¸à¤¾à¤°', 'à¤¸à¤¾à¤‰à¤¨', 'à¤­à¤¦à¥Œ', 'à¤…à¤¸à¥‹à¤œ', 'à¤•à¤¾à¤°à¥à¤¤à¤¿à¤•', 'à¤®à¤‚à¤¸à¤¿à¤°', 'à¤ªà¥à¤·', 'à¤®à¤¾à¤˜', 'à¤«à¤¾à¤—à¥à¤¨', 'à¤šà¥ˆà¤¤à¥à¤°'];

const statusColors: Record<string, string> = {
  DRAFT:     'bg-slate-100 text-slate-600',
  PROCESSED: 'bg-blue-100 text-blue-700',
  APPROVED:  'bg-emerald-100 text-emerald-700',
  PAID:      'bg-violet-100 text-violet-700',
};

const statusIcons: Record<string, string> = {
  DRAFT:     'ðŸ“',
  PROCESSED: 'ðŸ”„',
  APPROVED:  'âœ…',
  PAID:      'ðŸ’°',
};

export default function MySalaryHistoryPage() {
  const { user, isLoading, language, features } = useAuth();
  const canDownloadPayslips = features.downloadPayslips;
  const router = useRouter();
  const isNp = language === 'NEPALI';

  const [salaryData, setSalaryData]   = useState<any>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError]             = useState('');

  const [fromYear,  setFromYear]  = useState(2081);
  const [fromMonth, setFromMonth] = useState(1);
  const [toYear,    setToYear]    = useState(2082);
  const [toMonth,   setToMonth]   = useState(10);

  const [summaryDownloading, setSummaryDownloading] = useState(false);

  // Monthly vs Range mode
  const [filterMode, setFilterMode]   = useState<'monthly' | 'range'>('range');
  const [singleYear, setSingleYear]   = useState(2082);
  const [singleMonth, setSingleMonth] = useState(1);

  // Tooltips â€” state-based so they show instantly
  const [showSummaryTooltip, setShowSummaryTooltip] = useState(false);
  const [showRowTooltip, setShowRowTooltip]         = useState<string | null>(null);

  const [earliestBsYear, setEarliestBsYear] = useState<number | null>(null);
  const now = new Date();
  const currentBsYear = now.getMonth() >= 3 ? now.getFullYear() + 57 : now.getFullYear() + 56;
  
  useEffect(() => {
    api.get('/api/payroll/my-earliest-year').then((res) => {
      if (!res.error && res.data?.earliestBsYear) {
        setEarliestBsYear(res.data.earliestBsYear);
      } else {
        setEarliestBsYear(currentBsYear);
      }
    });
  }, []);
  const fmtDisplay = (n: number) =>
    n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const fmtPDF = (n: number) =>
    n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const loadSalaryData = async () => {
    setLoadingData(true);
    setError('');
    const fY = filterMode === 'monthly' ? singleYear  : fromYear;
    const fM = filterMode === 'monthly' ? singleMonth : fromMonth;
    const tY = filterMode === 'monthly' ? singleYear  : toYear;
    const tM = filterMode === 'monthly' ? singleMonth : toMonth;
    try {
      const res = await api.get(
        '/api/payroll/my-multi-month?fromBsYear=' + fY +
        '&fromBsMonth=' + fM +
        '&toBsYear='    + tY +
        '&toBsMonth='   + tM
      );
      if (res.error) throw new Error(res.error.message);
      setSalaryData(res.data);
    } catch (e: any) {
      setError(e.message || 'Failed to load salary data');
    }
    setLoadingData(false);
  };

  // â”€â”€ Client-side PDF generation using jsPDF + jspdf-autotable â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const downloadSummaryPDF = () => {
    if (!salaryData || !employeeData) return;

    setSummaryDownloading(true);

    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();

      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageW, 64, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(user?.organizationName || 'Organization', 36, 28);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('SALARY SUMMARY REPORT', pageW - 36, 20, { align: 'right' });

      const fromLabel  = BS_MONTHS_EN[fromMonth - 1] + ' ' + fromYear;
      const toLabel    = BS_MONTHS_EN[toMonth   - 1] + ' ' + toYear;
      const rangeLabel = fromLabel + ' â€“ ' + toLabel;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text(rangeLabel, pageW - 36, 34, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(16, 185, 129);
      doc.text('Generated: ' + new Date().toLocaleDateString('en-IN'), pageW - 36, 48, { align: 'right' });

      let y = 80;
      doc.setFillColor(248, 250, 252);
      doc.rect(36, y, pageW - 72, 40, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(36, y, pageW - 72, 40, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text((user?.firstName || '') + ' ' + (user?.lastName || ''), 50, y + 16);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Employee ID: ' + (user?.employeeId || 'N/A'), 50, y + 30);
      doc.text(
        employeeData.totals.monthsProcessed + ' months processed  |  Range: ' + rangeLabel,
        pageW - 50, y + 16, { align: 'right' }
      );

      y += 56;

      const cardW   = (pageW - 72 - 12) / 4;
      const cardH   = 48;
      const cardGap = 4;

      const cards = [
        { label: 'TOTAL NET SALARY',   value: 'Rs. ' + fmtPDF(employeeData.totals.netSalary),       color: [16, 185, 129]  as [number,number,number] },
        { label: 'TOTAL GROSS SALARY', value: 'Rs. ' + fmtPDF(employeeData.totals.grossSalary),     color: [15, 23, 42]    as [number,number,number] },
        { label: 'TOTAL DEDUCTIONS',   value: 'Rs. ' + fmtPDF(employeeData.totals.totalDeductions), color: [225, 29, 72]   as [number,number,number] },
        { label: 'AVG NET / MONTH',
          value: 'Rs. ' + fmtPDF(
            employeeData.totals.monthsProcessed > 0
              ? Math.round(employeeData.totals.netSalary / employeeData.totals.monthsProcessed)
              : 0
          ),
          color: [15, 23, 42] as [number,number,number]
        },
      ];

      cards.forEach((card, i) => {
        const cx = 36 + i * (cardW + cardGap);
        doc.setFillColor(248, 250, 252);
        doc.rect(cx, y, cardW, cardH, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.rect(cx, y, cardW, cardH, 'S');
        doc.setFillColor(...card.color);
        doc.rect(cx, y, cardW, 3, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(card.label, cx + 8, y + 14);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...card.color);
        doc.text(card.value, cx + 8, y + 30);
      });

      y += cardH + 16;

      const deductCards = [
        { label: 'Employee SSF Total', value: 'Rs. ' + fmtPDF(employeeData.totals.employeeSsf) },
        { label: 'Employee PF Total',  value: 'Rs. ' + fmtPDF(employeeData.totals.employeePf)  },
        { label: 'TDS Total',          value: 'Rs. ' + fmtPDF(employeeData.totals.tds)          },
        { label: 'Months Processed',   value: employeeData.totals.monthsProcessed + ' months'   },
      ];

      const dCardW = (pageW - 72 - 12) / 4;
      const dCardH = 36;
      deductCards.forEach((card, i) => {
        const cx = 36 + i * (dCardW + cardGap);
        doc.setFillColor(255, 255, 255);
        doc.rect(cx, y, dCardW, dCardH, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.rect(cx, y, dCardW, dCardH, 'S');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(card.label.toUpperCase(), cx + 8, y + 12);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        doc.text(card.value, cx + 8, y + 26);
      });

      y += dCardH + 16;

      const tableRows: any[] = [];
      salaryData.months.forEach((m: any) => {
        const monthKey  = m.bsYear + '-' + m.bsMonth;
        const md        = employeeData.months[monthKey];
        const monthName = BS_MONTHS_EN[m.bsMonth - 1] + ' ' + m.bsYear;
        if (!md) {
          tableRows.push([monthName, 'â€”', 'â€”', 'â€”', 'â€”', 'â€”', 'â€”', 'â€”', 'â€”', 'â€”']);
          return;
        }
        const allowances =
          (md.dearnessAllowance  || 0) +
          (md.transportAllowance || 0) +
          (md.medicalAllowance   || 0) +
          (md.otherAllowances    || 0);
        tableRows.push([
          monthName,
          md.daysPresent + '/' + md.workingDaysInMonth,
          fmtPDF(md.basicSalary),
          fmtPDF(allowances),
          fmtPDF(md.grossSalary),
          fmtPDF(md.employeeSsf   || 0),
          fmtPDF(md.employeePf    || 0),
          fmtPDF(md.tds           || 0),
          fmtPDF(md.totalDeductions),
          fmtPDF(md.netSalary),
        ]);
      });

      tableRows.push([
        'TOTAL',
        employeeData.totals.monthsProcessed + ' mo',
        fmtPDF(employeeData.totals.basicSalary),
        'â€”',
        fmtPDF(employeeData.totals.grossSalary),
        fmtPDF(employeeData.totals.employeeSsf),
        fmtPDF(employeeData.totals.employeePf),
        fmtPDF(employeeData.totals.tds),
        fmtPDF(employeeData.totals.totalDeductions),
        fmtPDF(employeeData.totals.netSalary),
      ]);

      autoTable(doc, {
        startY: y,
        margin: { left: 36, right: 36 },
        head: [['Month', 'Days', 'Basic', 'Allowances', 'Gross', 'SSF', 'PF', 'TDS', 'Total Ded.', 'Net Salary']],
        body: tableRows,
        styles: { fontSize: 7.5, cellPadding: 4, font: 'helvetica', textColor: [30, 41, 59] },
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 68 },
          1: { halign: 'center', cellWidth: 32 },
          2: { halign: 'right' },
          3: { halign: 'right' },
          4: { halign: 'right', fontStyle: 'bold' },
          5: { halign: 'right', textColor: [225, 29, 72] },
          6: { halign: 'right', textColor: [225, 29, 72] },
          7: { halign: 'right', textColor: [225, 29, 72] },
          8: { halign: 'right', textColor: [225, 29, 72] },
          9: { halign: 'right', fontStyle: 'bold', textColor: [16, 185, 129] },
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        didParseCell: (data) => {
          if (data.row.index === tableRows.length - 1 && data.section === 'body') {
            data.cell.styles.fillColor = [15, 23, 42];
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.fontStyle = 'bold';
            if (data.column.index === 9) data.cell.styles.textColor = [16, 185, 129];
          }
        },
      });

      const finalY = doc.internal.pageSize.getHeight();
      doc.setFillColor(15, 23, 42);
      doc.rect(0, finalY - 28, pageW, 28, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        (user?.organizationName || 'Organization') + '  â€¢  ' + rangeLabel + '  â€¢  Generated ' + new Date().toLocaleString('en-IN'),
        pageW / 2, finalY - 10, { align: 'center' }
      );

      const filename = 'salary-summary-' + fromYear + '-' + fromMonth + '-to-' + toYear + '-' + toMonth + '.pdf';
      doc.save(filename);

    } catch (e: any) {
      setError('Could not generate summary PDF: ' + e.message);
    }

    setSummaryDownloading(false);
  };

  // â”€â”€ Per-row payslip preview â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [preview,        setPreview]        = useState<{ blobUrl: string; filename: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const openPreview = async (recordId: string, bsYear: number, bsMonth: number) => {
    setPreviewLoading(true);
    const url =
      (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001') +
      '/api/payroll/my-payslip/' + recordId + '/pdf';
    try {
      const res = await fetch(url, { credentials: 'include', headers: { 'X-Requested-With': 'XMLHttpRequest' } });
      if (!res.ok) throw new Error('Failed to load PDF');
      const blob    = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      setPreview({ blobUrl, filename: 'payslip-' + bsYear + '-' + bsMonth + '.pdf' });
    } catch {
      setError('Could not load PDF preview');
    }
    setPreviewLoading(false);
  };

  const closePreview = () => {
    if (preview) URL.revokeObjectURL(preview.blobUrl);
    setPreview(null);
  };

  const downloadFromPreview = () => {
    if (!preview) return;
    const a = document.createElement('a');
    a.href     = preview.blobUrl;
    a.download = preview.filename;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (!user) return null;

  const employeeData = salaryData?.employees?.[0];

  const tooltipMsg = isNp
    ? 'PDF à¤¡à¤¾à¤‰à¤¨à¤²à¥‹à¤¡ Operations plan à¤®à¤¾ à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤›'
    : 'PDF downloads are available on the Operations plan';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">

      {/* Payslip Preview Modal */}
      {(preview || previewLoading) && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm">
          <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 shrink-0">
            <div className="flex items-center gap-3">
              <div className="bg-slate-900 p-1.5 rounded-lg">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-slate-900">
                {preview?.filename || 'Loading...'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {preview && (
                <button
                  onClick={downloadFromPreview}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  {isNp ? 'à¤¡à¤¾à¤‰à¤¨à¤²à¥‹à¤¡' : 'Download'}
                </button>
              )}
              <button
                onClick={closePreview}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            {previewLoading ? (
              <div className="h-full flex flex-col items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
                <p className="text-white text-sm">{isNp ? 'à¤²à¥‹à¤¡ à¤¹à¥à¤à¤¦à¥ˆà¤›...' : 'Loading PDF...'}</p>
              </div>
            ) : preview ? (
              <iframe src={preview.blobUrl} className="w-full h-full border-0" title="Payslip Preview" />
            ) : null}
          </div>
        </div>
      )}

      {/* Page Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/employee')}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-700"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="bg-emerald-500 p-2 rounded-xl">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-gray-900">
                  {isNp ? 'à¤®à¥‡à¤°à¥‹ à¤¤à¤²à¤¬ à¤‡à¤¤à¤¿à¤¹à¤¾à¤¸' : 'My Salary & Payslips'}
                </h1>
                <p className="text-xs text-gray-500">{user.firstName} {user.lastName}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          {/* Mode toggle */}
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setFilterMode('monthly')}
              className={'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ' +
                (filterMode === 'monthly'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50')}
            >
              {isNp ? 'à¤®à¤¾à¤¸à¤¿à¤•' : 'Monthly'}
            </button>
            <button
              onClick={() => setFilterMode('range')}
              className={'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ' +
                (filterMode === 'range'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50')}
            >
              {isNp ? 'à¤¦à¤¾à¤¯à¤°à¤¾' : 'Range'}
            </button>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            {filterMode === 'monthly' ? (
              /* Single month picker */
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1 font-medium">
                    {isNp ? 'à¤®à¤¹à¤¿à¤¨à¤¾' : 'Month'}
                  </label>
                  <div className="flex gap-2">
                    <div className="relative">
                    <select value={singleYear} onChange={(e) => setSingleYear(Number(e.target.value))}
                      className="px-3 py-1.5 pr-8 text-sm font-medium border border-slate-200 rounded-lg bg-white text-slate-700 appearance-none cursor-pointer hover:bg-slate-50 transition-colors outline-none">
                      {Array.from({ length: (currentBsYear + 1) - (earliestBsYear ?? currentBsYear) + 1 }, (_, i) => (earliestBsYear ?? currentBsYear) + i).map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </span>
                  </div>
                    <div className="relative">
                    <select value={singleMonth} onChange={(e) => setSingleMonth(Number(e.target.value))}
                      className="px-3 py-1.5 pr-8 text-sm font-medium border border-slate-200 rounded-lg bg-white text-slate-700 appearance-none cursor-pointer hover:bg-slate-50 transition-colors outline-none">
                      {BS_MONTHS_EN.map((m, i) => <option key={i} value={i + 1}>{isNp ? BS_MONTHS_NP[i] : m}</option>)}
                    </select>
                    <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </span>
                  </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Original From/To layout â€” unchanged */
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1 font-medium">
                    {isNp ? 'à¤¦à¥‡à¤–à¤¿' : 'From'}
                  </label>
                  <div className="flex gap-2">
                    <div className="relative">
                    <select value={fromYear} onChange={(e) => setFromYear(Number(e.target.value))}
                      className="px-3 py-1.5 pr-8 text-sm font-medium border border-slate-200 rounded-lg bg-white text-slate-700 appearance-none cursor-pointer hover:bg-slate-50 transition-colors outline-none">
                    {Array.from({ length: (currentBsYear + 1) - (earliestBsYear ?? currentBsYear) + 1 }, (_, i) => (earliestBsYear ?? currentBsYear) + i).map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </span>
                  </div>
                    <div className="relative">
                    <select value={fromMonth} onChange={(e) => setFromMonth(Number(e.target.value))}
                      className="px-3 py-1.5 pr-8 text-sm font-medium border border-slate-200 rounded-lg bg-white text-slate-700 appearance-none cursor-pointer hover:bg-slate-50 transition-colors outline-none">
                      {BS_MONTHS_EN.map((m, i) => <option key={i} value={i + 1}>{isNp ? BS_MONTHS_NP[i] : m}</option>)}
                    </select>
                    <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </span>
                  </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1 font-medium">
                    {isNp ? 'à¤¸à¤®à¥à¤®' : 'To'}
                  </label>
                  <div className="flex gap-2">
                    <div className="relative">
                    <select value={toYear} onChange={(e) => setToYear(Number(e.target.value))}
                      className="px-3 py-1.5 pr-8 text-sm font-medium border border-slate-200 rounded-lg bg-white text-slate-700 appearance-none cursor-pointer hover:bg-slate-50 transition-colors outline-none">
                      {[2081, 2082, 2083].map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </span>
                  </div>
                    <div className="relative">
                    <select value={toMonth} onChange={(e) => setToMonth(Number(e.target.value))}
                      className="px-3 py-1.5 pr-8 text-sm font-medium border border-slate-200 rounded-lg bg-white text-slate-700 appearance-none cursor-pointer hover:bg-slate-50 transition-colors outline-none">
                      {BS_MONTHS_EN.map((m, i) => <option key={i} value={i + 1}>{isNp ? BS_MONTHS_NP[i] : m}</option>)}
                    </select>
                    <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </span>
                  </div>
                  </div>
                </div>
              </div>
            )}
            <button onClick={loadSalaryData} disabled={loadingData}
              className="flex items-center gap-2 px-5 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50">
              <Calendar className="w-4 h-4" />
              {loadingData ? (isNp ? 'à¤²à¥‹à¤¡ à¤¹à¥à¤à¤¦à¥ˆà¤›...' : 'Loading...') : (isNp ? 'à¤¹à¥‡à¤°à¥à¤¨à¥à¤¹à¥‹à¤¸à¥' : 'View')}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {/* Loading */}
        {loadingData && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Clock className="w-6 h-6 text-slate-400 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500">{isNp ? 'à¤²à¥‹à¤¡ à¤¹à¥à¤à¤¦à¥ˆà¤›...' : 'Loading your salary data...'}</p>
          </div>
        )}

        {/* Results */}
        {!loadingData && employeeData && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-blue-700">{isNp ? 'à¤®à¤¹à¤¿à¤¨à¤¾' : 'Months'}</span>
                  <Calendar className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-blue-900">{employeeData.totals.monthsProcessed}</p>
                <p className="text-xs text-blue-600 mt-1">{isNp ? 'à¤°à¥‡à¤•à¤°à¥à¤¡' : 'Recorded'}</p>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-5 border border-emerald-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-emerald-700">{isNp ? 'à¤œà¤®à¥à¤®à¤¾ à¤¤à¤²à¤¬' : 'Total Net'}</span>
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-xl font-bold text-emerald-900">Rs. {fmtDisplay(employeeData.totals.netSalary)}</p>
                <p className="text-xs text-emerald-600 mt-1">{employeeData.totals.monthsProcessed} {isNp ? 'à¤®à¤¹à¤¿à¤¨à¤¾' : 'months'}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 border border-purple-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-purple-700">{isNp ? 'à¤”à¤¸à¤¤' : 'Avg/Month'}</span>
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                </div>
                <p className="text-xl font-bold text-purple-900">
                  Rs. {employeeData.totals.monthsProcessed > 0
                    ? fmtDisplay(Math.round(employeeData.totals.netSalary / employeeData.totals.monthsProcessed))
                    : 0}
                </p>
                <p className="text-xs text-purple-600 mt-1">{isNp ? 'à¤ªà¥à¤°à¤¤à¤¿ à¤®à¤¹à¤¿à¤¨à¤¾' : 'per month'}</p>
              </div>
              <div className="bg-gradient-to-br from-rose-50 to-rose-100 rounded-xl p-5 border border-rose-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-rose-700">{isNp ? 'à¤•à¤Ÿà¥Œà¤¤à¥€' : 'Deductions'}</span>
                  <FileText className="w-4 h-4 text-rose-600" />
                </div>
                <p className="text-xl font-bold text-rose-900">Rs. {fmtDisplay(employeeData.totals.totalDeductions)}</p>
                <p className="text-xs text-rose-600 mt-1">{isNp ? 'à¤œà¤®à¥à¤®à¤¾' : 'Total'}</p>
              </div>
            </div>

            {/* Monthly Breakdown Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">

              {/* Heading + Download Summary PDF button */}
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  {isNp ? 'à¤®à¤¾à¤¸à¤¿à¤• à¤µà¤¿à¤µà¤°à¤£' : 'Monthly Breakdown'}
                </h3>

                {/* FIX: Summary PDF â€” gated on downloadPayslips */}
                {canDownloadPayslips ? (
                  <button
                    onClick={downloadSummaryPDF}
                    disabled={summaryDownloading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {summaryDownloading
                      ? (isNp ? 'à¤¤à¤¯à¤¾à¤° à¤¹à¥à¤à¤¦à¥ˆà¤›...' : 'Generating...')
                      : (isNp ? 'à¤¸à¤¾à¤°à¤¾à¤‚à¤¶ PDF' : 'Download Summary PDF')}
                  </button>
                ) : (
                  <div
                    className="relative"
                    onMouseEnter={() => setShowSummaryTooltip(true)}
                    onMouseLeave={() => setShowSummaryTooltip(false)}
                  >
                    <button
                      disabled
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 bg-slate-100 border border-slate-200 rounded-lg cursor-not-allowed"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span className="px-1 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-bold">PRO</span>
                      {isNp ? 'à¤¸à¤¾à¤°à¤¾à¤‚à¤¶ PDF' : 'Download Summary PDF'}
                    </button>
                    {showSummaryTooltip && (
                      <div className="absolute top-full right-0 mt-2 w-64 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg shadow-lg z-20">
                        <div className="absolute bottom-full right-4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-slate-900" />
                        {tooltipMsg}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="text-left   py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">{isNp ? 'à¤®à¤¹à¤¿à¤¨à¤¾'    : 'Month'}</th>
                      <th className="text-right  py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">{isNp ? 'à¤†à¤§à¤¾à¤°à¤­à¥‚à¤¤'  : 'Basic'}</th>
                      <th className="text-right  py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">{isNp ? 'à¤­à¤¤à¥à¤¤à¤¾'    : 'Allowances'}</th>
                      <th className="text-right  py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">{isNp ? 'à¤•à¥à¤²'      : 'Gross'}</th>
                      <th className="text-right  py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">SSF</th>
                      <th className="text-right  py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">PF</th>
                      <th className="text-right  py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">TDS</th>
                      <th className="text-right  py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">{isNp ? 'à¤•à¤Ÿà¥Œà¤¤à¥€'    : 'Total Ded.'}</th>
                      <th className="text-right  py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">{isNp ? 'à¤–à¥à¤¦ à¤¤à¤²à¤¬'  : 'Net'}</th>
                      <th className="text-center py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">{isNp ? 'à¤¸à¥à¤¥à¤¿à¤¤à¤¿'   : 'Status'}</th>
                      <th className="text-center py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">PDF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {salaryData.months.map((m: any) => {
                      const monthKey  = m.bsYear + '-' + m.bsMonth;
                      const monthData = employeeData.months[monthKey];

                      if (!monthData) {
                        return (
                          <tr key={monthKey} className="hover:bg-slate-50/50">
                            <td className="py-3 px-4 text-slate-900 text-sm">
                              {isNp ? BS_MONTHS_NP[m.bsMonth - 1] : BS_MONTHS_EN[m.bsMonth - 1]} {m.bsYear}
                            </td>
                            <td colSpan={10} className="py-3 px-4 text-center text-slate-400 text-xs">
                              {isNp ? 'à¤•à¥à¤¨à¥ˆ à¤°à¥‡à¤•à¤°à¥à¤¡ à¤›à¥ˆà¤¨' : 'No record'}
                            </td>
                          </tr>
                        );
                      }

                      const allowances =
                        (monthData.dearnessAllowance  || 0) +
                        (monthData.transportAllowance || 0) +
                        (monthData.medicalAllowance   || 0) +
                        (monthData.otherAllowances    || 0);

                      return (
                        <tr key={monthKey} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4">
                            <div className="text-sm font-medium text-slate-900">
                              {isNp ? BS_MONTHS_NP[m.bsMonth - 1] : BS_MONTHS_EN[m.bsMonth - 1]} {m.bsYear}
                            </div>
                            <div className="text-xs text-slate-400">
                              {monthData.daysPresent}/{monthData.workingDaysInMonth} {isNp ? 'à¤¦à¤¿à¤¨' : 'days'}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right text-sm text-slate-600">{fmtDisplay(monthData.basicSalary)}</td>
                          <td className="py-3 px-4 text-right text-sm text-slate-600">{fmtDisplay(allowances)}</td>
                          <td className="py-3 px-4 text-right text-sm font-medium text-slate-900">{fmtDisplay(monthData.grossSalary)}</td>
                          <td className="py-3 px-4 text-right text-sm text-rose-600">{fmtDisplay(monthData.employeeSsf || 0)}</td>
                          <td className="py-3 px-4 text-right text-sm text-rose-600">{fmtDisplay(monthData.employeePf  || 0)}</td>
                          <td className="py-3 px-4 text-right text-sm text-rose-600">{fmtDisplay(monthData.tds         || 0)}</td>
                          <td className="py-3 px-4 text-right text-sm text-rose-600">{fmtDisplay(monthData.totalDeductions)}</td>
                          <td className="py-3 px-4 text-right text-sm font-bold text-emerald-700">{fmtDisplay(monthData.netSalary)}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={'inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium ' + (statusColors[monthData.status] || '')}>
                              <span>{statusIcons[monthData.status]}</span>
                              <span>{monthData.status}</span>
                            </span>
                          </td>

                          {/* FIX: Per-row PDF â€” gated on downloadPayslips */}
                          <td className="py-3 px-4 text-center">
                            {canDownloadPayslips ? (
                              <button
                                onClick={() => openPreview(monthData.id, m.bsYear, m.bsMonth)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 text-white rounded-md text-[10px] font-medium hover:bg-slate-700 transition-colors"
                              >
                                <ExternalLink className="w-3 h-3" />
                                PDF
                              </button>
                            ) : (
                              <div
                                className="relative inline-block"
                                onMouseEnter={() => setShowRowTooltip(monthKey)}
                                onMouseLeave={() => setShowRowTooltip(null)}
                              >
                                <button
                                  disabled
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 text-slate-400 border border-slate-200 rounded-md text-[10px] font-medium cursor-not-allowed"
                                >
                                  <Lock className="w-3 h-3" />
                                  PDF
                                </button>
                                {showRowTooltip === monthKey && (
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg shadow-lg z-20 text-center">
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-900" />
                                    {tooltipMsg}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-semibold border-t-2 border-slate-300">
                      <td className="py-3 px-4 text-sm text-slate-900">{isNp ? 'à¤œà¤®à¥à¤®à¤¾' : 'TOTAL'}</td>
                      <td className="py-3 px-4 text-right text-sm text-slate-900">{fmtDisplay(employeeData.totals.basicSalary)}</td>
                      <td className="py-3 px-4 text-right text-sm text-slate-900">â€”</td>
                      <td className="py-3 px-4 text-right text-sm text-slate-900">{fmtDisplay(employeeData.totals.grossSalary)}</td>
                      <td className="py-3 px-4 text-right text-sm text-rose-700">{fmtDisplay(employeeData.totals.employeeSsf)}</td>
                      <td className="py-3 px-4 text-right text-sm text-rose-700">{fmtDisplay(employeeData.totals.employeePf)}</td>
                      <td className="py-3 px-4 text-right text-sm text-rose-700">{fmtDisplay(employeeData.totals.tds)}</td>
                      <td className="py-3 px-4 text-right text-sm text-rose-700">{fmtDisplay(employeeData.totals.totalDeductions)}</td>
                      <td className="py-3 px-4 text-right text-sm font-bold text-emerald-700">{fmtDisplay(employeeData.totals.netSalary)}</td>
                      <td className="py-3 px-4 text-center text-sm text-slate-600">
                        {employeeData.totals.monthsProcessed} {isNp ? 'à¤®à¤¹à¤¿à¤¨à¤¾' : 'months'}
                      </td>
                      <td className="py-3 px-4"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Empty state */}
        {!loadingData && !employeeData && !error && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">
              {isNp ? 'à¤®à¤¿à¤¤à¤¿ à¤›à¤¾à¤¨à¥à¤¨à¥à¤¹à¥‹à¤¸à¥' : 'Select a date range'}
            </h3>
            <p className="text-xs text-slate-500">
              {isNp
                ? 'à¤®à¤¾à¤¥à¤¿ à¤¦à¥‡à¤–à¤¿/à¤¸à¤®à¥à¤® à¤®à¤¿à¤¤à¤¿ à¤›à¤¾à¤¨à¥‡à¤° "à¤¹à¥‡à¤°à¥à¤¨à¥à¤¹à¥‹à¤¸à¥" à¤¥à¤¿à¤šà¥à¤¨à¥à¤¹à¥‹à¤¸à¥'
                : 'Choose from/to dates above and click View'}
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
