'use client';

import { Clock, FileText, Download } from 'lucide-react';
import ProBlurOverlay from '@/components/ProBlurOverlay';
import { fmt, API_BASE } from '../utils';

interface Props {
  isNp: boolean;
  isStarter: boolean;
  annualYear: number;
  annualData: any;
  loadingAnnual: boolean;
  onSetYear: (y: number) => void;
  onLoad: () => void;
  onUpgrade: () => void;
}

const YEARS = [2081, 2082, 2083];

export default function AnnualTab({
  isNp, isStarter, annualYear, annualData, loadingAnnual,
  onSetYear, onLoad, onUpgrade,
}: Props) {
  const handleCsvDownload = async () => {
    const res = await fetch(
      `${API_BASE}/api/payroll/annual-report/csv?bsYear=${annualYear}`,
      { credentials: 'include' },
    );
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `annual-tax-report-${annualYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Filter card — always visible, no blur */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-sm font-semibold text-slate-900">
            {isNp ? 'वार्षिक कर विवरण' : 'Annual tax & SSF report'}
          </h2>
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={annualYear}
              onChange={(e) => onSetYear(Number(e.target.value))}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 bg-white"
            >
              {YEARS.map((y) => <option key={y} value={y}>{y} BS</option>)}
            </select>
            <button
              onClick={onLoad}
              disabled={loadingAnnual}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {loadingAnnual
                ? isNp ? 'लोड हुँदैछ...' : 'Loading...'
                : isNp ? 'रिपोर्ट हेर्नुहोस्' : 'Load report'}
            </button>

            {/* FIX (MEDIUM): CSV button always rendered — disabled with PRO badge on Starter */}
            {annualData && (
              <button
                disabled={isStarter}
                onClick={handleCsvDownload}
                title={isStarter ? (isNp ? 'Operations प्लान आवश्यक छ' : 'Requires Operations plan') : undefined}
                className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-md text-xs font-medium hover:bg-amber-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-amber-50"
              >
                {isStarter && (
                  <span className="px-1 py-0.5 text-[8px] font-semibold bg-amber-200 text-amber-800 rounded">
                    PRO
                  </span>
                )}
                <Download className="w-3 h-3" />
                {isNp ? 'CSV डाउनलोड' : 'Download CSV'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {loadingAnnual ? (
        <LoadingCard isNp={isNp} />
      ) : annualData?.employees?.length > 0 ? (
        <AnnualTable data={annualData} isNp={isNp} />
      ) : annualData ? (
        <EmptyCard isNp={isNp} />
      ) : null}

      {/* Blurred skeleton preview for Starter — shown when no real data loaded */}
      {isStarter && !annualData && (
        <div className="relative rounded-xl overflow-hidden border border-slate-200">
          {/* Skeleton table */}
          <div className="blur-sm pointer-events-none select-none">
            <table className="w-full text-sm bg-white">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Employee', 'Months', 'Annual Basic', 'Annual Gross', 'SSF', 'PF', 'TDS', 'Annual Net'].map((h) => (
                    <th key={h} className="py-3 px-4 text-xs font-medium text-slate-400 uppercase text-right first:text-left">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  ['Rajesh Sharma', '12', '3,60,000', '4,20,000', '46,200', '0', '2,100', '3,71,700'],
                  ['Sita Thapa',    '12', '4,20,000', '4,90,000', '53,900', '0', '5,400', '4,30,700'],
                  ['Bikash Karki',  '10', '2,80,000', '3,20,000', '35,200', '0', '800',   '2,84,000'],
                  ['Anita Rai',     '12', '5,00,000', '5,80,000', '63,800', '0', '9,200', '5,07,000'],
                ].map(([name, months, basic, gross, ssf, pf, tds, net]) => (
                  <tr key={name} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4">
                      <div className="text-sm font-medium text-slate-900">{name}</div>
                      <div className="text-xs text-slate-400">EMP-00{Math.floor(Math.random() * 9) + 1}</div>
                    </td>
                    <td className="py-3 px-4 text-center text-sm text-slate-600">{months}</td>
                    <td className="py-3 px-4 text-right text-sm text-slate-600">{basic}</td>
                    <td className="py-3 px-4 text-right text-sm text-slate-600">{gross}</td>
                    <td className="py-3 px-4 text-right text-sm text-rose-500">{ssf}</td>
                    <td className="py-3 px-4 text-right text-sm text-rose-500">{pf}</td>
                    <td className="py-3 px-4 text-right text-sm text-rose-500">{tds}</td>
                    <td className="py-3 px-4 text-right text-sm font-bold text-emerald-600">{net}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-semibold">
                  <td className="py-3 px-4 text-sm" colSpan={2}>TOTAL</td>
                  <td className="py-3 px-4 text-right text-sm">15,60,000</td>
                  <td className="py-3 px-4 text-right text-sm">18,10,000</td>
                  <td className="py-3 px-4 text-right text-sm text-rose-600">1,99,100</td>
                  <td className="py-3 px-4 text-right text-sm text-rose-600">0</td>
                  <td className="py-3 px-4 text-right text-sm text-rose-600">17,500</td>
                  <td className="py-3 px-4 text-right text-sm font-bold text-emerald-700">15,93,400</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Upgrade overlay on top of skeleton */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[2px]">
            <div className="bg-white rounded-xl border border-amber-200 shadow-lg p-6 text-center max-w-sm mx-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                {isNp ? 'वार्षिक कर रिपोर्ट' : 'Annual Tax & SSF Report'}
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                {isNp
                  ? 'सबै कर्मचारीको वार्षिक TDS, SSF र खुद तलब एकै ठाउँमा हेर्नुहोस्।'
                  : 'See every employee\'s annual TDS, SSF and net salary in one place. Export to CSV for IRD filing.'}
              </p>
              <button
                onClick={onUpgrade}
                className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                {isNp ? 'अपग्रेड गर्नुहोस्' : 'Upgrade to Operations'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Annual data table ── */
function AnnualTable({ data, isNp }: { data: any; isNp: boolean }) {
  const sum = (key: string) =>
    data.employees.reduce((s: number, e: any) => s + (e[key] || 0), 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              {[
                { label: isNp ? 'कर्मचारी'       : 'Employee',     align: 'left'   },
                { label: isNp ? 'महिना'           : 'Months',       align: 'center' },
                { label: isNp ? 'वार्षिक आधारभूत': 'Annual basic',  align: 'right'  },
                { label: isNp ? 'वार्षिक कुल'    : 'Annual gross',  align: 'right'  },
                { label: 'SSF',                                      align: 'right'  },
                { label: 'PF',                                       align: 'right'  },
                { label: 'CIT',                                      align: 'right'  },
                { label: 'TDS',                                      align: 'right'  },
                { label: isNp ? 'वार्षिक खुद'    : 'Annual net',    align: 'right'  },
              ].map((h, i) => (
                <th
                  key={i}
                  className={`py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider text-${h.align}`}
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.employees.map((e: any) => (
              <tr key={e.userId} className="hover:bg-slate-50/50">
                <td className="py-3 px-4">
                  <div className="text-sm font-medium text-slate-900">
                    {e.employee.firstName} {e.employee.lastName}
                  </div>
                  <div className="text-xs text-slate-400">
                    {e.employee.employeeId}
                    {e.isMarried ? ` • ${isNp ? 'विवाहित' : 'Married'}` : ''}
                  </div>
                </td>
                <td className="py-3 px-4 text-center text-sm text-slate-600">{e.monthsProcessed}</td>
                <td className="py-3 px-4 text-right text-sm text-slate-600">{fmt(e.totalBasic)}</td>
                <td className="py-3 px-4 text-right text-sm text-slate-600">{fmt(e.totalGross)}</td>
                <td className="py-3 px-4 text-right text-sm text-rose-600">
                  {fmt(e.totalEmployeeSsf)}
                  {e.totalEmployerSsf > 0 && (
                    <div className="text-[10px] text-blue-500">+{fmt(e.totalEmployerSsf)}</div>
                  )}
                </td>
                <td className="py-3 px-4 text-right text-sm text-rose-600">
                  {fmt(e.totalEmployeePf)}
                  {e.totalEmployerPf > 0 && (
                    <div className="text-[10px] text-blue-500">+{fmt(e.totalEmployerPf)}</div>
                  )}
                </td>
                <td className="py-3 px-4 text-right text-sm text-rose-600">{fmt(e.totalCit)}</td>
                <td className="py-3 px-4 text-right text-sm text-rose-600">{fmt(e.totalTds)}</td>
                <td className="py-3 px-4 text-right text-sm font-bold text-emerald-700">{fmt(e.totalNet)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-semibold">
              <td className="py-3 px-4 text-sm text-slate-900" colSpan={2}>
                {isNp ? 'जम्मा' : 'TOTAL'}
              </td>
              <td className="py-3 px-4 text-right text-sm text-slate-900">{fmt(sum('totalBasic'))}</td>
              <td className="py-3 px-4 text-right text-sm text-slate-900">{fmt(sum('totalGross'))}</td>
              <td className="py-3 px-4 text-right text-sm text-rose-700">{fmt(sum('totalEmployeeSsf'))}</td>
              <td className="py-3 px-4 text-right text-sm text-rose-700">{fmt(sum('totalEmployeePf'))}</td>
              <td className="py-3 px-4 text-right text-sm text-rose-700">{fmt(sum('totalCit'))}</td>
              <td className="py-3 px-4 text-right text-sm text-rose-700">{fmt(sum('totalTds'))}</td>
              <td className="py-3 px-4 text-right text-sm font-bold text-emerald-700">{fmt(sum('totalNet'))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function LoadingCard({ isNp }: { isNp: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
        <Clock className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
      <p className="text-sm text-slate-500">{isNp ? 'लोड हुँदैछ...' : 'Loading...'}</p>
    </div>
  );
}

function EmptyCard({ isNp }: { isNp: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
      <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
        <FileText className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-sm font-semibold text-slate-900 mb-1">
        {isNp ? 'कुनै डाटा छैन' : 'No data'}
      </h3>
      <p className="text-xs text-slate-500">
        {isNp ? 'यो वर्षको तलब गणना गरिएको छैन' : 'No payroll generated for this year'}
      </p>
    </div>
  );
}
