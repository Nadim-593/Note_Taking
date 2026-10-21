'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import {
  FileText,
  Shield,
  PlusCircle,
  User as UserIcon,
  LogOut,
  Menu,
  X,
  Users,
  Layers,
  Sparkles,
} from 'lucide-react';

export function Navbar() {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(path + '/');
  };

  const navLinkClass = (path: string) =>
    `inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
      isActive(path)
        ? 'bg-indigo-50 text-indigo-700'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
    }`;

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href={user ? '/dashboard' : '/'}
            className="flex items-center gap-2 text-indigo-600 font-bold text-lg tracking-tight"
          >
            <Shield className="w-6 h-6 text-indigo-600" />
            <span className="text-slate-900">
              Secure<span className="text-indigo-600">Notes</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          {!loading && (
            <nav className="hidden md:flex items-center gap-2">
              {user ? (
                <>
                  <Link href="/dashboard" className={navLinkClass('/dashboard')}>
                    Dashboard
                  </Link>
                  <Link href="/notes" className={navLinkClass('/notes')}>
                    <FileText className="w-4 h-4" />
                    My Notes
                  </Link>
                  <Link
                    href="/notes/new"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition"
                  >
                    <PlusCircle className="w-4 h-4" />
                    New Note
                  </Link>

                  {/* Admin Section */}
                  {user.role === 'admin' && (
                    <div className="flex items-center gap-1 pl-3 ml-3 border-l border-slate-200">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-600 px-2 py-0.5 rounded bg-amber-50">
                        Admin
                      </span>
                      <Link
                        href="/admin/users"
                        className={navLinkClass('/admin/users')}
                      >
                        <Users className="w-4 h-4" />
                        Users
                      </Link>
                      <Link
                        href="/admin/notes"
                        className={navLinkClass('/admin/notes')}
                      >
                        <Layers className="w-4 h-4" />
                        All Notes
                      </Link>
                      <Link
                        href="/admin/interests"
                        className={navLinkClass('/admin/interests')}
                      >
                        <Sparkles className="w-4 h-4" />
                        Interests
                      </Link>
                    </div>
                  )}

                  {/* User Profile & Logout */}
                  <div className="flex items-center gap-3 pl-3 ml-3 border-l border-slate-200">
                    <Link
                      href="/profile"
                      className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-indigo-600"
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-700 font-semibold text-xs">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="max-w-[120px] truncate">{user.name}</span>
                    </Link>

                    <button
                      onClick={logout}
                      title="Log out"
                      className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <Link
                    href="/login"
                    className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition"
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </nav>
          )}

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && !loading && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-2">
          {user ? (
            <>
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900">{user.name}</div>
                  <div className="text-xs text-slate-500">{user.email}</div>
                </div>
                <span className="text-xs uppercase font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {user.role}
                </span>
              </div>

              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50"
              >
                Dashboard
              </Link>
              <Link
                href="/notes"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50"
              >
                My Notes
              </Link>
              <Link
                href="/notes/new"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-medium text-indigo-600 font-semibold"
              >
                + New Note
              </Link>
              <Link
                href="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50"
              >
                My Profile
              </Link>

              {user.role === 'admin' && (
                <div className="pt-3 border-t border-slate-200">
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-600 px-3 py-1">
                    Admin Tools
                  </div>
                  <Link
                    href="/admin/users"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Manage Users
                  </Link>
                  <Link
                    href="/admin/notes"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    All Notes (Global)
                  </Link>
                  <Link
                    href="/admin/interests"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Interests Aggregation
                  </Link>
                </div>
              )}

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="w-full text-left mt-3 pt-3 border-t border-slate-200 px-3 py-2 text-base font-medium text-red-600 hover:bg-red-50 rounded-lg"
              >
                Sign Out
              </button>
            </>
          ) : (
            <div className="space-y-2 pt-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center px-4 py-2.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-700"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center px-4 py-2.5 rounded-lg bg-indigo-600 text-sm font-semibold text-white shadow-xs"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
