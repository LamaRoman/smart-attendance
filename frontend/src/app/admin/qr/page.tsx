'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import AdminLayout from '@/components/AdminLayout';
import {
  QrCode,
  Printer,
  RefreshCw,
  Download,
  CheckCircle,
  AlertCircle,
  Eye,
  Shield,
  Trash2,
  Copy,
  MapPin,
} from 'lucide-react';

interface QRData {
  qrCode: {
    id: string;
    token: string;
    scanCount: number;
    expiresAt: string | null;
    createdAt: string;
  };
  scanUrl: string;
  qrImage: string;
  qrImageLarge?: string;
  isStatic?: boolean;
  isExisting?: boolean;
}

export default function AdminQRPage() {
  const { user, isLoading, language, features } = useAuth();
  const router = useRouter();
  const isNp = language === 'NEPALI';

  const [qrData, setQrData] = useState<QRData | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'ORG_ADMIN')) router.push('/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user?.role === 'ORG_ADMIN') loadQR();
  }, [user]);

  const loadQR = async () => {
    const res = await api.get('/api/qr/active');
    if (res.data) setQrData(res.data as QRData);
  };

  const generateStaticQR = async () => {
    setGenerating(true);
    setError('');
    const res = await api.post('/api/qr/generate-static');
    if (res.error) {
      setError(res.error.message);
    } else {
      setQrData(res.data as QRData);
      setSuccess(isNp ? 'स्थिर QR कोड सिर्जना गरियो' : 'Static QR code generated');
      setTimeout(() => setSuccess(''), 3000);
    }
    setGenerating(false);
  };

  const regenerateStaticQR = async () => {
    if (!confirm(isNp ? 'पुरानो QR कोड रद्द हुनेछ। नयाँ बनाउने?' : 'Old QR will be revoked. Generate new one?')) return;
    setGenerating(true);
    setError('');
    const res = await api.post('/api/qr/regenerate-static');
    if (res.error) {
      setError(res.error.message);
    } else {
      setQrData(res.data as QRData);
      setSuccess(isNp ? 'नयाँ QR कोड सिर्जना गरियो' : 'New QR code generated');
      setTimeout(() => setSuccess(''), 3000);
    }
    setGenerating(false);
  };

  const generateRotatingQR = async () => {
    setGenerating(true);
    setError('');
    const res = await api.post('/api/qr/generate');
    if (res.error) {
      setError(res.error.message);
    } else {
      setQrData(res.data as QRData);
      setSuccess(isNp ? 'QR कोड सिर्जना गरियो (२४ घण्टा)' : 'QR code generated (24 hours)');
      setTimeout(() => setSuccess(''), 3000);
    }
    setGenerating(false);
  };

  const revokeQR = async () => {
    if (!confirm(isNp ? 'सबै सक्रिय QR कोड रद्द गर्ने?' : 'Revoke all active QR codes?')) return;
    const res = await api.post('/api/qr/revoke');
    if (res.error) {
      setError(res.error.message);
    } else {
      setQrData(null);
      setSuccess(isNp ? 'QR कोड रद्द गरियो' : 'QR codes revoked');
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const printQR = () => {
    if (!qrData?.qrImage) return;
    const w = window.open('', '_blank');
    if (!w) return;
    const orgName = user?.organization?.name || 'Smart Attendance';
    w.document.write('<html><head><title>QR Code</title><style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui,sans-serif;margin:0;background:white}h1{margin-bottom:6px;font-size:26px;font-weight:500;color:#0f172a}h2{color:#475569;margin-bottom:28px;font-size:17px;font-weight:normal}img{max-width:420px;border-radius:14px}p{color:#64748b;margin-top:28px;font-size:14px}</style></head><body>');
    w.document.write('<h1>' + orgName + '</h1>');
    w.document.write('<h2>' + (isNp ? 'उपस्थिति जनाउन स्क्यान गर्नुहोस्' : 'Scan to record attendance') + '</h2>');
    w.document.write('<img src="' + (qrData.qrImageLarge || qrData.qrImage) + '" alt="QR Code"/>');
    w.document.write('<p>' + (isNp ? 'स्मार्ट उपस्थिति प्रणाली' : 'Smart Attendance System') + '</p>');
    w.document.write('</body></html>');
    w.document.close();
    w.print();
  };

  const downloadQR = () => {
    if (!qrData?.qrImage) return;
    const link = document.createElement('a');
    link.download = 'attendance-qr.png';
    link.href = qrData.qrImageLarge || qrData.qrImage;
    link.click();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-12 h-12 rounded-full border-2 border-slate-100 border-t-slate-800 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const isStatic = qrData?.qrCode?.expiresAt === null;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page header - balanced */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
              {isNp ? 'QR कोड व्यवस्थापन' : 'QR code management'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {isNp ? 'कर्मचारीहरूले स्क्यान गरी उपस्थिति जनाउन सक्छन्' : 'Employees scan to record attendance'}
            </p>
          </div>
          {qrData && (
            <div className="flex items-center gap-2">
              <button 
                onClick={printQR} 
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors border border-slate-200"
              >
                <Printer className="w-3.5 h-3.5" />
                {isNp ? 'प्रिन्ट' : 'Print'}
              </button>
              <button 
                onClick={downloadQR} 
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors border border-slate-200"
              >
                <Download className="w-3.5 h-3.5" />
                {isNp ? 'डाउनलोड' : 'Download'}
              </button>
            </div>
          )}
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-center gap-2.5 p-3.5 bg-rose-50 rounded-lg border border-rose-200">
            <AlertCircle className="w-4 h-4 text-rose-500" />
            <span className="text-xs font-medium text-rose-700">{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50 rounded-lg border border-emerald-200">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-medium text-emerald-700">{success}</span>
          </div>
        )}

        {/* QR Display */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {qrData?.qrImage ? (
            <div className="pt-8 pb-6 px-6 flex flex-col items-center">
              {/* QR Code */}
              <div className="relative mb-5">
                <div className="absolute inset-0 bg-slate-50 rounded-xl -m-1.5" />
                <div className="relative bg-white p-5 rounded-xl border border-slate-200">
                  <img src={qrData.qrImage} alt="QR Code" className="w-64 h-64" />
                </div>
              </div>

              {/* Badge */}
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium mb-5 ${
                isStatic ? 'bg-slate-100 text-slate-900' : 'bg-blue-50 text-blue-700'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isStatic ? 'bg-slate-1000' : 'bg-blue-500'}`} />
                {isStatic 
                  ? (isNp ? 'स्थिर QR' : 'Static QR') 
                  : (isNp ? 'अस्थायी QR (२४ घण्टा)' : 'Temporary QR (24h)')}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-xl">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">
                    {isNp ? 'स्क्यान' : 'Scans'}
                  </p>
                  <p className="text-xl font-semibold text-slate-900 tracking-tight">
                    {qrData.qrCode.scanCount}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">
                    {isNp ? 'सिर्जना' : 'Created'}
                  </p>
                  <p className="text-sm font-medium text-slate-900">
                    {new Date(qrData.qrCode.createdAt).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">
                    {isNp ? 'समाप्ति' : 'Expires'}
                  </p>
                  <p className="text-sm font-medium text-slate-900">
                    {isStatic 
                      ? (isNp ? 'कहिल्यै' : 'Never') 
                      : new Date(qrData.qrCode.expiresAt!).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">
                    {isNp ? 'प्रकार' : 'Type'}
                  </p>
                  <p className="text-sm font-medium text-slate-900">
                    {isStatic ? (isNp ? 'स्थिर' : 'Static') : (isNp ? 'अस्थायी' : 'Temp')}
                  </p>
                </div>
              </div>

              {/* Scan URL */}
              <div className="mt-5 w-full max-w-xl">
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                  <code className="text-xs text-slate-600 truncate flex-1 font-mono">{qrData.scanUrl}</code>
                  <button
                    onClick={() => navigator.clipboard.writeText(qrData.scanUrl)}
                    className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 px-2 py-1 rounded-md hover:bg-white transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    {isNp ? 'कपि' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Empty state */
            <div className="py-16 px-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                <QrCode className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1.5">
                {isNp ? 'कुनै सक्रिय QR कोड छैन' : 'No active QR code'}
              </h3>
              <p className="text-sm text-slate-500 mb-6 max-w-sm">
                {isNp ? 'उपस्थिति ट्र्याकिङ सुरु गर्न तलबाट QR कोड बनाउनुहोस्' : 'Generate a QR code below to start tracking attendance'}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {features.staticQR && (
            <button
              onClick={qrData && isStatic ? regenerateStaticQR : generateStaticQR}
              disabled={generating}
              className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 transition-all text-left disabled:opacity-50 group"
            >
              <div className="p-2.5 rounded-lg bg-slate-100 group-hover:bg-slate-100 transition-colors">
                <QrCode className="w-5 h-5 text-slate-900" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-900 group-hover:text-slate-800">
                  {qrData && isStatic
                    ? (isNp ? 'नयाँ स्थिर QR' : 'Regenerate static')
                    : (isNp ? 'स्थिर QR' : 'Static QR')}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {isNp ? 'प्रिन्ट गरी टाँस्नुहोस्' : 'Print & stick'}
                </div>
              </div>
            </button>
          )}

          {features.rotatingQR && (
            <button
              onClick={generateRotatingQR}
              disabled={generating}
              className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 transition-all text-left disabled:opacity-50 group"
            >
              <div className="p-2.5 rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors">
                <RefreshCw className={`w-5 h-5 text-blue-600 ${generating ? 'animate-spin' : ''}`} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-900 group-hover:text-slate-800">
                  {isNp ? 'अस्थायी QR' : 'Rotating QR'}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {isNp ? '२४ घण्टा मान्य' : 'Valid 24h'}
                </div>
              </div>
            </button>
          )}

          {qrData && (
            <button
              onClick={revokeQR}
              className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-rose-200 hover:bg-rose-50/30 transition-all text-left group"
            >
              <div className="p-2.5 rounded-lg bg-rose-50 group-hover:bg-rose-100 transition-colors">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-rose-700 group-hover:text-rose-800">
                  {isNp ? 'QR रद्द' : 'Revoke QR'}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {isNp ? 'सक्रिय QR रद्द' : 'Revoke active'}
                </div>
              </div>
            </button>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">
            {isNp ? 'कसरी प्रयोग गर्ने?' : 'How it works'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-slate-700">1</span>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-900 mb-0.5">
                  {isNp ? 'प्रिन्ट गर्नुहोस्' : 'Print'}
                </p>
                <p className="text-xs text-slate-500">
                  {isNp ? 'QR कोड प्रिन्ट गरी टाँस्नुहोस्' : 'Print and display QR code'}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-slate-700">2</span>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-900 mb-0.5">
                  {isNp ? 'स्क्यान' : 'Scan'}
                </p>
                <p className="text-xs text-slate-500">
                  {isNp ? 'कर्मचारीले फोनले स्क्यान गर्छन्' : 'Employees scan with phone'}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-slate-700">3</span>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-900 mb-0.5">
                  {isNp ? 'उपस्थिति' : 'Attendance'}
                </p>
                <p className="text-xs text-slate-500">
                  {isNp ? 'आईडी हालेर चेक इन/आउट' : 'Enter ID to clock in/out'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

        {/* Mobile Check-in Link */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <MapPin className="w-4.5 h-4.5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">{isNp ? "मोबाइल चेक-इन" : "Mobile Check-in"}</h3>
              <p className="text-xs text-slate-500">{isNp ? "QR बिना GPS बाट चेक इन" : "GPS-based check-in without QR"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={typeof window !== "undefined" ? window.location.origin + "/checkin?org=" + (user?.organizationId || "") : ""}
              className="flex-1 px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-600 truncate"
            />
            <button
              onClick={() => {
                const url = window.location.origin + "/checkin?org=" + (user?.organizationId || "");
                navigator.clipboard.writeText(url);
                setSuccess(isNp ? "लिङ्क कपी भयो" : "Link copied");
                setTimeout(() => setSuccess(""), 3000);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              {isNp ? "कपी" : "Copy"}
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">{isNp ? "यो लिङ्क कर्मचारीलाई शेयर गर्नुहोस्। जियोफेन्सिङ सक्रिय हुनुपर्छ।" : "Share this link with employees. Geofencing must be enabled."}</p>
        </div>
    </AdminLayout>
  );
}