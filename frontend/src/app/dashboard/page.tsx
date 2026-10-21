'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Note } from '../../types';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import {
  FileText,
  PlusCircle,
  Shield,
  Users,
  Layers,
  Sparkles,
  ArrowRight,
  Clock,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [recentNotes, setRecentNotes] = useState<Note[]>([]);
  const [totalNotes, setTotalNotes] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      api.notes
        .list(1, 5)
        .then((res) => {
          setRecentNotes(res.items);
          setTotalNotes(res.totalItems);
        })
        .catch(() => {
          // Handled gracefully in empty state
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [user, authLoading, router]);

  if (authLoading || (loading && user)) {
    return <LoadingSpinner label="Loading dashboard..." size="lg" />;
  }

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Welcome back, {user.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Authenticated as <span className="font-medium text-slate-700">{user.email}</span> (
            <span className="capitalize font-semibold text-indigo-600">{user.role}</span>)
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

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Link
          href="/notes"
          className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-indigo-300 hover:shadow-md transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-600">My Notes</span>
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 text-3xl font-black text-slate-900">{totalNotes}</div>
          <div className="mt-2 text-xs text-indigo-600 font-semibold flex items-center gap-1">
            View all notes <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          href="/profile"
          className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-emerald-300 hover:shadow-md transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-600">Interests</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-110 transition">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 text-3xl font-black text-slate-900">
            {user.interests?.length ?? 0}
          </div>
          <div className="mt-2 text-xs text-emerald-600 font-semibold flex items-center gap-1">
            Manage profile <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        {user.role === 'admin' && (
          <>
            <Link
              href="/admin/users"
              className="p-6 rounded-2xl bg-white border border-amber-200 shadow-xs hover:border-amber-400 hover:shadow-md transition group"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-600">User Management</span>
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 group-hover:scale-110 transition">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 text-sm font-bold text-slate-900">Admin Control</div>
              <div className="mt-2 text-xs text-amber-600 font-semibold flex items-center gap-1">
                Manage accounts <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>

            <Link
              href="/admin/interests"
              className="p-6 rounded-2xl bg-white border border-purple-200 shadow-xs hover:border-purple-400 hover:shadow-md transition group"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-600">Aggregations</span>
                <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 group-hover:scale-110 transition">
                  <Layers className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 text-sm font-bold text-slate-900">Grouped Report</div>
              <div className="mt-2 text-xs text-purple-600 font-semibold flex items-center gap-1">
                View pipeline data <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>
          </>
        )}
      </div>

      {/* Recent Notes Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Recent Notes</h2>
          <Link
            href="/notes"
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            View all ({totalNotes})
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {recentNotes.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700">No notes created yet</p>
            <p className="text-xs text-slate-500 mt-1">
              Create your first note to store your thoughts securely.
            </p>
            <Link
              href="/notes/new"
              className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Create First Note
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentNotes.map((note) => (
              <Link
                key={note._id}
                href={`/notes/${note._id}`}
                className="py-3.5 px-3 rounded-xl flex items-center justify-between hover:bg-slate-50 transition group"
              >
                <div className="min-w-0 pr-4">
                  <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition truncate">
                    {note.title}
                  </h3>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {note.content.substring(0, 100)}...
                  </p>
                </div>
                <div className="text-xs text-slate-400 shrink-0 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(note.createdAt).toLocaleDateString()}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
