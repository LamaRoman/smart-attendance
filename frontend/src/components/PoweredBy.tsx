export default function PoweredBy() {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-1 border-t border-slate-100 px-4 py-3">
      <p className="text-xs text-slate-400">
        Powered by{' '}
        <a
          href="https://zentaralabs.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-slate-500 transition-colors hover:text-slate-700"
        >
          Zentara Labs Pvt Ltd
        </a>
      </p>
      <div className="flex items-center gap-3">
        <a
          href="https://wa.me/9779761154213"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-slate-400 transition-colors hover:text-emerald-600"
        >
          WhatsApp: 9761154213
        </a>
        <span className="text-slate-200">·</span>
        <a
          href="mailto:support@zentaralabs.com"
          className="text-[11px] text-slate-400 transition-colors hover:text-slate-600"
        >
          support@zentaralabs.com
        </a>
      </div>
    </div>
  )
}
