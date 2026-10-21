'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { api } from '../../../../lib/api';
import { LoadingSpinner } from '../../../../components/LoadingSpinner';
import { Alert } from '../../../../components/Alert';
import { ArrowLeft, Save, Edit3 } from 'lucide-react';

export default function EditNotePage() {
  const params = useParams();
  const noteId = params?.id as string;
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!noteId) return;

    api.notes
      .get(noteId)
      .then((res) => {
        setTitle(res.note.title);
        setContent(res.note.content);
      })
      .catch((err: any) => {
        setError(err.message || 'Note not found or access denied.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [noteId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteId) return;
    setError('');

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle) {
      setError('Title cannot be empty.');
      return;
    }

    if (trimmedTitle.length > 200) {
      setError('Title cannot exceed 200 characters.');
      return;
    }

    if (!trimmedContent) {
      setError('Content cannot be empty.');
      return;
    }

    try {
      setSaving(true);
      await api.notes.update(noteId, {
        title: trimmedTitle,
        content: trimmedContent,
      });
      router.push(`/notes/${noteId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to update note.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner label="Loading note for editing..." size="lg" />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Link
        href={`/notes/${noteId}`}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Cancel and View Note
      </Link>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-8">
        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
            <Edit3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Edit Note</h1>
            <p className="text-sm text-slate-500">
              Update title or content. Ownership is strictly immutable.
            </p>
          </div>
        </div>

        {error && <Alert type="error" message={error} className="mb-6" />}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Note Title <span className="text-red-500">*</span>
              </label>
              <span
                className={`text-xs ${
                  title.length > 200 ? 'text-red-500 font-bold' : 'text-slate-400'
                }`}
              >
                {title.length} / 200
              </span>
            </div>
            <input
              type="text"
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Content <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={12}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full p-4 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Link
              href={`/notes/${noteId}`}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-xs transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Updating...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
