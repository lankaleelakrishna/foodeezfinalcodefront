'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { customerAuthApi } from '../../../lib/api';
import { clearCustomerTokens, getCustomerName, getCustomerPhone } from '../../../lib/customer-auth';

type Session = {
  deviceId: string;
  createdAt?: string;
  lastUsedAt?: string;
  userAgent?: string;
};

export default function CustomerSessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revoking, setRevoking] = useState<string | null>(null);

  const customerName = getCustomerName();
  const customerPhone = getCustomerPhone();

  const fetchSessions = async () => {
    try {
      const res = await customerAuthApi.getSessions();
      setSessions(res.data?.sessions ?? res.data ?? []);
    } catch {
      setError('Failed to load sessions. Please sign in again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleRevoke = async (deviceId: string) => {
    setRevoking(deviceId);
    try {
      await customerAuthApi.revokeSession(deviceId);
      setSessions((prev) => prev.filter((s) => s.deviceId !== deviceId));
    } catch {
      setError('Failed to revoke session.');
    } finally {
      setRevoking(null);
    }
  };

  const handleLogoutAll = async () => {
    setRevoking('all');
    try {
      await customerAuthApi.logoutAll();
      clearCustomerTokens();
      router.push('/customer/auth/login');
    } catch {
      setError('Failed to log out all sessions.');
      setRevoking(null);
    }
  };

  const handleLogout = async () => {
    try {
      await customerAuthApi.logout();
    } catch {
      // ignore — clear tokens regardless
    }
    clearCustomerTokens();
    router.push('/customer/auth/login');
  };

  return (
    <main className="min-h-screen bg-[#f7f2ea] px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">Active sessions</h1>
            {(customerName || customerPhone) && (
              <p className="mt-1 text-sm text-slate-500">
                {customerName && <span className="font-medium text-slate-700">{customerName}</span>}
                {customerName && customerPhone && ' · '}
                {customerPhone}
              </p>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Sessions list */}
        <div className="rounded-[2rem] border border-slate-200/60 bg-white shadow-xl shadow-black/10">
          {loading ? (
            <div className="px-6 py-12 text-center text-sm text-slate-400">Loading sessions…</div>
          ) : sessions.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-slate-400">No active sessions found.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {sessions.map((session) => (
                <li key={session.deviceId} className="flex items-center justify-between gap-4 px-6 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {session.deviceId === 'default' ? 'Default device' : session.deviceId}
                    </p>
                    {session.userAgent && (
                      <p className="mt-0.5 truncate text-xs text-slate-400">{session.userAgent}</p>
                    )}
                    {session.lastUsedAt && (
                      <p className="mt-0.5 text-xs text-slate-400">
                        Last active: {new Date(session.lastUsedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleRevoke(session.deviceId)}
                    disabled={revoking === session.deviceId}
                    className="shrink-0 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                  >
                    {revoking === session.deviceId ? 'Revoking…' : 'Revoke'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Logout all */}
        {!loading && sessions.length > 0 && (
          <div className="mt-4 text-right">
            <button
              onClick={handleLogoutAll}
              disabled={revoking === 'all'}
              className="rounded-2xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-red-700 disabled:opacity-60"
            >
              {revoking === 'all' ? 'Signing out…' : 'Sign out all devices'}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
