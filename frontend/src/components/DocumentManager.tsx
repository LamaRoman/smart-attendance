'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileText, Image, Upload, Trash2, Eye, X,
  AlertCircle, CheckCircle2, FolderOpen, Loader2,
} from 'lucide-react';
import { t, Language } from '@/lib/i18n';

interface DocType {
  id: string;
  name: string;
  nameNp: string | null;
  isRequired: boolean;
}

interface Document {
  id: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  description: string | null;
  createdAt: string;
  documentType: { id: string; name: string; nameNp: string | null };
}

interface DocumentManagerProps {
  userId: string;
  language?: Language;
  readOnly?: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

const TYPE_COLORS = [
  'bg-blue-50 text-blue-700', 'bg-amber-50 text-amber-700',
  'bg-emerald-50 text-emerald-700', 'bg-indigo-50 text-indigo-700',
  'bg-rose-50 text-rose-700', 'bg-cyan-50 text-cyan-700',
  'bg-orange-50 text-orange-700', 'bg-teal-50 text-teal-700',
];

function getTypeColor(index: number) { return TYPE_COLORS[index % TYPE_COLORS.length]; }

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export default function DocumentManager({
  userId, language = 'ENGLISH', readOnly = false,
}: DocumentManagerProps) {
  const lang = language;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [docTypes, setDocTypes] = useState<DocType[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [description, setDescription] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const typeColorMap = useRef<Record<string, string>>({});
  let colorIdx = 0;
  const getColorForType = (typeId: string) => {
    if (!typeColorMap.current[typeId]) {
      typeColorMap.current[typeId] = getTypeColor(colorIdx++);
    }
    return typeColorMap.current[typeId];
  };

  const fetchDocTypes = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/org/document-types`, {
        credentials: 'include', headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });
      if (!res.ok) throw new Error('Failed to fetch document types');
      const data = await res.json();
      setDocTypes(data);
      if (data.length > 0 && !selectedTypeId) setSelectedTypeId(data[0].id);
    } catch (err: any) {
      console.error('Failed to load document types:', err);
    }
  }, []);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/documents/user/${userId}`, {
        credentials: 'include', headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });
      if (!res.ok) throw new Error('Failed to fetch documents');
      setDocuments(await res.json());
    } catch (err: any) {
      setError(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchDocTypes();
    fetchDocuments();
  }, [fetchDocTypes, fetchDocuments]);

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => { setError(''); setSuccess(''); }, 4000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const handleUpload = async () => {
    if (!selectedFile || !selectedTypeId) return;
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('documentTypeId', selectedTypeId);
      if (description.trim()) formData.append('description', description.trim());

      const res = await fetch(`${API_URL}/api/documents/user/${userId}`, {
        method: 'POST', credentials: 'include',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        body: formData,
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Upload failed');
      }
      setSuccess(t('documents.uploaded', lang));
      setSelectedFile(null);
      setDescription('');
      setShowUploadForm(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchDocuments();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handlePreview = async (doc: Document) => {
    setPreviewDoc(doc);
    setPreviewLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/documents/${doc.id}/download`, {
        credentials: 'include', headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });
      if (!res.ok) throw new Error('Preview failed');
      const data = await res.json();
      setPreviewUrl(data.url);
    } catch (err: any) {
      setError(err.message);
      setPreviewDoc(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => { setPreviewDoc(null); setPreviewUrl(null); };

  const handleDelete = async (docId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/documents/${docId}`, {
        method: 'DELETE', credentials: 'include',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Delete failed');
      }
      setSuccess(t('documents.deleted', lang));
      setDeleteId(null);
      fetchDocuments();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setShowUploadForm(true);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setSelectedFile(e.target.files[0]);
      setShowUploadForm(true);
    }
  };

  const blockContextMenu = (e: React.MouseEvent) => e.preventDefault();

  useEffect(() => {
    if (!previewDoc) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'p')) e.preventDefault();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [previewDoc]);

  const noTypes = docTypes.length === 0;

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">
          {t('documents.title', lang)}
        </h3>
        {!readOnly && !showUploadForm && !noTypes && (
          <button
            onClick={() => setShowUploadForm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            {t('documents.upload', lang)}
          </button>
        )}
      </div>

      {/* No types warning */}
      {noTypes && !loading && (
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-xs text-amber-700">{t('documents.noTypes', lang)}</p>
        </div>
      )}

      {/* Error / Success */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-rose-50 rounded-lg border border-rose-200">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <p className="text-xs text-rose-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <p className="text-xs text-emerald-700">{success}</p>
        </div>
      )}

      {/* Upload Form */}
      {!readOnly && showUploadForm && !noTypes && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-700">
              {t('documents.uploadNew', lang)}
            </span>
            <button
              onClick={() => { setShowUploadForm(false); setSelectedFile(null); }}
              className="p-1 hover:bg-slate-100 rounded-md transition-colors"
            >
              <X className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

          {/* Drop zone */}
          <div
            onDragEnter={handleDrag} onDragLeave={handleDrag}
            onDragOver={handleDrag} onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              dragActive ? 'border-slate-400 bg-slate-50' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <input
              ref={fileInputRef} type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              className="hidden"
            />
            {selectedFile ? (
              <div className="flex items-center justify-center gap-2">
                {selectedFile.type === 'application/pdf'
                  ? <FileText className="w-5 h-5 text-rose-500" />
                  : <Image className="w-5 h-5 text-blue-500" />}
                <span className="text-sm text-slate-700">{selectedFile.name}</span>
                <span className="text-xs text-slate-400">({formatBytes(selectedFile.size)})</span>
              </div>
            ) : (
              <div>
                <Upload className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500">{t('documents.dragOrClick', lang)}</p>
                <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG — Max 5MB</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                {t('documents.type', lang)}<span className="text-rose-400 ml-0.5">*</span>
              </label>
              <select
                value={selectedTypeId}
                onChange={(e) => setSelectedTypeId(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                {docTypes.map((dt) => (
                  <option key={dt.id} value={dt.id}>
                    {lang === 'NEPALI' && dt.nameNp ? dt.nameNp : dt.name}
                    {dt.isRequired ? ' *' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                {t('documents.description', lang)}
                <span className="text-slate-400 ml-1">({t('documents.optional', lang)})</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('documents.notePlaceholder', lang)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
          </div>

          <button
            onClick={handleUpload}
            disabled={!selectedFile || !selectedTypeId || uploading}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" />{t('documents.uploading', lang)}</>
            ) : (
              <><Upload className="w-3.5 h-3.5" />{t('documents.upload', lang)}</>
            )}
          </button>
        </div>
      )}

      {/* Document List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-slate-300 animate-spin" />
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-10">
          <FolderOpen className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-400">{t('documents.noDocuments', lang)}</p>
          <p className="text-xs text-slate-300 mt-1">{t('documents.uploadHint', lang)}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => {
            const isPdf = doc.mimeType === 'application/pdf';
            const typeName = lang === 'NEPALI' && doc.documentType.nameNp
              ? doc.documentType.nameNp
              : doc.documentType.name;
            const colorClass = getColorForType(doc.documentType.id);

            return (
              <div
                key={doc.id}
                className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors"
              >
                <button
                  onClick={() => handlePreview(doc)}
                  className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity ${isPdf ? 'bg-rose-50' : 'bg-blue-50'}`}
                >
                  {isPdf
                    ? <FileText className="w-4 h-4 text-rose-500" />
                    : <Image className="w-4 h-4 text-blue-500" />}
                </button>

                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium text-slate-800 truncate cursor-pointer hover:text-blue-600 transition-colors"
                    onClick={() => handlePreview(doc)}
                  >
                    {doc.originalName}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${colorClass}`}>
                      {typeName}
                    </span>
                    <span className="text-xs text-slate-400">{formatBytes(doc.fileSize)}</span>
                    <span className="text-xs text-slate-400">{formatDate(doc.createdAt)}</span>
                  </div>
                  {doc.description && (
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{doc.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handlePreview(doc)}
                    title={t('documents.view', lang)}
                    className="p-1.5 hover:bg-slate-100 rounded-md transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                  {!readOnly && (
                    deleteId === doc.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="px-2 py-1 bg-rose-500 text-white rounded-md text-xs font-medium hover:bg-rose-600 transition-colors"
                        >
                          {t('documents.confirmDelete', lang)}
                        </button>
                        <button
                          onClick={() => setDeleteId(null)}
                          className="p-1 hover:bg-slate-100 rounded-md transition-colors"
                        >
                          <X className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteId(doc.id)}
                        title={t('documents.delete', lang)}
                        className="p-1.5 hover:bg-rose-50 rounded-md transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-rose-500" />
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closePreview} />
          <div
            className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden mx-4 select-none"
            onContextMenu={blockContextMenu}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2 min-w-0">
                {previewDoc.mimeType === 'application/pdf'
                  ? <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                  : <Image className="w-4 h-4 text-blue-500 shrink-0" />}
                <span className="text-sm font-medium text-slate-800 truncate">{previewDoc.originalName}</span>
                <span className="text-xs text-slate-400 shrink-0">{formatBytes(previewDoc.fileSize)}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-slate-400 italic">{t('documents.viewOnly', lang)}</span>
                <button onClick={closePreview} className="p-1.5 hover:bg-slate-200 rounded-md transition-colors">
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>

            <div
              className="overflow-auto max-h-[calc(90vh-56px)] flex items-start justify-center bg-slate-100 p-4"
              onContextMenu={blockContextMenu}
            >
              {previewLoading ? (
                <div className="flex flex-col items-center gap-3 py-20">
                  <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
                  <p className="text-sm text-slate-400">{t('common.loading', lang)}</p>
                </div>
              ) : previewUrl ? (
                previewDoc.mimeType === 'application/pdf' ? (
                  <iframe
                    src={previewUrl + '#toolbar=0&navpanes=0'}
                    className="w-full h-[80vh] rounded-lg border border-slate-200 bg-white"
                    title={previewDoc.originalName}
                  />
                ) : (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt={previewDoc.originalName}
                      className="max-w-full rounded-lg shadow-md object-contain pointer-events-none"
                      draggable={false}
                      onContextMenu={blockContextMenu}
                    />
                    <div className="absolute inset-0 bg-transparent" onContextMenu={blockContextMenu} />
                  </div>
                )
              ) : (
                <p className="text-sm text-slate-400 py-20">{t('documents.previewUnavailable', lang)}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}