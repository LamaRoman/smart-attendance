'use client'

import React from 'react'
import { X, FileText } from 'lucide-react'
import DocumentManager from './DocumentManager'

interface UserDocumentsModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  userName: string
  language?: 'ENGLISH' | 'NEPALI'
}

export default function UserDocumentsModal({
  isOpen,
  onClose,
  userId,
  userName,
  language = 'ENGLISH',
}: UserDocumentsModalProps) {
  const isNp = language === 'NEPALI'

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative mx-4 max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900">
              {isNp ? `${userName} को कागजातहरू` : `${userName}'s Documents`}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 transition-colors hover:bg-slate-100"
          >
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[calc(80vh-64px)] overflow-y-auto p-5">
          <DocumentManager userId={userId} language={language} />
        </div>
      </div>
    </div>
  )
}
