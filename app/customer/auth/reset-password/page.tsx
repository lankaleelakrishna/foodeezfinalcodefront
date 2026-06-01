'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { customerAuthApi } from '../../../../lib/api';

type Step = 'phone' | 'reset';

export default function CustomerResetPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setStatus('Sending OTP…');
    try {
      await customerAuthApi.sendOtp({ phone, purpose: 'RESET_PASSWORD' });
      setStatus('OTP sent! Enter it below along with your new password.');
      setStep('reset');
    } catch {
      setError('Failed to send OTP. Check the number and try again.');
      setStatus('');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await customerAuthApi.resetPassword({ phone, otp, newPassword });
      setStatus('Password reset successfully. Redirecting…');
      setTimeout(() => router.push('/customer/auth/login'), 1800);
    } catch {
      setError('Reset failed. Check your OTP and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f2ea] px-4 text-slate-900">
      <div className="w-full max-w-sm rounded-[2rem] border border-slate-200/20 bg-white p-8 shadow-2xl shadow-black/20">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-16 w-full max-w-[180px] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-black/10">
            <img src="/foodeez-sidebar-logo.png" alt="FooDeeZ logo" className="h-full w-full object-contain" />
          </div>
          <p className="text-sm uppercase tracking-[0.28em] text-slate-500">Customer Portal</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Reset password</h1>
        </div>

        {step === 'phone' ? (
          <form className="space-y-4" onSubmit={handleSendOtp}>
            <p className="text-sm text-slate-600">Enter your registered mobile number to receive an OTP.</p>
            <div>
              <label className="block text-sm font-medium text-slate-700">Mobile number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="+91 9876543210"
                className="mt-3 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            {status && <p className="text-sm text-slate-500">{status}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-3xl bg-[#B88A2E] px-4 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-slate-300/30 transition hover:brightness-110 disabled:opacity-60"
            >
              {loading ? 'Sending…' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={handleReset}>
            <p className="text-sm text-slate-600">
              OTP sent to <span className="font-medium text-slate-900">{phone}</span>
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-700">One-time password</label>
              <input
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                maxLength={6}
                placeholder="Enter OTP"
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
            {status && <p className="text-sm text-slate-500">{status}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-3xl bg-[#B88A2E] px-4 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-slate-300/30 transition hover:brightness-110 disabled:opacity-60"
            >
              {loading ? 'Resetting…' : 'Reset password'}
            </button>
            <button
              type="button"
              onClick={() => { setStep('phone'); setError(''); setStatus(''); setOtp(''); setNewPassword(''); setConfirmPassword(''); }}
              className="w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Back
            </button>
          </form>
        )}

        <div className="mt-5 text-center text-sm text-slate-500">
          <Link href="/customer/auth/login" className="text-[#B88A2E] hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
