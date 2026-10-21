'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { api } from '../../../lib/api';
import { Note } from '../../../types';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { ConfirmModal } from '../../../components/ConfirmModal';
import { Alert } from '../../../components/Alert';
import {
  ArrowLeft,
  Clock,
  Edit3,
  Trash2,
  Calendar,
  Lock,
} from 'lucide-react';

export default function NoteDetailPage() {
  const params = useParams();
  const noteId = params?.id as string;
  const router = useRouter();

  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!noteId) return;

    api.notes
      .get(noteId)
      .then((res) => {
        setNote(res.note);
      })
      .catch((err: any) => {
        setError(err.message || 'Note not found or access denied.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [noteId]);

  const handleDelete = async () => {
    if (!noteId) return;
    try {
      setDeleting(true);
      await api.notes.delete(noteId);
      router.push('/notes');
    } catch (err: any) {
      setError(err.message || 'Failed to delete note');
      setDeleteModalOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner label="Loading note details..." size="lg" />;
  }

  if (error || !note) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-4">
        <Alert type="error" message={error || 'Note not found'} />
        <Link
          href="/notes"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to all notes
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/notes"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Notes
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href={`/notes/${note._id}/edit`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition"
          >
            <Edit3 className="w-4 h-4" />
            Edit
          </Link>
          <button
            onClick={() => setDeleteModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-sm font-semibold transition"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Note Card */}
      <article className="bg-white rounded-2xl border border-slate-200 shadow-xs p-8 space-y-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-semibold uppercase tracking-wider mb-3">
            <Lock className="w-3.5 h-3.5" />
            Private & Isolated
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {note.title}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Created: {new Date(note.createdAt).toLocaleString()}
            </span>
            {note.updatedAt && note.updatedAt !== note.createdAt && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Updated: {new Date(note.updatedAt).toLocaleString()}
              </span>
            )}
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100">
          <div className="prose prose-slate max-w-none text-slate-800 leading-relaxed whitespace-pre-wrap font-sans text-base">
            {note.content}
          </div>
        </div>
      </article>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Note"
        message={`Are you sure you want to delete "${note.title}"? This action cannot be undone.`}
        confirmLabel="Delete Note"
        isDestructive={true}
        isLoading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  );
}
