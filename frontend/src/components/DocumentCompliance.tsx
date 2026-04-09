'use client';
import React, { useState, useEffect, useCallback } from "react";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
import {
  ShieldCheck,
  ShieldAlert,
  Loader2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface RequiredType {
  id: string;
  name: string;
  nameNp: string | null;
}

interface EmployeeCompliance {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string | null;
  totalRequired: number;
  uploaded: number;
  missing: { id: string; name: string; nameNp: string | null }[];
}

interface DocumentComplianceProps {
  language?: 'ENGLISH' | 'NEPALI';
}

export default function DocumentCompliance({ language = 'ENGLISH' }: DocumentComplianceProps) {
  const isNp = language === 'NEPALI';

  const [requiredTypes, setRequiredTypes] = useState<RequiredType[]>([]);
  const [employees, setEmployees]         = useState<EmployeeCompliance[]>([]);
  const [loading, setLoading]             = useState(true);
  const [expandedId, setExpandedId]       = useState<string | null>(null);
  const [error, setError]                 = useState<string | null>(null); // FIX: was missing, caused crash on API failure

  const fetchCompliance = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/v1/org/document-compliance`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setRequiredTypes(data.requiredTypes ?? []);
      setEmployees(data.employees ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCompliance(); }, [fetchCompliance]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 text-slate-300 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 py-4 px-3 bg-rose-50 rounded-xl border border-rose-200">
        <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
        <p className="text-xs text-rose-700">{error}</p>
      </div>
    );
  }

  if (requiredTypes.length === 0) {
    return (
      <div className="text-center py-8">
        <ShieldCheck className="w-10 h-10 text-slate-200 mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-400">
          {isNp ? 'कुनै अनिवार्य कागजात सेट गरिएको छैन' : 'No required documents configured'}
        </p>
        <p className="text-xs text-slate-300 mt-1">
          {isNp
            ? 'कागजात प्रकार सेटिङमा "अनिवार्य" चिन्ह लगाउनुहोस्'
            : 'Mark document types as "Required" in settings to track compliance'}
        </p>
      </div>
    );
  }

  const compliant  = employees.filter((e) => e.missing.length === 0);
  const incomplete = employees.filter((e) => e.missing.length > 0);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">
          {isNp ? 'कागजात अनुपालन' : 'Document Compliance'}
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          {isNp
            ? `${requiredTypes.length} अनिवार्य कागजात प्रकार — ${compliant.length}/${employees.length} कर्मचारी पूर्ण`
            : `${requiredTypes.length} required type(s) — ${compliant.length}/${employees.length} employees complete`}
        </p>
      </div>

      {employees.length > 0 && (
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
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
            const isExpanded = expandedId === emp.id;
            return (
              <div key={emp.id} className="bg-white rounded-xl border border-amber-200 overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : emp.id)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-amber-50/50 transition-colors"
                >
                  <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-slate-800">
                      {emp.firstName} {emp.lastName}
                      {emp.employeeId && (
                        <span className="text-xs text-slate-400 ml-1.5">#{emp.employeeId}</span>
                      )}
                    </p>
                    <p className="text-xs text-amber-600">
                      {emp.uploaded}/{emp.totalRequired} {isNp ? 'पूरा' : 'complete'} — {emp.missing.length} {isNp ? 'बाँकी' : 'missing'}
                    </p>
                  </div>
                  {isExpanded
                    ? <ChevronUp   className="w-3.5 h-3.5 text-slate-400" />
                    : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                </button>
                {isExpanded && (
                  <div className="px-3 pb-3 pt-1 border-t border-amber-100">
                    <p className="text-xs font-medium text-slate-500 mb-1.5">
                      {isNp ? 'बाँकी कागजातहरू:' : 'Missing documents:'}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {emp.missing.map((m) => (
                        <span key={m.id} className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700">
                          {isNp && m.nameNp ? m.nameNp : m.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {compliant.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-500">
            {isNp ? 'पूर्ण' : 'Complete'} ({compliant.length})
          </p>
          {compliant.map((emp) => (
            <div key={emp.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <p className="text-sm font-medium text-slate-800">
                {emp.firstName} {emp.lastName}
                {emp.employeeId && (
                  <span className="text-xs text-slate-400 ml-1.5">#{emp.employeeId}</span>
                )}
              </p>
              <span className="text-xs text-emerald-600 ml-auto">
                {emp.totalRequired}/{emp.totalRequired}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
