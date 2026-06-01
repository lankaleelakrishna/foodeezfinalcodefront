'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { customerAuthApi } from '../../../../lib/api';
import { setCustomerTokens } from '../../../../lib/customer-auth';

type Step = 'email' | 'otp';

export default function CustomerLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setStatus('Sending OTP…');
    try {
      await customerAuthApi.sendOtp({ email, purpose: 'LOGIN' });
      setStatus('OTP sent to your registered mobile number.');
      setStep('otp');
    } catch {
      setError('Failed to send OTP. Check your email and try again.');
      setStatus('');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await customerAuthApi.login({ email, otp });
      setCustomerTokens(res.data.accessToken, res.data.refreshToken);
      router.push('/customer/discovery');
    } catch {
      setError('Invalid OTP. Please try again.');
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
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Sign in</h1>
        </div>

        {step === 'email' ? (
          <form className="space-y-4" onSubmit={handleSendOtp}>
            <div>
              <label className="block text-sm font-medium text-slate-700">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
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
          <form className="space-y-4" onSubmit={handleLogin}>
            <p className="text-sm text-slate-600">
              OTP sent to the mobile number linked to{' '}
              <span className="font-medium text-slate-900">{email}</span>
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
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-3xl bg-[#B88A2E] px-4 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-slate-300/30 transition hover:brightness-110 disabled:opacity-60"
            >
              {loading ? 'Verifying…' : 'Sign in'}
            </button>
            <button
              type="button"
              onClick={() => { setStep('email'); setError(''); setStatus(''); setOtp(''); }}
              className="w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Change email
            </button>
          </form>
        )}

        <div className="mt-5 flex justify-between text-sm text-slate-500">
          <Link href="/customer/auth/signup" className="text-[#B88A2E] hover:underline">
            New customer? Sign up
          </Link>
          <Link href="/customer/auth/reset-password" className="text-[#B88A2E] hover:underline">
            Reset password
          </Link>
        </div>
      </div>
    </main>
  );
}
