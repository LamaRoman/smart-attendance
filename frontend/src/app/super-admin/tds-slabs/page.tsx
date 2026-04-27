'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Calculator,
} from 'lucide-react'

interface Slab {
  limit: number
  rate: number
  label: string
}

interface TDSConfig {
  fiscalYear: string
  unmarriedFirstSlab: number
  marriedFirstSlab: number
  slabs: Slab[]
  firstSlabRate: number
  updatedAt: string | null
}

export default function TDSSlabsPage() {
  const { user, isLoading, isSuperAdmin } = useAuth()
  const router = useRouter()

  const [config, setConfig] = useState<TDSConfig>({
    fiscalYear: '2081/82',
    unmarriedFirstSlab: 500000,
    marriedFirstSlab: 600000,
    slabs: [
      { limit: 200000, rate: 10, label: 'Second slab' },
      { limit: 300000, rate: 20, label: 'Third slab' },
      { limit: 1000000, rate: 30, label: 'Fourth slab' },
      { limit: 3000000, rate: 36, label: 'Fifth slab' },
      { limit: 0, rate: 39, label: 'Remaining (above)' },
    ],
    firstSlabRate: 1,
    updatedAt: null,
  })

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Test calculator
  const [testIncome, setTestIncome] = useState('')
  const [testMarried, setTestMarried] = useState(false)
  const [testResult, setTestResult] = useState<{
    annual: number
    monthly: number
    breakdown: { label: string; taxable: number; rate: number; tax: number }[]
  } | null>(null)

  const loadSlabs = useCallback(async () => {
    setLoading(true)
    const res = await api.get('/api/v1/super-admin/tds-slabs')
    if (res.data) setConfig(res.data as TDSConfig)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (user) loadSlabs()
  }, [user, loadSlabs])
  const handleSave = async () => {
    setSaving(true)
    setError('')
    const res = await api.put('/api/v1/super-admin/tds-slabs', config)
    if (res.error) {
      setError(res.error.message)
    } else {
      setSuccess('TDS slabs updated successfully. All organizations will use the new rates.')
      setConfig(res.data as TDSConfig)
      setTimeout(() => setSuccess(''), 5000)
    }
    setSaving(false)
  }

  const addSlab = () => {
    const newSlabs = [...config.slabs]
    const lastIdx = newSlabs.length - 1
    newSlabs.splice(lastIdx, 0, { limit: 500000, rate: 25, label: 'New slab' })
    setConfig({ ...config, slabs: newSlabs })
  }

  const removeSlab = (idx: number) => {
    if (config.slabs.length <= 1) return
    const newSlabs = config.slabs.filter((_, i) => i !== idx)
    setConfig({ ...config, slabs: newSlabs })
  }

  const updateSlab = (idx: number, field: keyof Slab, value: string | number) => {
    const newSlabs = [...config.slabs]
    newSlabs[idx] = { ...newSlabs[idx], [field]: value }
    setConfig({ ...config, slabs: newSlabs })
  }

  const calculateTest = () => {
    const income = Number(testIncome)
    if (!income || income <= 0) return

    const firstSlabLimit = testMarried ? config.marriedFirstSlab : config.unmarriedFirstSlab
    const allSlabs = [
      {
        limit: firstSlabLimit,
        rate: config.firstSlabRate / 100,
        label: `First slab (${config.firstSlabRate}%)`,
      },
      ...config.slabs.map((s) => ({
        limit: s.limit === 0 ? Infinity : s.limit,
        rate: s.rate / 100,
        label: `${s.label} (${s.rate}%)`,
      })),
    ]

    let tax = 0
    let remaining = income
    const breakdown: { label: string; taxable: number; rate: number; tax: number }[] = []

    for (const slab of allSlabs) {
      if (remaining <= 0) break
      const taxable = Math.min(remaining, slab.limit)
      const slabTax = taxable * slab.rate
      tax += slabTax
      breakdown.push({
        label: slab.label,
        taxable,
        rate: slab.rate * 100,
        tax: Math.round(slabTax),
      })
      remaining -= taxable
    }
    setTestResult({ annual: Math.round(tax), monthly: Math.round(tax / 12), breakdown })
  }

  const formatNPR = (n: number) => 'Rs. ' + n.toLocaleString('en-IN')

  /** Build the cumulative range preview for a given first-slab amount */
  const buildPreviewRanges = (firstSlabAmount: number) => {
    const ranges: { from: number; to: number | null; rate: number }[] = []
    let cursor = 0

    // First slab
    ranges.push({ from: 0, to: firstSlabAmount, rate: config.firstSlabRate })
    cursor = firstSlabAmount

    // Remaining slabs
    for (const s of config.slabs) {
      if (s.limit === 0) {
        ranges.push({ from: cursor, to: null, rate: s.rate })
      } else {
        ranges.push({ from: cursor, to: cursor + s.limit, rate: s.rate })
        cursor += s.limit
      }
    }
    return ranges
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-slate-100 border-t-slate-800" />
      </div>
    )
  }

  if (!user || !isSuperAdmin) return null

  const unmarriedRanges = buildPreviewRanges(config.unmarriedFirstSlab)
  const marriedRanges = buildPreviewRanges(config.marriedFirstSlab)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/super-admin')}
                className="rounded-md p-1.5 transition-colors hover:bg-slate-100"
              >
                <ArrowLeft className="h-4 w-4 text-slate-600" />
              </button>
              <div>
                <h1 className="text-sm font-semibold text-slate-900">TDS Tax Slabs</h1>
                <p className="text-xs text-slate-400">Nepal Income Tax Configuration</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadSlabs}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw className={'h-3.5 w-3.5 ' + (loading ? 'animate-spin' : '')} /> Reload
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" /> {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Alerts */}
        {error && (
          <div className="flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 p-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-500" />
              <span className="text-xs text-rose-700">{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-xs text-rose-400">
              ✕
            </button>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <span className="text-xs text-emerald-700">{success}</span>
          </div>
        )}

        {/* Info banner */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs text-amber-800">
            These tax slabs apply to <strong>all organizations</strong> on the platform. Changes
            take effect on the next payroll generation.
            {config.updatedAt && (
              <span className="ml-2 text-amber-600">
                Last updated: {new Date(config.updatedAt).toLocaleDateString()}
              </span>
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left: Slab configuration */}
          <div className="space-y-6 lg:col-span-2">
            {/* Fiscal Year & First Slab */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="mb-4 text-sm font-semibold text-slate-900">General settings</h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">
                    Fiscal Year (BS)
                  </label>
                  <input
                    type="text"
                    value={config.fiscalYear}
                    onChange={(e) => setConfig({ ...config, fiscalYear: e.target.value })}
                    placeholder="2081/82"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">
                    Unmarried 1st slab (Rs.)
                  </label>
                  <input
                    type="number"
                    value={config.unmarriedFirstSlab}
                    onChange={(e) =>
                      setConfig({ ...config, unmarriedFirstSlab: Number(e.target.value) })
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">
                    Married 1st slab (Rs.)
                  </label>
                  <input
                    type="number"
                    value={config.marriedFirstSlab}
                    onChange={(e) =>
                      setConfig({ ...config, marriedFirstSlab: Number(e.target.value) })
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  First slab tax rate (%)
                </label>
                <input
                  type="number"
                  value={config.firstSlabRate}
                  step="0.1"
                  onChange={(e) => setConfig({ ...config, firstSlabRate: Number(e.target.value) })}
                  className="w-32 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
            </div>

            {/* Slabs table */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Tax slabs (after first slab)
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Slab widths apply equally to both married and unmarried — only the starting
                    threshold differs
                  </p>
                </div>
                <button
                  onClick={addSlab}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  <Plus className="h-3.5 w-3.5" /> Add slab
                </button>
              </div>

              <div className="space-y-3">
                {/* Header */}
                <div className="grid grid-cols-12 gap-3 px-1 text-xs font-medium uppercase tracking-wider text-slate-400">
                  <div className="col-span-4">Label</div>
                  <div className="col-span-3">Income limit (Rs.)</div>
                  <div className="col-span-3">Rate (%)</div>
                  <div className="col-span-2"></div>
                </div>

                {config.slabs.map((slab, idx) => {
                  const isLast = idx === config.slabs.length - 1
                  return (
                    <div key={idx} className="grid grid-cols-12 items-center gap-3">
                      <div className="col-span-4">
                        <input
                          type="text"
                          value={slab.label}
                          onChange={(e) => updateSlab(idx, 'label', e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                      </div>
                      <div className="col-span-3">
                        {isLast ? (
                          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400">
                            Remaining
                          </div>
                        ) : (
                          <input
                            type="number"
                            value={slab.limit}
                            onChange={(e) => updateSlab(idx, 'limit', Number(e.target.value))}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                          />
                        )}
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          value={slab.rate}
                          step="0.1"
                          onChange={(e) => updateSlab(idx, 'rate', Number(e.target.value))}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                      </div>
                      <div className="col-span-2 flex justify-end">
                        {!isLast && config.slabs.length > 1 && (
                          <button
                            onClick={() => removeSlab(idx)}
                            className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Summary — cumulative income range previews for both */}
              <div className="mt-5 border-t border-slate-100 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Unmarried preview */}
                  <div>
                    <h3 className="mb-2 text-xs font-semibold text-slate-700">
                      Unmarried brackets
                    </h3>
                    <div className="space-y-0.5">
                      {unmarriedRanges.map((r, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between rounded px-2 py-1 text-xs hover:bg-slate-50"
                        >
                          <span className="text-slate-600">
                            {r.to === null
                              ? `Above ${formatNPR(r.from)}`
                              : r.from === 0
                                ? `Up to ${formatNPR(r.to)}`
                                : `${formatNPR(r.from + 1)} – ${formatNPR(r.to)}`}
                          </span>
                          <span className="font-medium text-slate-900">{r.rate}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Married preview */}
                  <div>
                    <h3 className="mb-2 text-xs font-semibold text-slate-700">Married brackets</h3>
                    <div className="space-y-0.5">
                      {marriedRanges.map((r, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between rounded px-2 py-1 text-xs hover:bg-slate-50"
                        >
                          <span className="text-slate-600">
                            {r.to === null
                              ? `Above ${formatNPR(r.from)}`
                              : r.from === 0
                                ? `Up to ${formatNPR(r.to)}`
                                : `${formatNPR(r.from + 1)} – ${formatNPR(r.to)}`}
                          </span>
                          <span className="font-medium text-slate-900">{r.rate}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Tax calculator */}
          <div>
            <div className="sticky top-20 rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center gap-2">
                <Calculator className="h-4 w-4 text-slate-600" />
                <h2 className="text-sm font-semibold text-slate-900">Tax calculator</h2>
              </div>
              <p className="mb-4 text-xs text-slate-400">Test with current slab configuration</p>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">
                    Annual income (Rs.)
                  </label>
                  <input
                    type="number"
                    value={testIncome}
                    onChange={(e) => setTestIncome(e.target.value)}
                    placeholder="e.g., 800000"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={testMarried}
                    onChange={(e) => setTestMarried(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span className="text-xs text-slate-600">Married</span>
                </label>

                <button
                  onClick={calculateTest}
                  className="w-full rounded-lg bg-slate-900 py-2 text-xs font-medium text-white hover:bg-slate-800"
                >
                  Calculate
                </button>

                {testResult && (
                  <div className="mt-3 space-y-3">
                    {/* Summary */}
                    <div className="space-y-2 rounded-lg bg-slate-50 p-3">
                      <div className="flex justify-between">
                        <span className="text-xs text-slate-500">Annual tax</span>
                        <span className="text-sm font-semibold text-slate-900">
                          {formatNPR(testResult.annual)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-slate-500">Monthly TDS</span>
                        <span className="text-sm font-semibold text-emerald-700">
                          {formatNPR(testResult.monthly)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-slate-500">Effective rate</span>
                        <span className="text-sm font-medium text-slate-700">
                          {((testResult.annual / Number(testIncome)) * 100).toFixed(2)}%
                        </span>
                      </div>
                    </div>

                    {/* Slab-by-slab breakdown */}
                    <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3">
                      <h4 className="mb-2 text-xs font-medium text-slate-600">
                        Breakdown ({testMarried ? 'Married' : 'Unmarried'})
                      </h4>
                      <div className="space-y-1.5">
                        {testResult.breakdown.map((b, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">
                              {formatNPR(b.taxable)} × {b.rate}%
                            </span>
                            <span className="font-medium text-slate-700">{formatNPR(b.tax)}</span>
                          </div>
                        ))}
                        <div className="mt-1.5 flex justify-between border-t border-blue-200 pt-1.5 text-xs font-semibold">
                          <span className="text-slate-600">Total</span>
                          <span className="text-slate-900">{formatNPR(testResult.annual)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
