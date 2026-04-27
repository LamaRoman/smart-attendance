'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  FileText,
  Image as ImageIcon,
  Upload,
  Trash2,
  Eye,
  X,
  AlertCircle,
  CheckCircle2,
  FolderOpen,
  Loader2,
} from 'lucide-react'
import { t, Language } from '@/lib/i18n'

interface DocType {
  id: string
  name: string
  nameNp: string | null
  isRequired: boolean
}

interface Document {
  id: string
  originalName: string
  mimeType: string
  fileSize: number
  description: string | null
  createdAt: string
  documentType: { id: string; name: string; nameNp: string | null }
}

interface DocumentManagerProps {
  userId: string
  language?: Language
  readOnly?: boolean
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'

const TYPE_COLORS = [
  'bg-blue-50 text-blue-700',
  'bg-amber-50 text-amber-700',
  'bg-emerald-50 text-emerald-700',
  'bg-indigo-50 text-indigo-700',
  'bg-rose-50 text-rose-700',
  'bg-cyan-50 text-cyan-700',
  'bg-orange-50 text-orange-700',
  'bg-teal-50 text-teal-700',
]

function getTypeColor(index: number) {
  return TYPE_COLORS[index % TYPE_COLORS.length]
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function DocumentManager({
  userId,
  language = 'ENGLISH',
  readOnly = false,
}: DocumentManagerProps) {
  const lang = language
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [docTypes, setDocTypes] = useState<DocType[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedTypeId, setSelectedTypeId] = useState('')
  const [description, setDescription] = useState('')
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  // Deterministic color assignment — same typeId always gets the same color,
  // no state, safe to call during render.
  const getColorForType = (typeId: string): string => {
    let hash = 0
    for (let i = 0; i < typeId.length; i++) {
      hash = (hash << 5) - hash + typeId.charCodeAt(i)
      hash |= 0
    }
    return TYPE_COLORS[Math.abs(hash) % TYPE_COLORS.length]
  }

  const fetchDocTypes = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/org/document-types`, {
        credentials: 'include',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      })
      if (!res.ok) throw new Error('Failed to fetch document types')
      const data = await res.json()
      setDocTypes(data)
      if (data.length > 0 && !selectedTypeId) setSelectedTypeId(data[0].id)
    } catch (err: any) {
      console.error('Failed to load document types:', err)
    }
  }, [])

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/api/v1/documents/user/${userId}`, {
        credentials: 'include',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      })
      if (!res.ok) throw new Error('Failed to fetch documents')
      setDocuments(await res.json())
    } catch (err: any) {
      setError(err.message || 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchDocTypes()
    fetchDocuments()
  }, [fetchDocTypes, fetchDocuments])

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('')
        setSuccess('')
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [error, success])

  const handleUpload = async () => {
    if (!selectedFile || !selectedTypeId) return
    setUploading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('documentTypeId', selectedTypeId)
      if (description.trim()) formData.append('description', description.trim())

      const res = await fetch(`${API_URL}/api/v1/documents/user/${userId}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        body: formData,
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Upload failed')
      }
      setSuccess(t('documents.uploaded', lang))
      setSelectedFile(null)
      setDescription('')
      setShowUploadForm(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
      fetchDocuments()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const handlePreview = async (doc: Document) => {
    setPreviewDoc(doc)
    setPreviewLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/v1/documents/${doc.id}/download`, {
        credentials: 'include',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      })
      if (!res.ok) throw new Error('Preview failed')
      const data = await res.json()
      setPreviewUrl(data.url)
    } catch (err: any) {
      setError(err.message)
      setPreviewDoc(null)
    } finally {
      setPreviewLoading(false)
    }
  }

  const closePreview = () => {
    setPreviewDoc(null)
    setPreviewUrl(null)
  }

  const handleDelete = async (docId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/documents/${docId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Delete failed')
      }
      setSuccess(t('documents.deleted', lang))
      setDeleteId(null)
      fetchDocuments()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(e.type === 'dragenter' || e.type === 'dragover')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files?.[0]) {
      setSelectedFile(e.dataTransfer.files[0])
      setShowUploadForm(true)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setSelectedFile(e.target.files[0])
      setShowUploadForm(true)
    }
  }

  const blockContextMenu = (e: React.MouseEvent) => e.preventDefault()

  useEffect(() => {
    if (!previewDoc) return
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'p')) e.preventDefault()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [previewDoc])

  const noTypes = docTypes.length === 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">{t('documents.title', lang)}</h3>
        {!readOnly && !showUploadForm && !noTypes && (
          <button
            onClick={() => setShowUploadForm(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-800"
          >
            <Upload className="h-3.5 w-3.5" />
            {t('documents.upload', lang)}
          </button>
        )}
      </div>

      {/* No types warning */}
      {noTypes && !loading && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs text-amber-700">{t('documents.noTypes', lang)}</p>
        </div>
      )}

      {/* Error / Success */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
          <p className="text-xs text-rose-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
          <p className="text-xs text-emerald-700">{success}</p>
        </div>
      )}

      {/* Upload Form */}
      {!readOnly && showUploadForm && !noTypes && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-700">
              {t('documents.uploadNew', lang)}
            </span>
            <button
              onClick={() => {
                setShowUploadForm(false)
                setSelectedFile(null)
              }}
              className="rounded-md p-1 transition-colors hover:bg-slate-100"
            >
              <X className="h-3.5 w-3.5 text-slate-400" />
            </button>
          </div>

          {/* Drop zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
              dragActive
                ? 'border-slate-400 bg-slate-50'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              className="hidden"
            />
            {selectedFile ? (
              <div className="flex items-center justify-center gap-2">
                {selectedFile.type === 'application/pdf' ? (
                  <FileText className="h-5 w-5 text-rose-500" />
                ) : (
                  <ImageIcon className="h-5 w-5 text-blue-500" />
                )}
                <span className="text-sm text-slate-700">{selectedFile.name}</span>
                <span className="text-xs text-slate-400">({formatBytes(selectedFile.size)})</span>
              </div>
            ) : (
              <div>
                <Upload className="mx-auto mb-2 h-6 w-6 text-slate-300" />
                <p className="text-xs text-slate-500">{t('documents.dragOrClick', lang)}</p>
                <p className="mt-1 text-xs text-slate-400">PDF, JPG, PNG — Max 5MB</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                {t('documents.type', lang)}
                <span className="ml-0.5 text-rose-400">*</span>
              </label>
              <select
                value={selectedTypeId}
                onChange={(e) => setSelectedTypeId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
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
              <label className="mb-1 block text-xs font-medium text-slate-500">
                {t('documents.description', lang)}
                <span className="ml-1 text-slate-400">({t('documents.optional', lang)})</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('documents.notePlaceholder', lang)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
          </div>

          <button
            onClick={handleUpload}
            disabled={!selectedFile || !selectedTypeId || uploading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t('documents.uploading', lang)}
              </>
            ) : (
              <>
                <Upload className="h-3.5 w-3.5" />
                {t('documents.upload', lang)}
              </>
            )}
          </button>
        </div>
      )}

      {/* Document List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
        </div>
      ) : documents.length === 0 ? (
        <div className="py-10 text-center">
          <FolderOpen className="mx-auto mb-3 h-10 w-10 text-slate-200" />
          <p className="text-sm font-medium text-slate-400">{t('documents.noDocuments', lang)}</p>
          <p className="mt-1 text-xs text-slate-300">{t('documents.uploadHint', lang)}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => {
            const isPdf = doc.mimeType === 'application/pdf'
            const typeName =
              lang === 'NEPALI' && doc.documentType.nameNp
                ? doc.documentType.nameNp
                : doc.documentType.name
            const colorClass = getColorForType(doc.documentType.id)

            return (
              <div
                key={doc.id}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:border-slate-300"
              >
                <button
                  onClick={() => handlePreview(doc)}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-opacity hover:opacity-70 ${isPdf ? 'bg-rose-50' : 'bg-blue-50'}`}
                >
                  {isPdf ? (
                    <FileText className="h-4 w-4 text-rose-500" />
                  ) : (
                    <ImageIcon className="h-4 w-4 text-blue-500" />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <p
                    className="cursor-pointer truncate text-sm font-medium text-slate-800 transition-colors hover:text-blue-600"
                    onClick={() => handlePreview(doc)}
                  >
                    {doc.originalName}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${colorClass}`}
                    >
                      {typeName}
                    </span>
                    <span className="text-xs text-slate-400">{formatBytes(doc.fileSize)}</span>
                    <span className="text-xs text-slate-400">{formatDate(doc.createdAt)}</span>
                  </div>
                  {doc.description && (
                    <p className="mt-0.5 truncate text-xs text-slate-400">{doc.description}</p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => handlePreview(doc)}
                    title={t('documents.view', lang)}
                    className="rounded-md p-1.5 transition-colors hover:bg-slate-100"
                  >
                    <Eye className="h-3.5 w-3.5 text-slate-500" />
                  </button>
                  {!readOnly &&
                    (deleteId === doc.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="rounded-md bg-rose-500 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-rose-600"
                        >
                          {t('documents.confirmDelete', lang)}
                        </button>
                        <button
                          onClick={() => setDeleteId(null)}
                          className="rounded-md p-1 transition-colors hover:bg-slate-100"
                        >
                          <X className="h-3.5 w-3.5 text-slate-400" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteId(doc.id)}
                        title={t('documents.delete', lang)}
                        className="rounded-md p-1.5 transition-colors hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-slate-400 hover:text-rose-500" />
                      </button>
                    ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closePreview} />
          <div
            className="relative mx-4 max-h-[90vh] w-full max-w-4xl select-none overflow-hidden rounded-xl bg-white shadow-2xl"
            onContextMenu={blockContextMenu}
          >
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
              <div className="flex min-w-0 items-center gap-2">
                {previewDoc.mimeType === 'application/pdf' ? (
                  <FileText className="h-4 w-4 shrink-0 text-rose-500" />
                ) : (
                  <ImageIcon className="h-4 w-4 shrink-0 text-blue-500" />
                )}
                <span className="truncate text-sm font-medium text-slate-800">
                  {previewDoc.originalName}
                </span>
                <span className="shrink-0 text-xs text-slate-400">
                  {formatBytes(previewDoc.fileSize)}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs italic text-slate-400">
                  {t('documents.viewOnly', lang)}
                </span>
                <button
                  onClick={closePreview}
                  className="rounded-md p-1.5 transition-colors hover:bg-slate-200"
                >
                  <X className="h-4 w-4 text-slate-500" />
                </button>
              </div>
            </div>

            <div
              className="flex max-h-[calc(90vh-56px)] items-start justify-center overflow-auto bg-slate-100 p-4"
              onContextMenu={blockContextMenu}
            >
              {previewLoading ? (
                <div className="flex flex-col items-center gap-3 py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                  <p className="text-sm text-slate-400">{t('common.loading', lang)}</p>
                </div>
              ) : previewUrl ? (
                previewDoc.mimeType === 'application/pdf' ? (
                  <iframe
                    src={previewUrl + '#toolbar=0&navpanes=0'}
                    className="h-[80vh] w-full rounded-lg border border-slate-200 bg-white"
                    title={previewDoc.originalName}
                  />
                ) : (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt={previewDoc.originalName}
                      className="pointer-events-none max-w-full rounded-lg object-contain shadow-md"
                      draggable={false}
                      onContextMenu={blockContextMenu}
                    />
                    <div
                      className="absolute inset-0 bg-transparent"
                      onContextMenu={blockContextMenu}
                    />
                  </div>
                )
              ) : (
                <p className="py-20 text-sm text-slate-400">
                  {t('documents.previewUnavailable', lang)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
