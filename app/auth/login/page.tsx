'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { login } from '../../../lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError('Invalid credentials or network error');
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f2ea] px-4 text-slate-900">
      <div className="w-full max-w-sm rounded-[2rem] border border-slate-200/20 bg-white p-4 shadow-2xl shadow-black/20 flex flex-col justify-center">
        <div className="mb-4 text-center">
          <div className="mx-auto mb-2 flex h-16 w-full max-w-[180px] items-center justify-center overflow-hidden rounded-xl shadow-sm shadow-black/10 bg-white border border-slate-200">
            <img
              src="/foodeez-sidebar-logo.png"
              alt="FooDeeZ logo"
              className="h-full w-full object-contain"
            />
          </div>
          <p className="text-sm uppercase tracking-[0.28em] text-slate-500">Partner Portal</p>
          <p className="mt-2 text-sm text-slate-600">Sign in to your account</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              className="mt-3 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <div className="relative mt-3">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? 'text' : 'password'}
                required
                className="w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 pr-12 text-slate-900 outline-none transition focus:border-[#B88A2E] focus:ring-2 focus:ring-[#B88A2E]/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-5.68 1.74L3.707 2.293zM6.217 5.218A8 8 0 0110 5c4.478 0 8.268 2.943 9.542 7a9.99 9.99 0 01-2.31 3.99l-2.124-2.124a4 4 0 00-5.868-5.868l-2.123-2.12zm6.216 6.216L10 13a2 2 0 002.216-2.216l-2-2z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" className="w-full rounded-3xl bg-[#B88A2E] px-4 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-slate-300/30 transition hover:brightness-110">
            Sign in
          </button>
        </form>

        <div className="mt-3 text-center text-sm text-slate-500">
          <Link href="/auth/request-reset" className="text-[#B88A2E] hover:text-[#B88A2E]/80 hover:underline">
            Forgot password?
          </Link>
        </div>
      </div>
    </main>
  );
}