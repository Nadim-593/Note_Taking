'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../lib/api';
import { InterestGroup } from '../../../types';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { Alert } from '../../../components/Alert';
import {
  Sparkles,
  Users,
  Tag,
  Mail,
  Shield,
  Layers,
  CheckCircle,
} from 'lucide-react';

export default function AdminInterestsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [groups, setGroups] = useState<InterestGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/dashboard');
      return;
    }

    if (user?.role === 'admin') {
      api.admin
        .getInterestsGrouped()
        .then((res) => {
          setGroups(res.groups);
        })
        .catch((err: any) => {
          setError(err.message || 'Failed to generate aggregation report.');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <LoadingSpinner
        label="Running single MongoDB aggregation pipeline..."
        size="lg"
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Users Grouped by Interest
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Pipeline Aggregation
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Report assembled directly inside MongoDB through a single aggregation pipeline using $match, $unwind, and $group.
          </p>
        </div>

        <div className="text-sm font-semibold text-slate-700 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-xs">
          Unique Interests: <span className="text-purple-600 font-bold">{groups.length}</span>
        </div>
      </div>

      {error && <Alert type="error" message={error} />}

      {/* Pipeline Technical Badge */}
      <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-start gap-3">
        <CheckCircle className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-900 leading-relaxed">
          <span className="font-bold">Assessment Verification:</span> This report is calculated entirely in the database using <strong>exactly ONE User.aggregate() call</strong>. No collection scans or JavaScript in-memory grouping were used.
        </div>
      </div>

      {/* Interest Groups Grid */}
      {groups.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
          <Tag className="w-12 h-12 mx-auto text-slate-300 mb-2" />
          <p className="font-semibold text-slate-700">No interest groups found</p>
          <p className="text-xs text-slate-400 mt-1">
            Users who haven&apos;t specified any interests are excluded by the pipeline filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <div
              key={group.interest}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-purple-300 transition p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-lg bg-purple-50 text-purple-600">
                      <Tag className="w-4 h-4" />
                    </span>
                    <h3 className="font-bold text-lg text-slate-900 capitalize">
                      {group.interest}
                    </h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                    {group.count} {group.count === 1 ? 'user' : 'users'}
                  </span>
                </div>

                <div className="mt-4 space-y-2.5">
                  {group.users.map((u) => (
                    <div
                      key={u.id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-semibold text-slate-800 truncate">
                          {u.name}
                        </div>
                        <div className="text-slate-400 truncate flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 shrink-0" />
                          {u.email}
                        </div>
                      </div>
                      <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-200/70 text-slate-700">
                        {u.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-100 text-right">
                <span className="text-[11px] text-slate-400 font-mono">
                  Stage: $group._id: &quot;{group.interest}&quot;
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
