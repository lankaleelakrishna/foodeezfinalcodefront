'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import { encryptPassword } from '../../../lib/crypto';

export default function RequestResetPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<'email' | 'reset'>('email'); // 'email' or 'reset'
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const handleSendReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setStatus('Sending password reset...');
    try {
      await api.post('/auth/password-reset', { email });
      setStatus('Reset link sent! Enter the token and your new password below.');
      setStep('reset');
    } catch (err) {
      setError('Unable to send password reset. Please verify your email.');
      setStatus('');
    }
  };

  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!resetToken.trim()) {
      setError('Please enter the reset token.');
      return;
    }

    setStatus('Resetting password...');
    try {
      await api.post('/auth/password-reset/confirm', { token: resetToken, newPassword: encryptPassword(newPassword) });
      setStatus('Password reset successfully. Redirecting to login...');
      setTimeout(() => router.push('/auth/login'), 1800);
    } catch (err) {
      setError('Unable to reset password. Verify the token and try again.');
      setStatus('');
    }
  };

  if (step === 'email') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f2ea] px-4 text-slate-900">
        <div className="w-full max-w-sm rounded-[2rem] border border-slate-200/20 bg-white p-8 shadow-2xl shadow-black/20">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Reset password</h1>
          <p className="mt-3 text-sm text-slate-600">Enter your partner email to receive a reset token.</p>
          <form className="mt-8 space-y-6" onSubmit={handleSendReset}>
            <div>
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-3 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            {status && <p className="text-sm text-slate-600">{status}</p>}
            <button type="submit" className="w-full rounded-3xl bg-[#B88A2E] px-4 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-slate-300/30 transition hover:brightness-110">
              Send reset link
            </button>
          </form>
        </div>
      </main>
    );
  } else if (step === 'reset') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f2ea] px-4 text-slate-900">
        <div className="w-full max-w-sm rounded-[2rem] border border-slate-200/20 bg-white p-8 shadow-2xl shadow-black/20">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Set a new password</h1>
          <p className="mt-3 text-sm text-slate-600">Enter the reset token and your new password.</p>
          <form className="mt-8 space-y-5" onSubmit={handleResetPassword}>
            <div>
              <label className="block text-sm font-medium text-slate-700">Reset token</label>
              <input
                type="text"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                required
                className="mt-3 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
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
            <button
              type="button"
              onClick={() => {
                setStep('email');
                setError('');
                setStatus('');
                setResetToken('');
                setNewPassword('');
                setConfirmPassword('');
              }}
              className="w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Back
            </button>
          </form>
        </div>
      </main>
    );
  }
}