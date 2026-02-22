'use client';

import { Lock } from 'lucide-react';

interface ProBlurOverlayProps {
  message?: string;
  isNp?: boolean;
  children?: React.ReactNode;
  onUpgrade?: () => void;
}

export default function ProBlurOverlay({ message, isNp, children, onUpgrade }: ProBlurOverlayProps) {
  return (
    <div className="relative min-h-[350px]">
      <div className="absolute inset-0 overflow-hidden" style={{ filter: 'blur(6px)', opacity: 0.5, pointerEvents: 'none', userSelect: 'none' }}>
        {children || (
          <div className="space-y-4 p-2">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="h-4 w-48 bg-slate-200 rounded mb-3"></div>
              <div className="grid grid-cols-4 gap-3">
                <div className="h-16 bg-slate-100 rounded-lg"></div>
                <div className="h-16 bg-slate-100 rounded-lg"></div>
                <div className="h-16 bg-slate-100 rounded-lg"></div>
                <div className="h-16 bg-slate-100 rounded-lg"></div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="h-4 w-32 bg-slate-200 rounded mb-4"></div>
              <div className="space-y-3">
                <div className="h-8 bg-slate-50 rounded"></div>
                <div className="h-8 bg-slate-100 rounded"></div>
                <div className="h-8 bg-slate-50 rounded"></div>
                <div className="h-8 bg-slate-100 rounded"></div>
                <div className="h-8 bg-slate-50 rounded"></div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="h-4 w-40 bg-slate-200 rounded mb-3"></div>
              <div className="h-32 bg-slate-50 rounded-lg"></div>
            </div>
          </div>
        )}
      </div>
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="bg-white/95 backdrop-blur-sm border border-amber-200 rounded-xl px-8 py-6 shadow-lg text-center max-w-sm">
          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-3">
            <Lock className="w-5 h-5 text-amber-600" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 mb-1">
            {isNp ? 'Operations प्लान आवश्यक छ' : 'Operations Plan Required'}
          </h3>
          <p className="text-xs text-slate-500 mb-3">
            {message || (isNp ? 'यो सुविधा प्रयोग गर्न अपग्रेड गर्नुहोस्।' : 'Upgrade to unlock this feature.')}
          </p>
          <button
            onClick={onUpgrade}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 transition-colors"
          >
            {isNp ? 'अपग्रेड गर्नुहोस्' : 'Upgrade to Operations'}
          </button>
        </div>
      </div>
    </div>
  );
}
