export default function PoweredBy() {
  return (
    <div className="w-full flex flex-col items-center justify-center py-3 px-4 border-t border-slate-100 gap-1">
      <p className="text-xs text-slate-400">
        Powered by{' '}
        <a
          href="https://zentaralabs.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-500 hover:text-slate-700 font-medium transition-colors"
        >
          Zentara Labs Pvt Ltd
        </a>
      </p>
      <div className="flex items-center gap-3">
        <a
          href="https://wa.me/9779761154213"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-slate-400 hover:text-emerald-600 transition-colors"
        >
          WhatsApp: 9761154213
        </a>
        <span className="text-slate-200">·</span>
        <a
          href="mailto:support@zentaralabs.com"
          className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
        >
          support@zentaralabs.com
        </a>
      </div>
    </div>
  );
}