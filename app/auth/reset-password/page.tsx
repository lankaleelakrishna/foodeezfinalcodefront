'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import { encryptPassword } from '../../../lib/crypto';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get('token') ?? '');
  }, []);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setStatus('Resetting password...');
    try {
      await api.post('/auth/password-reset/confirm', { token, newPassword: encryptPassword(password) });
      setStatus('Password reset successfully. Redirecting to login...');
      setTimeout(() => router.push('/auth/login'), 1800);
    } catch (err) {
      setError('Unable to reset password. Verify the token and try again.');
      setStatus('');
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f2ea] px-4 text-slate-900">
      <div className="w-full max-w-sm rounded-[2rem] border border-slate-200/20 bg-white p-8 shadow-2xl shadow-black/20">
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">Set a new password</h1>
        <p className="mt-3 text-sm text-slate-600">Enter a new password using the reset token you received.</p>
        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-700">Reset token</label>
            <input
              type="text"
              value={token}
              readOnly
              className="mt-3 w-full rounded-3xl border border-slate-300 bg-slate-100 px-4 py-3 text-slate-700 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">New password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-3 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="mt-3 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          {status && <p className="text-sm text-slate-600">{status}</p>}
          <button type="submit" className="w-full rounded-3xl bg-[#B88A2E] px-4 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-slate-300/30 transition hover:brightness-110">
            Reset password
          </button>
        </form>
      </div>
    </main>
  );
}