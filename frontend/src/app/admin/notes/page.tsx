'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../lib/api';
import { Note } from '../../../types';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { Pagination } from '../../../components/Pagination';
import { ConfirmModal } from '../../../components/ConfirmModal';
import { Alert } from '../../../components/Alert';
import {
  Layers,
  Clock,
  Trash2,
  Edit3,
  ExternalLink,
  User,
  Shield,
} from 'lucide-react';

export default function AdminNotesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [notes, setNotes] = useState<Note[]>([]);
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAllNotes = useCallback(async (targetPage: number) => {
    try {
      setLoading(true);
      setError('');
      const res = await api.notes.list(targetPage, limit);
      setNotes(res.items);
      setPage(res.page);
      setTotalPages(res.totalPages);
      setTotalItems(res.totalItems);
    } catch (err: any) {
      setError(err.message || 'Failed to load global notes');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/dashboard');
      return;
    }

    if (user?.role === 'admin') {
      fetchAllNotes(page);
    }
  }, [user, authLoading, router, page, fetchAllNotes]);

  const handleDeleteConfirm = async () => {
    if (!noteToDelete) return;
    try {
      setDeleting(true);
      await api.notes.delete(noteToDelete._id);
      setSuccess(`Note "${noteToDelete.title}" deleted.`);
      setDeleteModalOpen(false);
      setNoteToDelete(null);
      await fetchAllNotes(page);
    } catch (err: any) {
      setError(err.message || 'Failed to delete note');
    } finally {
      setDeleting(false);
    }
  };

  if (authLoading || (loading && notes.length === 0)) {
    return <LoadingSpinner label="Loading all notes across system..." size="lg" />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              All Notes (Global View)
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 uppercase tracking-wider flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Admin
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Administrative view of all notes across all accounts, supported by the dedicated single-field creation index.
          </p>
        </div>

        <div className="text-sm text-slate-600 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-xs">
          Total Global Notes: <span className="font-bold text-slate-900">{totalItems}</span>
        </div>
      </div>

      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th scope="col" className="px-6 py-4">Title & Preview</th>
                <th scope="col" className="px-6 py-4">Owner ID</th>
                <th scope="col" className="px-6 py-4">Created</th>
                <th scope="col" className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {notes.map((note) => (
                <tr key={note._id} className="hover:bg-slate-50/80 transition">
                  <td className="px-6 py-4 max-w-md">
                    <div className="font-bold text-slate-900 truncate">{note.title}</div>
                    <div className="text-xs text-slate-500 truncate mt-0.5">{note.content}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 font-mono text-xs text-slate-700">
                      <User className="w-3 h-3 text-slate-500" />
                      {note.owner}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                    {new Date(note.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/notes/${note._id}`}
                        title="View note"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                      <Link
                        href={`/notes/${note._id}/edit`}
                        title="Edit note"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition"
                      >
                        <Edit3 className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => {
                          setNoteToDelete(note);
                          setDeleteModalOpen(true);
                        }}
                        title="Delete note"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          limit={limit}
          onPageChange={(newPage) => setPage(newPage)}
          disabled={loading}
        />
      </div>

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Admin Note Deletion"
        message={`Are you sure you want to delete note "${noteToDelete?.title}"?`}
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
