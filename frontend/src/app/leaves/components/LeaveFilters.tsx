'use client'

import { Filter, Search, X } from 'lucide-react'
import { LEAVE_TYPES } from '../constants'
import { BS_MONTHS_NP, BS_MONTHS_EN } from '@/components/BSDatePicker'

interface Props {
  isNepali: boolean
  statusFilter: string
  typeFilter: string
  searchQuery: string
  filterBsYear: string
  filterBsMonth: string
  hasActiveFilters: boolean
  showFilters: boolean
  onStatusChange: (v: string) => void
  onTypeChange: (v: string) => void
  onSearchChange: (v: string) => void
  onBsYearChange: (v: string) => void
  onBsMonthChange: (v: string) => void
  onToggleFilters: () => void
  onClearAll: () => void
  pendingCount: number
}

const bsYearOptions = Array.from({ length: 10 }, (_, i) => 2078 + i)

export default function LeaveFilters({
  isNepali,
  statusFilter,
  typeFilter,
  searchQuery,
  filterBsYear,
  filterBsMonth,
  hasActiveFilters,
  showFilters,
  onStatusChange,
  onTypeChange,
  onSearchChange,
  onBsYearChange,
  onBsMonthChange,
  onToggleFilters,
  onClearAll,
  pendingCount,
}: Props) {
  const activeCount = [
    statusFilter !== 'ALL',
    typeFilter !== 'ALL',
    !!searchQuery,
    !!filterBsYear,
    !!filterBsMonth,
  ].filter(Boolean).length

  return (
    <div className="space-y-4">
      {/* Filter toggle row */}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onToggleFilters}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
            showFilters || hasActiveFilters
              ? 'border-slate-900 bg-slate-900 text-white'
              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Filter className="h-3.5 w-3.5" />
          {isNepali ? 'फिल्टर' : 'Filters'}
          {hasActiveFilters && (
            <span className="ml-1 rounded-full bg-white px-1.5 py-0.5 text-[10px] text-slate-900">
              {activeCount}
            </span>
          )}
        </button>
        {hasActiveFilters && (
          <button
            onClick={onClearAll}
            className="flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50"
          >
            <X className="h-3 w-3" />
            {isNepali ? 'सबै हटाउनुहोस्' : 'Clear all'}
          </button>
        )}
      </div>

      {/* Expandable filter panel */}
      {showFilters && (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
          {/* Row 1: Search + Status + Type */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {/* Search */}
            <div>
              <label className="mb-1.5 block text-[11px] font-medium text-slate-500">
                {isNepali ? 'कर्मचारी खोज्नुहोस्' : 'Search employee'}
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={isNepali ? 'नाम वा कर्मचारी ID...' : 'Name or Employee ID...'}
                  className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="mb-1.5 block text-[11px] font-medium text-slate-500">
                {isNepali ? 'स्थिति' : 'Status'}
              </label>
              <select
                value={statusFilter}
                onChange={(e) => onStatusChange(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                <option value="ALL">{isNepali ? 'सबै स्थिति' : 'All status'}</option>
                <option value="PENDING">{isNepali ? 'विचाराधीन' : 'Pending'}</option>
                <option value="APPROVED">{isNepali ? 'स्वीकृत' : 'Approved'}</option>
                <option value="REJECTED">{isNepali ? 'अस्वीकृत' : 'Rejected'}</option>
              </select>
            </div>

            {/* Leave Type */}
            <div>
              <label className="mb-1.5 block text-[11px] font-medium text-slate-500">
                {isNepali ? 'बिदाको प्रकार' : 'Leave type'}
              </label>
              <select
                value={typeFilter}
                onChange={(e) => onTypeChange(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                <option value="ALL">{isNepali ? 'सबै प्रकार' : 'All types'}</option>
                {LEAVE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {isNepali ? t.label : t.labelEn}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: BS Year + BS Month */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-medium text-slate-500">
                {isNepali ? 'वि.सं. वर्ष' : 'BS Year'}
              </label>
              <select
                value={filterBsYear}
                onChange={(e) => onBsYearChange(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                <option value="">{isNepali ? 'सबै वर्ष' : 'All years'}</option>
                {bsYearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-medium text-slate-500">
                {isNepali ? 'महिना' : 'BS Month'}
              </label>
              <select
                value={filterBsMonth}
                onChange={(e) => onBsMonthChange(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                <option value="">{isNepali ? 'सबै महिना' : 'All months'}</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {isNepali ? BS_MONTHS_NP[m - 1] : BS_MONTHS_EN[m - 1]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end" />
          </div>
        </div>
      )}
    </div>
  )
}
