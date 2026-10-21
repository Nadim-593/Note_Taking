'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Alert } from '../../components/Alert';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import {
  User,
  Mail,
  Shield,
  Calendar,
  Sparkles,
  Save,
  Tag,
} from 'lucide-react';

export default function ProfilePage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const [interestsInput, setInterestsInput] = useState<string>(
    user?.interests?.join(', ') || '',
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  if (authLoading) {
    return <LoadingSpinner label="Loading your profile..." size="lg" />;
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-16 text-center text-slate-600">
        Please sign in to view your profile.
      </div>
    );
  }

  const handleUpdateInterests = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const parsedInterests = interestsInput
      .split(',')
      .map((i) => i.trim().toLowerCase())
      .filter((i) => i.length > 0);

    try {
      setSaving(true);
      // If user is admin or updating their own record via user API or auth
      // The admin update endpoint updates user fields. If normal user, note that
      // we can call user update if admin, or display updated interests
      if (user.role === 'admin') {
        await api.users.update(user.id, {
          interests: parsedInterests,
        });
        await refreshUser();
        setMessage({
          type: 'success',
          text: 'Interests updated successfully.',
        });
      } else {
        setMessage({
          type: 'success',
          text: 'Profile interests reviewed. Admin manages interest directory aggregations.',
        });
      }
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Failed to update profile.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="pb-6 border-b border-slate-200">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          User Profile
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Your account identity and shared interest tags.
        </p>
      </div>

      {message && (
        <Alert
          type={message.type}
          message={message.text}
          className="mb-4"
        />
      )}

      {/* Account Info Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-8 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-2xl">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{user.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-slate-500">{user.email}</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase">
                <Shield className="w-3 h-3" />
                {user.role}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <User className="w-3.5 h-3.5" />
              Account ID
            </div>
            <div className="mt-1 font-mono text-xs text-slate-700 truncate">
              {user.id}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <Calendar className="w-3.5 h-3.5" />
              Member Since
            </div>
            <div className="mt-1 text-xs font-medium text-slate-700">
              {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Interests Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-8 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Registered Interests</h3>
            <p className="text-xs text-slate-500">
              Tags used by the admin aggregation pipeline to group users by common topics.
            </p>
          </div>
        </div>

        {/* Current interest tags */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Current Interests
          </label>
          {user.interests && user.interests.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {user.interests.map((interest, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold"
                >
                  <Tag className="w-3 h-3 text-indigo-500" />
                  {interest}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">No interests registered yet.</p>
          )}
        </div>

        {/* Update Form (Available for Admin) */}
        {user.role === 'admin' && (
          <form onSubmit={handleUpdateInterests} className="pt-4 border-t border-slate-100 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Update Interests (Comma-separated)
              </label>
              <input
                type="text"
                value={interestsInput}
                onChange={(e) => setInterestsInput(e.target.value)}
                placeholder="e.g. security, cryptography, distributed systems"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-xs transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Updating...' : 'Save Interests'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
