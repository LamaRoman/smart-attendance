'use client'

import { Lock } from 'lucide-react'

interface ProBlurOverlayProps {
  message?: string
  isNp?: boolean
  children?: React.ReactNode
  onUpgrade?: () => void
}

export default function ProBlurOverlay({
  message,
  isNp,
  children,
  onUpgrade,
}: ProBlurOverlayProps) {
  return (
    <div className="relative min-h-[350px]">
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ filter: 'blur(6px)', opacity: 0.5, pointerEvents: 'none', userSelect: 'none' }}
      >
        {children || (
          <div className="space-y-4 p-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-3 h-4 w-48 rounded bg-slate-200"></div>
              <div className="grid grid-cols-4 gap-3">
                <div className="h-16 rounded-lg bg-slate-100"></div>
                <div className="h-16 rounded-lg bg-slate-100"></div>
                <div className="h-16 rounded-lg bg-slate-100"></div>
                <div className="h-16 rounded-lg bg-slate-100"></div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-4 h-4 w-32 rounded bg-slate-200"></div>
              <div className="space-y-3">
                <div className="h-8 rounded bg-slate-50"></div>
                <div className="h-8 rounded bg-slate-100"></div>
                <div className="h-8 rounded bg-slate-50"></div>
                <div className="h-8 rounded bg-slate-100"></div>
                <div className="h-8 rounded bg-slate-50"></div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-3 h-4 w-40 rounded bg-slate-200"></div>
              <div className="h-32 rounded-lg bg-slate-50"></div>
            </div>
          </div>
        )}
      </div>
      <div className="absolute inset-0 z-10 flex items-center justify-center">
        <div className="max-w-sm rounded-xl border border-amber-200 bg-white/95 px-8 py-6 text-center shadow-lg backdrop-blur-sm">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-amber-50">
            <Lock className="h-5 w-5 text-amber-600" />
          </div>
          <h3 className="mb-1 text-sm font-semibold text-slate-900">
            {isNp ? 'Operations प्लान आवश्यक छ' : 'Operations Plan Required'}
          </h3>
          <p className="mb-3 text-xs text-slate-500">
            {message ||
              (isNp
                ? 'यो सुविधा प्रयोग गर्न अपग्रेड गर्नुहोस्।'
                : 'Upgrade to unlock this feature.')}
          </p>
          <button
            onClick={onUpgrade}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800"
          >
            {isNp ? 'अपग्रेड गर्नुहोस्' : 'Upgrade to Operations'}
          </button>
        </div>
      </div>
    </div>
  )
}
