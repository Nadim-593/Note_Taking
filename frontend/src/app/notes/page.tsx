'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Note } from '../../types';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Pagination } from '../../components/Pagination';
import { ConfirmModal } from '../../components/ConfirmModal';
import { Alert } from '../../components/Alert';
import {
  FileText,
  PlusCircle,
  Clock,
  Trash2,
  Edit3,
  ExternalLink,
} from 'lucide-react';

export default function NotesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [notes, setNotes] = useState<Note[]>([]);
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(9);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchNotes = useCallback(async (targetPage: number) => {
    try {
      setLoading(true);
      setError('');
      const res = await api.notes.list(targetPage, limit);
      setNotes(res.items);
      setPage(res.page);
      setTotalPages(res.totalPages);
      setTotalItems(res.totalItems);
    } catch (err: any) {
      setError(err.message || 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchNotes(page);
    }
  }, [user, authLoading, router, page, fetchNotes]);

  const handleDeleteConfirm = async () => {
    if (!noteToDelete) return;
    try {
      setDeleting(true);
      await api.notes.delete(noteToDelete._id);
      setSuccess(`Note "${noteToDelete.title}" deleted successfully.`);
      setDeleteModalOpen(false);
      setNoteToDelete(null);
      // Refresh current page
      await fetchNotes(page);
    } catch (err: any) {
      setError(err.message || 'Failed to delete note');
    } finally {
      setDeleting(false);
    }
  };

  if (authLoading || (loading && notes.length === 0)) {
    return <LoadingSpinner label="Loading your notes..." size="lg" />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            My Notes
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Encrypted personal notes with query-level owner isolation.
          </p>
        </div>

        <Link
          href="/notes/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-xs transition"
        >
          <PlusCircle className="w-4 h-4" />
          Create Note
        </Link>
      </div>

      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      {/* Notes Grid */}
      {notes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-lg font-bold text-slate-900">No notes yet</h3>
          <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
            You haven&apos;t created any notes. Click below to add your first confidential note.
          </p>
          <Link
            href="/notes/new"
            className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-xs transition"
          >
            <PlusCircle className="w-4 h-4" />
            Create First Note
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {notes.map((note) => (
            <div
              key={note._id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-300 hover:shadow-md transition flex flex-col justify-between p-6 group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-lg font-bold text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition">
                    {note.title}
                  </h3>
                </div>
                <p className="text-sm text-slate-600 line-clamp-4 leading-relaxed mb-4">
                  {note.content}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(note.createdAt).toLocaleDateString()}
                </span>

                <div className="flex items-center gap-1">
                  <Link
                    href={`/notes/${note._id}`}
                    title="View note"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                  <Link
                    href={`/notes/${note._id}/edit`}
                    title="Edit note"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition"
                  >
                    <Edit3 className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => {
                      setNoteToDelete(note);
                      setDeleteModalOpen(true);
                    }}
                    title="Delete note"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      <Pagination
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        limit={limit}
        onPageChange={(newPage) => setPage(newPage)}
        disabled={loading}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Note"
        message={`Are you sure you want to delete "${noteToDelete?.title}"? This action cannot be undone.`}
        confirmLabel="Delete Note"
        isDestructive={true}
        isLoading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeleteModalOpen(false);
          setNoteToDelete(null);
        }}
      />
    </div>
  );
}
