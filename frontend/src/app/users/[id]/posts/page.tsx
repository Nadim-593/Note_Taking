'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '../../../../lib/api';
import { UserPostsResult, Post } from '../../../../types';
import { LoadingSpinner } from '../../../../components/LoadingSpinner';
import { Pagination } from '../../../../components/Pagination';
import { Alert } from '../../../../components/Alert';
import {
  ArrowLeft,
  FileText,
  User,
  Clock,
  Sparkles,
  Shield,
  Layers,
} from 'lucide-react';

export default function UserPostsPage() {
  const params = useParams();
  const userId = params?.id as string;

  const [data, setData] = useState<UserPostsResult | null>(null);
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(6);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const fetchPosts = useCallback(
    async (targetPage: number) => {
      if (!userId) return;
      try {
        setLoading(true);
        setError('');
        const res = await api.users.getPosts(userId, targetPage, limit);
        setData(res);
        setPage(res.page);
      } catch (err: any) {
        setError(err.message || 'Failed to load posts for this user.');
      } finally {
        setLoading(false);
      }
    },
    [userId, limit],
  );

  useEffect(() => {
    if (userId) {
      fetchPosts(page);
    }
  }, [fetchPosts, page, userId]);

  if (loading && !data) {
    return <LoadingSpinner label="Running $lookup pipeline on posts collection..." size="lg" />;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      {error && <Alert type="error" message={error} />}

      {data && (
        <>
          {/* Author Banner */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xl">
                {data.user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-extrabold text-slate-900">{data.user.name}</h1>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                    {data.user.role}
                  </span>
                </div>
                <div className="text-sm text-slate-500 mt-0.5">{data.user.email}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-100 text-xs font-semibold flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-600" />
                Pipeline $lookup Join
              </span>
            </div>
          </div>

          {/* Posts Grid */}
          <div className="flex items-center justify-between pt-2">
            <h2 className="text-lg font-bold text-slate-900">
              Published Posts ({data.totalItems})
            </h2>
          </div>

          {data.items.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
              <FileText className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700">No posts published yet</p>
              <p className="text-xs text-slate-400 mt-1">
                This user has not authored any public posts.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {data.items.map((post) => (
                <article
                  key={post._id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between"
                >
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 line-clamp-1 mb-2">
                      {post.title}
                    </h3>
                    <p className="text-sm text-slate-600 line-clamp-4 leading-relaxed whitespace-pre-wrap">
                      {post.content}
                    </p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      ID: {post._id.slice(-6)}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* Pagination */}
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            totalItems={data.totalItems}
            limit={data.limit}
            onPageChange={(newPage) => setPage(newPage)}
            disabled={loading}
          />
        </>
      )}
    </div>
  );
}
