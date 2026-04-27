'use client'
import React, { useState, useEffect, useCallback } from 'react'
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'
import {
  ShieldCheck,
  ShieldAlert,
  Loader2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'

interface RequiredType {
  id: string
  name: string
  nameNp: string | null
}

interface EmployeeCompliance {
  id: string
  firstName: string
  lastName: string
  employeeId: string | null
  totalRequired: number
  uploaded: number
  missing: { id: string; name: string; nameNp: string | null }[]
}

interface DocumentComplianceProps {
  language?: 'ENGLISH' | 'NEPALI'
}

export default function DocumentCompliance({ language = 'ENGLISH' }: DocumentComplianceProps) {
  const isNp = language === 'NEPALI'

  const [requiredTypes, setRequiredTypes] = useState<RequiredType[]>([])
  const [employees, setEmployees] = useState<EmployeeCompliance[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null) // FIX: was missing, caused crash on API failure

  const fetchCompliance = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/api/v1/org/document-compliance`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setRequiredTypes(data.requiredTypes ?? [])
      setEmployees(data.employees ?? [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCompliance()
  }, [fetchCompliance])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-4">
        <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
        <p className="text-xs text-rose-700">{error}</p>
      </div>
    )
  }

  if (requiredTypes.length === 0) {
    return (
      <div className="py-8 text-center">
        <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-slate-200" />
        <p className="text-sm font-medium text-slate-400">
          {isNp ? 'कुनै अनिवार्य कागजात सेट गरिएको छैन' : 'No required documents configured'}
        </p>
        <p className="mt-1 text-xs text-slate-300">
          {isNp
            ? 'कागजात प्रकार सेटिङमा "अनिवार्य" चिन्ह लगाउनुहोस्'
            : 'Mark document types as "Required" in settings to track compliance'}
        </p>
      </div>
    )
  }

  const compliant = employees.filter((e) => e.missing.length === 0)
  const incomplete = employees.filter((e) => e.missing.length > 0)

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">
          {isNp ? 'कागजात अनुपालन' : 'Document Compliance'}
        </h3>
        <p className="mt-0.5 text-xs text-slate-400">
          {isNp
            ? `${requiredTypes.length} अनिवार्य कागजात प्रकार — ${compliant.length}/${employees.length} कर्मचारी पूर्ण`
            : `${requiredTypes.length} required type(s) — ${compliant.length}/${employees.length} employees complete`}
        </p>
      </div>

      {employees.length > 0 && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${(compliant.length / employees.length) * 100}%` }}
          />
        </div>
      )}

      {incomplete.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-500">
            {isNp ? 'अपूर्ण' : 'Incomplete'} ({incomplete.length})
          </p>
          {incomplete.map((emp) => {
            const isExpanded = expandedId === emp.id
            return (
              <div
                key={emp.id}
                className="overflow-hidden rounded-xl border border-amber-200 bg-white"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : emp.id)}
                  className="flex w-full items-center gap-3 p-3 transition-colors hover:bg-amber-50/50"
                >
                  <ShieldAlert className="h-4 w-4 shrink-0 text-amber-500" />
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-slate-800">
                      {emp.firstName} {emp.lastName}
                      {emp.employeeId && (
                        <span className="ml-1.5 text-xs text-slate-400">#{emp.employeeId}</span>
                      )}
                    </p>
                    <p className="text-xs text-amber-600">
                      {emp.uploaded}/{emp.totalRequired} {isNp ? 'पूरा' : 'complete'} —{' '}
                      {emp.missing.length} {isNp ? 'बाँकी' : 'missing'}
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                  )}
                </button>
                {isExpanded && (
                  <div className="border-t border-amber-100 px-3 pb-3 pt-1">
                    <p className="mb-1.5 text-xs font-medium text-slate-500">
                      {isNp ? 'बाँकी कागजातहरू:' : 'Missing documents:'}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {emp.missing.map((m) => (
                        <span
                          key={m.id}
                          className="inline-flex rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700"
                        >
                          {isNp && m.nameNp ? m.nameNp : m.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {compliant.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-500">
            {isNp ? 'पूर्ण' : 'Complete'} ({compliant.length})
          </p>
          {compliant.map((emp) => (
            <div
              key={emp.id}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              <p className="text-sm font-medium text-slate-800">
                {emp.firstName} {emp.lastName}
                {emp.employeeId && (
                  <span className="ml-1.5 text-xs text-slate-400">#{emp.employeeId}</span>
                )}
              </p>
              <span className="ml-auto text-xs text-emerald-600">
                {emp.totalRequired}/{emp.totalRequired}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
