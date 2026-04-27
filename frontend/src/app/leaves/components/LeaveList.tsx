'use client'

import { Calendar, Clock, CheckCircle, XCircle, CalendarDays, Plus, Trash2, X } from 'lucide-react'
import { LeaveRequest } from '../types'
import { LEAVE_TYPES, STATUS_CONFIG } from '../constants'
import { toNepaliDigits, BS_MONTHS_NP, BS_MONTHS_EN } from '@/components/BSDatePicker'

interface Props {
  leaves: LeaveRequest[]
  activeTab: 'my' | 'all' | 'balances'
  isAdmin: boolean
  isStaff: boolean
  isNepali: boolean
  isNepaliCalendar: boolean
  hasActiveFilters: boolean
  onCancel: (id: string) => void
  onApprove: (id: string) => void
  onStartReject: (id: string) => void
  onClearFilters: () => void
  onRequestLeave: () => void
}

export default function LeaveList({
  leaves,
  activeTab,
  isAdmin,
  isStaff,
  isNepali,
  isNepaliCalendar,
  hasActiveFilters,
  onCancel,
  onApprove,
  onStartReject,
  onClearFilters,
  onRequestLeave,
}: Props) {
  const getLeaveTypeConfig = (type: string) =>
    LEAVE_TYPES.find((t) => t.value === type) || LEAVE_TYPES[1]

  const formatBSDate = (year: number, month: number, day: number) => {
    if (isNepali) return `${toNepaliDigits(year)} ${BS_MONTHS_NP[month - 1]} ${toNepaliDigits(day)}`
    return `${year}/${month}/${day} (${BS_MONTHS_EN[month - 1]})`
  }

  const formatADDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(isNepali ? 'ne-NP' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })

  const formatDateDisplay = (leave: LeaveRequest) => {
    if (isNepaliCalendar) {
      const start = formatBSDate(leave.bsStartYear, leave.bsStartMonth, leave.bsStartDay)
      const end = formatBSDate(leave.bsEndYear, leave.bsEndMonth, leave.bsEndDay)
      return {
        primary: `${start} → ${end}`,
        secondary: `${formatADDate(leave.startDate)} → ${formatADDate(leave.endDate)}`,
      }
    }
    return {
      primary: `${formatADDate(leave.startDate)} → ${formatADDate(leave.endDate)}`,
      secondary: `BS: ${formatBSDate(leave.bsStartYear, leave.bsStartMonth, leave.bsStartDay)} → ${formatBSDate(leave.bsEndYear, leave.bsEndMonth, leave.bsEndDay)}`,
    }
  }

  if (leaves.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-slate-100">
          <CalendarDays className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="mb-2 text-sm font-semibold text-slate-900">
          {hasActiveFilters
            ? isNepali
              ? 'कुनै परिणाम भेटिएन'
              : 'No results found'
            : isNepali
              ? 'कुनै बिदा अनुरोध छैन'
              : 'No leave requests'}
        </h3>
        <p className="mb-4 text-xs text-slate-500">
          {hasActiveFilters
            ? isNepali
              ? 'फिल्टर परिवर्तन गरी पुनः प्रयास गर्नुहोस्।'
              : 'Try adjusting your filters.'
            : activeTab === 'my'
              ? isNepali
                ? 'तपाईंले अहिलेसम्म कुनै बिदा माग्नुभएको छैन।'
                : "You haven't requested any leaves yet."
              : isNepali
                ? 'कर्मचारीहरूबाट कुनै बिदा अनुरोध छैन।'
                : 'No leave requests from employees.'}
        </p>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            <X className="h-3.5 w-3.5" />
            {isNepali ? 'फिल्टर हटाउनुहोस्' : 'Clear filters'}
          </button>
        )}
        {!hasActiveFilters && !isStaff && (
          <button
            onClick={onRequestLeave}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5" />
            {isNepali ? 'बिदा माग्नुहोस्' : 'Request leave'}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {leaves.map((leave) => {
        const typeConfig = getLeaveTypeConfig(leave.type)
        const TypeIcon = typeConfig.icon
        const statusConfig = STATUS_CONFIG[leave.status] || STATUS_CONFIG.PENDING
        const StatusIcon = statusConfig.icon
        const dates = formatDateDisplay(leave)

        return (
          <div
            key={leave.id}
            className={`overflow-hidden rounded-xl border border-l-4 border-slate-200 bg-white transition-all hover:border-slate-300 ${typeConfig.accent}`}
          >
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-lg bg-slate-50 p-2">
                    <TypeIcon className={`h-4 w-4 ${typeConfig.iconColor}`} />
                  </div>
                  <div>
                    {activeTab === 'all' && leave.user && (
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-900">
                          {leave.user.firstName} {leave.user.lastName}
                        </span>
                        <span className="text-[10px] text-slate-400">{leave.user.employeeId}</span>
                      </div>
                    )}
                    <h3 className="mb-1.5 text-sm font-medium text-slate-900">
                      {isNepali ? typeConfig.label : typeConfig.labelEn}
                    </h3>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span>{dates.primary}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span className="font-medium">
                          {isNepali
                            ? `${toNepaliDigits(leave.durationDays)} दिन`
                            : `${leave.durationDays} day${leave.durationDays > 1 ? 's' : ''}`}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{dates.secondary}</p>
                    </div>
                    <p className="mt-2 rounded-md bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">
                      {leave.reason}
                    </p>
                    {leave.approver && (
                      <>
                        <p className="mt-2 text-[10px] text-slate-400">
                          {leave.status === 'APPROVED'
                            ? isNepali
                              ? 'स्वीकृत गर्ने:'
                              : 'Approved by'
                            : isNepali
                              ? 'अस्वीकृत गर्ने:'
                              : 'Rejected by'}{' '}
                          {leave.approver.firstName} {leave.approver.lastName}
                          {leave.approvedAt && (
                            <> • {new Date(leave.approvedAt).toLocaleDateString()}</>
                          )}
                        </p>
                        {leave.status === 'REJECTED' && leave.rejectionMessage && (
                          <p className="mt-1 rounded-md bg-rose-50 px-2.5 py-1.5 text-[10px] text-rose-600">
                            {isNepali ? 'कारण: ' : 'Reason: '}
                            {leave.rejectionMessage}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-1 ${statusConfig.bg} border`}
                  >
                    <StatusIcon className={`h-3 w-3 ${statusConfig.color}`} />
                    <span className={`text-[10px] font-medium ${statusConfig.color}`}>
                      {isNepali ? statusConfig.labelNp : statusConfig.label}
                    </span>
                  </div>
                  {activeTab === 'my' && leave.status === 'PENDING' && (
                    <button
                      onClick={() => onCancel(leave.id)}
                      className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                      title={isNepali ? 'रद्द गर्नुहोस्' : 'Cancel request'}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {activeTab === 'all' && leave.status === 'PENDING' && isAdmin && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onApprove(leave.id)}
                        className="flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
                      >
                        <CheckCircle className="h-3 w-3" />
                        {isNepali ? 'स्वीकृत' : 'Approve'}
                      </button>
                      <button
                        onClick={() => onStartReject(leave.id)}
                        className="flex items-center gap-1 rounded-md bg-rose-50 px-2 py-1 text-[10px] font-medium text-rose-700 transition-colors hover:bg-rose-100"
                      >
                        <XCircle className="h-3 w-3" />
                        {isNepali ? 'अस्वीकृत' : 'Reject'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
