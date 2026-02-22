'use client';

import React from 'react';
import { X, FileText } from 'lucide-react';
import DocumentManager from './DocumentManager';

interface UserDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  language?: 'ENGLISH' | 'NEPALI';
}

export default function UserDocumentsModal({
  isOpen,
  onClose,
  userId,
  userName,
  language = 'ENGLISH',
}: UserDocumentsModalProps) {
  const isNp = language === 'NEPALI';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[80vh] overflow-hidden mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900">
              {isNp ? `${userName} को कागजातहरू` : `${userName}'s Documents`}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-md transition-colors">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto max-h-[calc(80vh-64px)]">
          <DocumentManager userId={userId} language={language} />
        </div>
      </div>
    </div>
  );
}