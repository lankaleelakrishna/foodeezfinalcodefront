'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { customerAuthApi } from '../../../../lib/api';
import { setCustomerTokens } from '../../../../lib/customer-auth';

type Step = 'email' | 'details';

export default function CustomerSignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
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
      await customerAuthApi.sendOtp({ email, purpose: 'SIGNUP' });
      setStatus('OTP sent to your email.');
      setStep('details');
    } catch {
      setError('Failed to send OTP. Check your email and try again.');
      setStatus('');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await customerAuthApi.signup({ email, phone, name, otp });
      setCustomerTokens(res.data.accessToken, res.data.refreshToken);
      router.push('/customer/discovery');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Signup failed. Check your OTP or try again.');
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
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Create account</h1>
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
              <p className="mt-1.5 text-xs text-slate-400">An OTP will be sent to this email.</p>
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
          <form className="space-y-4" onSubmit={handleSignup}>
            <p className="text-sm text-slate-600">
              OTP sent to <span className="font-medium text-slate-900">{email}</span>
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-700">Full name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Your name"
                className="mt-3 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
              />
            </div>
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
            <div>
              <label className="block text-sm font-medium text-slate-700">One-time password</label>
              <input
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                maxLength={6}
                placeholder="Enter OTP from email"
                className="mt-3 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-3xl bg-[#B88A2E] px-4 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-slate-300/30 transition hover:brightness-110 disabled:opacity-60"
            >
              {loading ? 'Creating account…' : 'Create account'}
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

        <div className="mt-5 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link href="/customer/auth/login" className="text-[#B88A2E] hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
