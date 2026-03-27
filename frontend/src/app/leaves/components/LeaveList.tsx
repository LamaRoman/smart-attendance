'use client';

import { Calendar, Clock, CheckCircle, XCircle, CalendarDays, Plus, Trash2, X } from 'lucide-react';
import { LeaveRequest } from '../types';
import { LEAVE_TYPES, STATUS_CONFIG } from '../constants';
import { toNepaliDigits, BS_MONTHS_NP, BS_MONTHS_EN } from '@/components/BSDatePicker';

interface Props {
  leaves: LeaveRequest[];
  activeTab: 'my' | 'all' | 'balances';
  isAdmin: boolean;
  isStaff: boolean;
  isNepali: boolean;
  isNepaliCalendar: boolean;
  hasActiveFilters: boolean;
  onCancel: (id: string) => void;
  onApprove: (id: string) => void;
  onStartReject: (id: string) => void;
  onClearFilters: () => void;
  onRequestLeave: () => void;
}

export default function LeaveList({
  leaves, activeTab, isAdmin, isStaff, isNepali, isNepaliCalendar,
  hasActiveFilters, onCancel, onApprove, onStartReject, onClearFilters, onRequestLeave,
}: Props) {

  const getLeaveTypeConfig = (type: string) =>
    LEAVE_TYPES.find((t) => t.value === type) || LEAVE_TYPES[1];

  const formatBSDate = (year: number, month: number, day: number) => {
    if (isNepali) return `${toNepaliDigits(year)} ${BS_MONTHS_NP[month - 1]} ${toNepaliDigits(day)}`;
    return `${year}/${month}/${day} (${BS_MONTHS_EN[month - 1]})`;
  };

  const formatADDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(isNepali ? 'ne-NP' : 'en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });

  const formatDateDisplay = (leave: LeaveRequest) => {
    if (isNepaliCalendar) {
      const start = formatBSDate(leave.bsStartYear, leave.bsStartMonth, leave.bsStartDay);
      const end   = formatBSDate(leave.bsEndYear,   leave.bsEndMonth,   leave.bsEndDay);
      return {
        primary: `${start} → ${end}`,
        secondary: `${formatADDate(leave.startDate)} → ${formatADDate(leave.endDate)}`,
      };
    }
    return {
      primary: `${formatADDate(leave.startDate)} → ${formatADDate(leave.endDate)}`,
      secondary: `BS: ${formatBSDate(leave.bsStartYear, leave.bsStartMonth, leave.bsStartDay)} → ${formatBSDate(leave.bsEndYear, leave.bsEndMonth, leave.bsEndDay)}`,
    };
  };

  if (leaves.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <CalendarDays className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900 mb-2">
          {hasActiveFilters
            ? isNepali ? 'कुनै परिणाम भेटिएन' : 'No results found'
            : isNepali ? 'कुनै बिदा अनुरोध छैन' : 'No leave requests'}
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          {hasActiveFilters
            ? isNepali ? 'फिल्टर परिवर्तन गरी पुनः प्रयास गर्नुहोस्।' : 'Try adjusting your filters.'
            : activeTab === 'my'
              ? isNepali ? 'तपाईंले अहिलेसम्म कुनै बिदा माग्नुभएको छैन।' : "You haven't requested any leaves yet."
              : isNepali ? 'कर्मचारीहरूबाट कुनै बिदा अनुरोध छैन।' : 'No leave requests from employees.'}
        </p>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 border border-slate-200 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            {isNepali ? 'फिल्टर हटाउनुहोस्' : 'Clear filters'}
          </button>
        )}
        {!hasActiveFilters && !isStaff && (
          <button
            onClick={onRequestLeave}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            {isNepali ? 'बिदा माग्नुहोस्' : 'Request leave'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {leaves.map((leave) => {
        const typeConfig   = getLeaveTypeConfig(leave.type);
        const TypeIcon     = typeConfig.icon;
        const statusConfig = STATUS_CONFIG[leave.status] || STATUS_CONFIG.PENDING;
        const StatusIcon   = statusConfig.icon;
        const dates        = formatDateDisplay(leave);

        return (
          <div
            key={leave.id}
            className={`bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-all overflow-hidden border-l-4 ${typeConfig.accent}`}
          >
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-slate-50 mt-0.5">
                    <TypeIcon className={`w-4 h-4 ${typeConfig.iconColor}`} />
                  </div>
                  <div>
                    {activeTab === 'all' && leave.user && (
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-slate-900">
                          {leave.user.firstName} {leave.user.lastName}
                        </span>
                        <span className="text-[10px] text-slate-400">{leave.user.employeeId}</span>
                      </div>
                    )}
                    <h3 className="text-sm font-medium text-slate-900 mb-1.5">
                      {isNepali ? typeConfig.label : typeConfig.labelEn}
                    </h3>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{dates.primary}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium">
                          {isNepali
                            ? `${toNepaliDigits(leave.durationDays)} दिन`
                            : `${leave.durationDays} day${leave.durationDays > 1 ? 's' : ''}`}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{dates.secondary}</p>
                    </div>
                    <p className="text-xs text-slate-600 mt-2 bg-slate-50 px-2.5 py-1.5 rounded-md">
                      {leave.reason}
                    </p>
                    {leave.approver && (
                      <>
                        <p className="text-[10px] text-slate-400 mt-2">
                          {leave.status === 'APPROVED'
                            ? isNepali ? 'स्वीकृत गर्ने:' : 'Approved by'
                            : isNepali ? 'अस्वीकृत गर्ने:' : 'Rejected by'}{' '}
                          {leave.approver.firstName} {leave.approver.lastName}
                          {leave.approvedAt && <> • {new Date(leave.approvedAt).toLocaleDateString()}</>}
                        </p>
                        {leave.status === 'REJECTED' && leave.rejectionMessage && (
                          <p className="text-[10px] text-rose-600 mt-1 bg-rose-50 px-2.5 py-1.5 rounded-md">
                            {isNepali ? 'कारण: ' : 'Reason: '}{leave.rejectionMessage}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md ${statusConfig.bg} border`}>
                    <StatusIcon className={`w-3 h-3 ${statusConfig.color}`} />
                    <span className={`text-[10px] font-medium ${statusConfig.color}`}>
                      {isNepali ? statusConfig.labelNp : statusConfig.label}
                    </span>
                  </div>
                  {activeTab === 'my' && leave.status === 'PENDING' && (
                    <button
                      onClick={() => onCancel(leave.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                      title={isNepali ? 'रद्द गर्नुहोस्' : 'Cancel request'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {activeTab === 'all' && leave.status === 'PENDING' && isAdmin && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onApprove(leave.id)}
                        className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md text-[10px] font-medium hover:bg-emerald-100 transition-colors"
                      >
                        <CheckCircle className="w-3 h-3" />
                        {isNepali ? 'स्वीकृत' : 'Approve'}
                      </button>
                      <button
                        onClick={() => onStartReject(leave.id)}
                        className="flex items-center gap-1 px-2 py-1 bg-rose-50 text-rose-700 rounded-md text-[10px] font-medium hover:bg-rose-100 transition-colors"
                      >
                        <XCircle className="w-3 h-3" />
                        {isNepali ? 'अस्वीकृत' : 'Reject'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}