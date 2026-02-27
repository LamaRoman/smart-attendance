'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  Shield,
  ShieldOff,
} from 'lucide-react';

// --€--€--€ Types --€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€

interface DocType {
  id: string;
  name: string;
  nameNp: string | null;
  description: string | null;
  isRequired: boolean;
  isActive: boolean;
  createdAt: string;
  _count: { documents: number };
}

interface DocumentTypeManagerProps {
  language?: 'ENGLISH' | 'NEPALI';
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

// --€--€--€ Component --€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€--€

export default function DocumentTypeManager({ language = 'ENGLISH' }: DocumentTypeManagerProps) {
  const isNp = language === 'NEPALI';

  const [types, setTypes] = useState<DocType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create/Edit form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formNameNp, setFormNameNp] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formRequired, setFormRequired] = useState(false);
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // --€--€ Fetch --€--€
  const fetchTypes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/org/document-types?all=true`, { credentials: 'include', headers: { 'X-Requested-With': 'XMLHttpRequest' } });
      if (!res.ok) throw new Error('Failed to load');
      setTypes(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTypes(); }, [fetchTypes]);

  useEffect(() => {
    if (error || success) {
      const t = setTimeout(() => { setError(''); setSuccess(''); }, 4000);
      return () => clearTimeout(t);
    }
  }, [error, success]);

  // --€--€ Form helpers --€--€
  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormName('');
    setFormNameNp('');
    setFormDesc('');
    setFormRequired(false);
  };

  const startEdit = (t: DocType) => {
    setEditingId(t.id);
    setFormName(t.name);
    setFormNameNp(t.nameNp || '');
    setFormDesc(t.description || '');
    setFormRequired(t.isRequired);
    setShowForm(true);
  };

  // --€--€ Save (create or update) --€--€
  const handleSave = async () => {
    if (!formName.trim()) {
      setError(isNp ? 'à¤¨à¤¾à¤® à¤†à¤µà¤¶à¥à¤¯à¤• à¤›' : 'Name is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const body = {
        name: formName.trim(),
        nameNp: formNameNp.trim() || undefined,
        description: formDesc.trim() || undefined,
        isRequired: formRequired,
      };

      const url = editingId
        ? `${API_URL}/api/org/document-types/${editingId}`
        : `${API_URL}/api/org/document-types`;

      const res = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Save failed');
      }

      setSuccess(
        editingId
          ? (isNp ? 'à¤•à¤¾à¤—à¤œà¤¾à¤¤ à¤ªà¥à¤°à¤•à¤¾à¤° à¤…à¤ªà¤¡à¥‡à¤Ÿ à¤­à¤¯à¥‹' : 'Document type updated')
          : (isNp ? 'à¤•à¤¾à¤—à¤œà¤¾à¤¤ à¤ªà¥à¤°à¤•à¤¾à¤° à¤¸à¤¿à¤°à¥à¤œà¤¨à¤¾ à¤­à¤¯à¥‹' : 'Document type created')
      );
      resetForm();
      fetchTypes();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // --€--€ Toggle active --€--€
  const handleToggleActive = async (t: DocType) => {
    try {
      const res = await fetch(`${API_URL}/api/org/document-types/${t.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ isActive: !t.isActive }),
      });
      if (!res.ok) throw new Error('Failed');
      fetchTypes();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // --€--€ Delete --€--€
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/org/document-types/${id}`, {
        method: 'DELETE',
        credentials: 'include', headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Delete failed');
      }
      setSuccess(isNp ? 'à¤•à¤¾à¤—à¤œà¤¾à¤¤ à¤ªà¥à¤°à¤•à¤¾à¤° à¤®à¥‡à¤Ÿà¤¾à¤‡à¤¯à¥‹' : 'Document type deleted');
      setDeleteId(null);
      fetchTypes();
    } catch (err: any) {
      setError(err.message);
      setDeleteId(null);
    }
  };

  // --€--€ Render --€--€
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            {isNp ? 'à¤•à¤¾à¤—à¤œà¤¾à¤¤ à¤ªà¥à¤°à¤•à¤¾à¤°à¤¹à¤°à¥‚' : 'Document Types'}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {isNp
              ? 'à¤•à¤°à¥à¤®à¤šà¤¾à¤°à¥€à¤¹à¤°à¥‚à¤²à¥‡ à¤…à¤ªà¤²à¥‹à¤¡ à¤—à¤°à¥à¤¨à¥à¤ªà¤°à¥à¤¨à¥‡ à¤•à¤¾à¤—à¤œà¤¾à¤¤à¤•à¤¾ à¤ªà¥à¤°à¤•à¤¾à¤° à¤ªà¤°à¤¿à¤­à¤¾à¤·à¤¿à¤¤ à¤—à¤°à¥à¤¨à¥à¤¹à¥‹à¤¸à¥'
              : 'Define the types of documents employees can upload'}
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            {isNp ? 'à¤¨à¤¯à¤¾à¤ à¤ªà¥à¤°à¤•à¤¾à¤°' : 'Add Type'}
          </button>
        )}
      </div>

      {/* Alerts */}
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

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-700">
              {editingId
                ? (isNp ? 'à¤•à¤¾à¤—à¤œà¤¾à¤¤ à¤ªà¥à¤°à¤•à¤¾à¤° सम्पादन' : 'Edit Document Type')
                : (isNp ? 'à¤¨à¤¯à¤¾à¤ à¤•à¤¾à¤—à¤œà¤¾à¤¤ à¤ªà¥à¤°à¤•à¤¾à¤°' : 'New Document Type')}
            </span>
            <button onClick={resetForm} className="p-1 hover:bg-slate-100 rounded-md transition-colors">
              <X className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                {isNp ? 'à¤¨à¤¾à¤® (à¤…à¤‚à¤—à¥à¤°à¥‡à¤œà¥€)' : 'Name (English)'}
                <span className="text-rose-400 ml-0.5">*</span>
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Police Clearance"
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                {isNp ? 'à¤¨à¤¾à¤® (à¤¨à¥‡à¤ªà¤¾à¤²à¥€)' : 'Name (Nepali)'}
                <span className="text-slate-400 ml-1">({isNp ? 'à¤à¤šà¥à¤›à¤¿à¤•' : 'optional'})</span>
              </label>
              <input
                type="text"
                value={formNameNp}
                onChange={(e) => setFormNameNp(e.target.value)}
                placeholder="e.g. à¤ªà¥à¤°à¤¹à¤°à¥€ à¤ªà¥à¤°à¤®à¤¾à¤£à¤ªà¤¤à¥à¤°"
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              {isNp ? 'विवरण' : 'Description'}
            </label>
            <input
              type="text"
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder={isNp ? 'à¤•à¤°à¥à¤®à¤šà¤¾à¤°à¥€à¤¹à¤°à¥‚à¤•à¤¾ à¤²à¤¾à¤—à¤¿ à¤¨à¤¿à¤°à¥à¤¦à¥‡à¤¶à¤¨' : 'Instructions for employees'}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formRequired}
              onChange={(e) => setFormRequired(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-200"
            />
            <span className="text-xs text-slate-600">
              {isNp ? 'à¤…à¤¨à¤¿à¤µà¤¾à¤°à¥à¤¯ à¤•à¤¾à¤—à¤œà¤¾à¤¤' : 'Required document'}
              <span className="text-slate-400 ml-1">
                ({isNp ? 'à¤¸à¤¬à¥ˆ à¤•à¤°à¥à¤®à¤šà¤¾à¤°à¥€à¤¹à¤°à¥‚à¤²à¥‡ à¤…à¤ªà¤²à¥‹à¤¡ à¤—à¤°à¥à¤¨à¥à¤ªà¤°à¥à¤›' : 'all employees must upload this'})
              </span>
            </span>
          </label>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !formName.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              {isNp ? 'à¤¸à¥‡à¤­ à¤—à¤°à¥à¤¨à¥à¤¹à¥‹à¤¸à¥' : 'Save'}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
            >
              {isNp ? 'à¤°à¤¦à¥à¤¦ à¤—à¤°à¥à¤¨à¥à¤¹à¥‹à¤¸à¥' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {/* Type List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-slate-300 animate-spin" />
        </div>
      ) : types.length === 0 ? (
        <div className="text-center py-10">
          <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-400">
            {isNp ? 'à¤•à¥à¤¨à¥ˆ à¤•à¤¾à¤—à¤œà¤¾à¤¤ à¤ªà¥à¤°à¤•à¤¾à¤° à¤›à¥ˆà¤¨' : 'No document types yet'}
          </p>
          <p className="text-xs text-slate-300 mt-1">
            {isNp
              ? '"à¤¨à¤¯à¤¾à¤ à¤ªà¥à¤°à¤•à¤¾à¤°" à¤¥à¤¿à¤šà¥à¤¨à¥à¤¹à¥‹à¤¸à¥ -- à¤œà¤¸à¥à¤¤à¥ˆ à¤¨à¤¾à¤—à¤°à¤¿à¤•à¤¤à¤¾, à¤ªà¥à¤¯à¤¾à¤¨ à¤•à¤¾à¤°à¥à¤¡, à¤®à¥‡à¤¡à¤¿à¤•à¤² à¤°à¤¿à¤ªà¥‹à¤°à¥à¤Ÿ'
              : 'Click "Add Type" to create ones like Citizenship, PAN Card, Medical Report'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {types.map((t) => (
            <div
              key={t.id}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                t.isActive
                  ? 'bg-white border-slate-200 hover:border-slate-300'
                  : 'bg-slate-50 border-slate-100 opacity-60'
              }`}
            >
              {/* Icon */}
              <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                t.isRequired ? 'bg-amber-50' : 'bg-slate-100'
              }`}>
                {t.isRequired ? (
                  <Shield className="w-4 h-4 text-amber-500" />
                ) : (
                  <FileText className="w-4 h-4 text-slate-400" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-800">{t.name}</p>
                  {t.nameNp && <span className="text-xs text-slate-400">({t.nameNp})</span>}
                  {t.isRequired && (
                    <span className="inline-flex px-1.5 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-600">
                      {isNp ? 'à¤…à¤¨à¤¿à¤µà¤¾à¤°à¥à¤¯' : 'Required'}
                    </span>
                  )}
                  {!t.isActive && (
                    <span className="inline-flex px-1.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500">
                      {isNp ? 'à¤¨à¤¿à¤·à¥à¤•à¥à¤°à¤¿à¤¯' : 'Inactive'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {t.description && (
                    <span className="text-xs text-slate-400 truncate">{t.description}</span>
                  )}
                  <span className="text-xs text-slate-400">
                    {t._count.documents} {isNp ? 'à¤•à¤¾à¤—à¤œà¤¾à¤¤' : 'doc(s)'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleToggleActive(t)}
                  className="p-1.5 hover:bg-slate-100 rounded-md transition-colors"
                  title={t.isActive ? 'Deactivate' : 'Activate'}
                >
                  {t.isActive ? (
                    <ShieldOff className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <Shield className="w-3.5 h-3.5 text-emerald-500" />
                  )}
                </button>
                <button
                  onClick={() => startEdit(t)}
                  className="p-1.5 hover:bg-slate-100 rounded-md transition-colors"
                  title={isNp ? 'सम्पादन' : 'Edit'}
                >
                  <Pencil className="w-3.5 h-3.5 text-slate-400" />
                </button>
                {deleteId === t.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="px-2 py-1 bg-rose-500 text-white rounded-md text-xs font-medium hover:bg-rose-600 transition-colors"
                    >
                      {isNp ? 'à¤ªà¤•à¥à¤•à¤¾?' : 'Confirm'}
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
                    onClick={() => setDeleteId(t.id)}
                    className="p-1.5 hover:bg-rose-50 rounded-md transition-colors"
                    title={isNp ? 'à¤®à¥‡à¤Ÿà¤¾à¤‰à¤¨à¥à¤¹à¥‹à¤¸à¥' : 'Delete'}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-rose-500" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
