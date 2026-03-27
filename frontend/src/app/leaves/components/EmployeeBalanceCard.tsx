'use client';

import { Sun, Thermometer, Umbrella } from 'lucide-react';
import { LeaveBalance } from '../types';
import { CURRENT_BS_YEAR } from '../constants';

interface Props {
  balance: LeaveBalance;
  isNepali: boolean;
}

function BalanceColumn({
  icon: Icon,
  iconColor,
  label,
  available,
  total,
  barColor,
}: {
  icon: typeof Sun;
  iconColor: string;
  label: string;
  available: number;
  total: number;
  barColor: string;
}) {
  const pct = Math.round((available / Math.max(1, total)) * 100);
  return (
    <div className="p-4 text-center">
      <div className="flex items-center justify-center gap-1.5 mb-2">
        <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
        <span className="text-xs font-medium text-slate-600">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${iconColor.replace('text-', 'text-').replace('-500', '-700')}`}>
        {available}
      </p>
      <p className="text-xs text-slate-400 mt-0.5">of {total}</p>
      <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden mx-4">
        <div
          className={`h-full rounded-full ${
            available === 0
              ? 'bg-rose-400'
              : pct < 30
              ? 'bg-amber-400'
              : barColor
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function EmployeeBalanceCard({ balance, isNepali }: Props) {
  return (
    <div className="mb-6 bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
        <h3 className="text-sm font-semibold text-slate-900">
          {isNepali
            ? `${CURRENT_BS_YEAR} — मेरो बिदा ब्यालेन्स`
            : `${CURRENT_BS_YEAR} — My Leave Balance`}
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          {isNepali ? 'उपलब्ध / जम्मा' : 'Available / Total'}
        </p>
      </div>
      <div className="grid grid-cols-3 divide-x divide-slate-100">
        <BalanceColumn
          icon={Sun}
          iconColor="text-amber-500"
          label={isNepali ? 'वार्षिक' : 'Annual'}
          available={balance.annualAvailable}
          total={balance.annualEntitlement + balance.annualCarriedOver}
          barColor="bg-amber-500"
        />
        <BalanceColumn
          icon={Thermometer}
          iconColor="text-rose-500"
          label={isNepali ? 'बिरामी' : 'Sick'}
          available={balance.sickAvailable}
          total={balance.sickEntitlement + balance.sickCarriedOver}
          barColor="bg-rose-500"
        />
        <BalanceColumn
          icon={Umbrella}
          iconColor="text-blue-500"
          label={isNepali ? 'आकस्मिक' : 'Casual'}
          available={balance.casualAvailable}
          total={balance.casualEntitlement}
          barColor="bg-blue-500"
        />
      </div>
    </div>
  );
}