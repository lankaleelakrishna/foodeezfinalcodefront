'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import { encryptPassword } from '../../../lib/crypto';

// ── Lock / Security illustration ─────────────────────────────────────────────

function LockIllustration({ unlocked }: { unlocked: boolean }) {
  return (
    <svg viewBox="0 0 340 300" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-xs" style={{ display: 'block' }}>
      {/* Background glow */}
      <ellipse cx="170" cy="200" rx="120" ry="60" fill="rgba(220,95,43,0.08)" />

      {/* Floating particles */}
      <circle cx="60"  cy="60"  r="3" fill="#DC5F2B" opacity="0.4" className="login-logo-ring-outer"/>
      <circle cx="290" cy="80"  r="2" fill="#F1A682" opacity="0.5" className="login-logo-ring-mid"/>
      <circle cx="40"  cy="180" r="2" fill="#DC5F2B" opacity="0.3" className="login-logo-ring-outer"/>
      <circle cx="310" cy="200" r="3" fill="#F1A682" opacity="0.4" className="login-logo-ring-mid"/>
      <circle cx="150" cy="30"  r="1.5" fill="white"  opacity="0.3"/>
      <circle cx="260" cy="240" r="1.5" fill="white"  opacity="0.2"/>

      {/* Shield base */}
      <path
        d="M170 40 L230 65 L230 135 C230 175 170 210 170 210 C170 210 110 175 110 135 L110 65 Z"
        fill="url(#shieldGrad)"
        stroke="rgba(220,95,43,0.5)"
        strokeWidth="2"
      />
      <path
        d="M170 55 L218 76 L218 134 C218 167 170 196 170 196 C170 196 122 167 122 134 L122 76 Z"
        fill="rgba(220,95,43,0.10)"
      />

      {/* Lock body */}
      <rect x="145" y="130" width="50" height="42" rx="8" fill="#DC5F2B"/>
      <rect x="150" y="135" width="40" height="32" rx="6" fill="#F1A682" opacity="0.3"/>

      {/* Lock shackle */}
      {unlocked ? (
        /* Unlocked — shackle open to the right */
        <path
          d="M170 130 L170 110 Q170 95 185 95 Q200 95 200 110 L200 125"
          stroke="#DC5F2B"
          strokeWidth="7"
          strokeLinecap="round"
          fill="none"
        />
      ) : (
        /* Locked — shackle closed */
        <path
          d="M157 130 L157 112 Q157 95 170 95 Q183 95 183 112 L183 130"
          stroke="#DC5F2B"
          strokeWidth="7"
          strokeLinecap="round"
          fill="none"
        />
      )}

      {/* Keyhole */}
      <circle cx="170" cy="149" r="7" fill="rgba(0,0,0,0.35)"/>
      <rect x="167" y="149" width="6" height="10" rx="3" fill="rgba(0,0,0,0.35)"/>

      {/* Sparkles around shield when unlocked */}
      {unlocked && (
        <>
          <path d="M100 80 L102 86 L108 88 L102 90 L100 96 L98 90 L92 88 L98 86 Z" fill="#F1A682" opacity="0.8" className="login-logo-float"/>
          <path d="M240 75 L242 79 L246 81 L242 83 L240 87 L238 83 L234 81 L238 79 Z" fill="#DC5F2B" opacity="0.7" className="login-logo-ring-mid"/>
          <path d="M230 190 L231 193 L234 194 L231 195 L230 198 L229 195 L226 194 L229 193 Z" fill="#F1A682" opacity="0.6" className="login-logo-float"/>
        </>
      )}

      {/* Email envelope (step 1) or checkmark (step 2) */}
      {!unlocked ? (
        <g transform="translate(126, 218)">
          <rect x="0" y="0" width="88" height="58" rx="8" fill="#1B1E25" stroke="rgba(220,95,43,0.4)" strokeWidth="1.5"/>
          <path d="M0 8 L44 32 L88 8" stroke="#DC5F2B" strokeWidth="1.5" fill="none"/>
          <line x1="0"  y1="58" x2="18" y2="38" stroke="rgba(220,95,43,0.25)" strokeWidth="1"/>
          <line x1="88" y1="58" x2="70" y2="38" stroke="rgba(220,95,43,0.25)" strokeWidth="1"/>
          {/* Flying dots from envelope */}
          <circle cx="104" cy="10" r="2.5" fill="#DC5F2B" opacity="0.5" className="login-logo-float"/>
          <circle cx="114" cy="20" r="1.5" fill="#F1A682" opacity="0.4" className="login-logo-ring-mid"/>
          <circle cx="120" cy="5"  r="1.5" fill="#DC5F2B" opacity="0.35"/>
        </g>
      ) : (
        <g transform="translate(140, 220)">
          <circle cx="30" cy="30" r="30" fill="rgba(16,185,129,0.15)" stroke="rgba(16,185,129,0.5)" strokeWidth="1.5"/>
          <path d="M16 30 L26 40 L46 20" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </g>
      )}

      <defs>
        <linearGradient id="shieldGrad" x1="170" y1="40" x2="170" y2="210" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#23272F"/>
          <stop offset="100%" stopColor="#15171D"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RequestResetPage() {
  const router = useRouter();
  const [email,           setEmail]           = useState('');
  const [resetToken,      setResetToken]      = useState('');
  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step,    setStep]    = useState<'email' | 'reset'>('email');
  const [error,   setError]   = useState('');
  const [status,  setStatus]  = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw,     setShowPw]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api.post('/auth/password-reset', { email });
      setStatus('Reset token sent! Check your email and enter it below.');
      setStep('reset');
    } catch {
      setError('Unable to send reset link. Please verify your email.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (!resetToken.trim()) { setError('Please enter the reset token.'); return; }
    setLoading(true);
    try {
      await api.post('/auth/password-reset/confirm', {
        token: resetToken, newPassword: encryptPassword(newPassword),
      });
      setStatus('Password reset successfully. Redirecting…');
      setTimeout(() => router.push('/auth/login'), 1800);
    } catch {
      setError('Invalid token or it has expired. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isReset = step === 'reset';

  // ── Shared input style ──────────────────────────────────────────────────────
  const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 transition focus:border-[#DC5F2B] focus:ring-2 focus:ring-[#DC5F2B]/15';

  return (
    <main className="flex h-screen overflow-hidden">

      {/* ── Left panel — illustration ──────────────────────────── */}
      <div
        className="relative hidden lg:flex lg:w-1/2 h-full flex-col items-center justify-center overflow-hidden px-10 py-8"
        style={{ background: 'linear-gradient(145deg, #0A0B0D 0%, #15171D 50%, #1B1E25 100%)' }}
      >
        {/* Radial glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(220,95,43,0.15) 0%, transparent 70%)' }}
        />
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(220,95,43,0.08) 0%, transparent 70%)' }}
        />

        <div className="relative z-10 flex w-full flex-col items-center text-center">

          {/* Logo */}
          <div className="mb-6 flex items-center gap-2">
            <img src="/foodeez-sidebar-logo.png" alt="FooDeeZ" className="h-9 w-auto object-contain"/>
          </div>

          {/* Illustration */}
          <div className="w-full flex justify-center">
            <LockIllustration unlocked={isReset} />
          </div>

          {/* Heading changes per step */}
          <div className="mt-4 space-y-1.5">
            <h2 className="text-2xl font-bold" style={{ color: '#FAFAFA' }}>
              {isReset ? 'Create a new password' : 'Forgot your password?'}
            </h2>
            <p className="text-sm" style={{ color: '#71717A' }}>
              {isReset
                ? 'Enter the token from your email and set a strong new password.'
                : 'No worries — we\'ll send a reset token to your registered email.'}
            </p>
          </div>

          {/* Animated divider */}
          <div className="mt-6 flex w-full items-center gap-3">
            <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, rgba(220,95,43,0.4))' }}/>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70" style={{ background: '#DC5F2B' }}/>
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: '#DC5F2B' }}/>
            </span>
            <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, rgba(220,95,43,0.4), transparent)' }}/>
          </div>

          {/* Tips */}
          <div className="mt-5 flex flex-col gap-2 text-left w-full max-w-xs">
            {(isReset ? [
              { icon: '📧', text: 'Check your spam folder if you don\'t see the email' },
              { icon: '🔑', text: 'Token expires in 15 minutes — act quickly' },
              { icon: '🔒', text: 'Use a strong password with letters, numbers & symbols' },
            ] : [
              { icon: '📧', text: 'A secure token will be sent to your email address' },
              { icon: '⏱️', text: 'The reset link expires in 15 minutes' },
              { icon: '🛡️', text: 'Your account security is our top priority' },
            ]).map(({ icon, text }) => (
              <div key={text} className="flex items-start gap-2.5">
                <span className="text-sm leading-snug shrink-0">{icon}</span>
                <p className="text-xs leading-snug" style={{ color: '#A1A1AA' }}>{text}</p>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* ── Right panel — form ─────────────────────────────────── */}
      <div
        className="flex h-full w-full lg:w-1/2 flex-col items-center justify-start overflow-y-auto px-6 py-10"
        style={{ background: '#FAFAFA' }}
      >
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="mb-6 flex flex-col items-center lg:hidden">
            <img src="/foodeez-sidebar-logo.png" alt="FooDeeZ" className="h-10 w-auto object-contain"/>
          </div>

          {/* Step indicator */}
          <div className="mb-8 flex items-center gap-1">
            {['Email', 'New password'].map((label, i) => {
              const active = (i === 0 && !isReset) || (i === 1 && isReset);
              const done   = i === 0 && isReset;
              return (
                <div key={label} className="flex items-center gap-2">
                  {/* Circle */}
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all"
                    style={{
                      background: done ? '#10b981' : active ? '#DC5F2B' : '#E4E4E7',
                      color: done || active ? '#fff' : '#A1A1AA',
                      boxShadow: active ? '0 0 0 3px rgba(220,95,43,0.18)' : done ? '0 0 0 3px rgba(16,185,129,0.18)' : 'none',
                    }}
                  >
                    {done ? '✓' : i + 1}
                  </div>
                  {/* Label */}
                  <span
                    className="text-xs font-semibold"
                    style={{ color: active ? '#DC5F2B' : done ? '#10b981' : '#A1A1AA' }}
                  >
                    {label}
                  </span>
                  {/* Connector line */}
                  {i < 1 && (
                    <div
                      className="mx-1 h-px w-10 rounded-full transition-all"
                      style={{ background: isReset ? '#10b981' : '#E4E4E7' }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Heading */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">
              {isReset ? 'Set new password' : 'Reset password'}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {isReset
                ? 'Enter the token from your email and choose a new password.'
                : 'Enter your partner email to receive a reset token.'}
            </p>
          </div>

          {/* ── Step 1: Email ── */}
          {!isReset && (
            <form onSubmit={handleSendReset} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email" required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@restaurant.com"
                  className={inputCls}
                />
              </div>

              {error  && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</div>}
              {status && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">{status}</div>}

              <button
                type="submit" disabled={loading}
                className="w-full rounded-xl py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #DC5F2B, #F1A682)' }}
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>

              <div className="text-center">
                <Link href="/auth/login" className="text-sm font-medium text-slate-500 hover:text-slate-700">
                  ← Back to sign in
                </Link>
              </div>
            </form>
          )}

          {/* ── Step 2: New password ── */}
          {isReset && (
            <form onSubmit={handleResetPassword} className="space-y-5">

              {/* Step-1 success notice — shown at the top so it doesn't interrupt fields */}
              {status && (
                <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <p className="text-sm text-emerald-700">{status}</p>
                </div>
              )}

              {/* Reset token */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Reset token</label>
                <input
                  type="text" required
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  placeholder="Paste token from email"
                  className={inputCls}
                />
              </div>

              {/* New password */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">New password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'} required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className={`${inputCls} pr-12`}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      {showPw
                        ? <><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/></>
                        : <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-5.68 1.74L3.707 2.293zM6.217 5.218A8 8 0 0110 5c4.478 0 8.268 2.943 9.542 7a9.99 9.99 0 01-2.31 3.99l-2.124-2.124a4 4 0 00-5.868-5.868l-2.123-2.12zm6.216 6.216L10 13a2 2 0 002.216-2.216l-2-2z" clipRule="evenodd"/>
                      }
                    </svg>
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Confirm password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'} required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    className={`${inputCls} pr-12`}
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      {showConfirm
                        ? <><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/></>
                        : <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-5.68 1.74L3.707 2.293zM6.217 5.218A8 8 0 0110 5c4.478 0 8.268 2.943 9.542 7a9.99 9.99 0 01-2.31 3.99l-2.124-2.124a4 4 0 00-5.868-5.868l-2.123-2.12zm6.216 6.216L10 13a2 2 0 002.216-2.216l-2-2z" clipRule="evenodd"/>
                      }
                    </svg>
                  </button>
                </div>
              </div>

              {/* Error only — success is shown at top */}
              {error && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                  </svg>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit" disabled={loading}
                className="w-full rounded-xl py-3 text-sm font-semibold transition hover:brightness-105 active:scale-[0.98] disabled:opacity-60"
                style={{
                  background: 'var(--btn-primary-bg)',
                  color: 'var(--btn-primary-color)',
                  boxShadow: 'var(--btn-primary-shadow)',
                  border: '1px solid var(--btn-primary-border)',
                }}
              >
                {loading ? 'Resetting…' : 'Reset password'}
              </button>

              {/* Back — text link style, not a full button */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setStep('email'); setError(''); setStatus(''); setResetToken(''); setNewPassword(''); setConfirmPassword(''); }}
                  className="text-sm font-medium text-slate-400 transition hover:text-slate-600"
                >
                  ← Back to email step
                </button>
              </div>
            </form>
          )}

          <p className="mt-8 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} FooDeeZ. All rights reserved.
          </p>
        </div>
      </div>

    </main>
  );
}
