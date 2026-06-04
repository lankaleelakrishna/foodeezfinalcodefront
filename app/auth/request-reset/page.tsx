'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import { encryptPassword } from '../../../lib/crypto';

// ── Lock / Security illustration ─────────────────────────────────────────────

function LockIllustration({ unlocked }: { unlocked: boolean }) {
  return (
    <svg viewBox="0 0 340 300" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-xs" style={{ display: 'block' }}>
      {/* Background glow */}
      <ellipse cx="170" cy="200" rx="120" ry="60" fill="rgba(124,58,237,0.08)" />

      {/* Floating particles */}
      <circle cx="60"  cy="60"  r="3" fill="#7C3AED" opacity="0.4" className="login-logo-ring-outer"/>
      <circle cx="290" cy="80"  r="2" fill="#A78BFA" opacity="0.5" className="login-logo-ring-mid"/>
      <circle cx="40"  cy="180" r="2" fill="#7C3AED" opacity="0.3" className="login-logo-ring-outer"/>
      <circle cx="310" cy="200" r="3" fill="#A78BFA" opacity="0.4" className="login-logo-ring-mid"/>
      <circle cx="150" cy="30"  r="1.5" fill="white"  opacity="0.3"/>
      <circle cx="260" cy="240" r="1.5" fill="white"  opacity="0.2"/>

      {/* Shield base */}
      <path
        d="M170 40 L230 65 L230 135 C230 175 170 210 170 210 C170 210 110 175 110 135 L110 65 Z"
        fill="url(#shieldGrad)"
        stroke="rgba(124,58,237,0.5)"
        strokeWidth="2"
      />
      <path
        d="M170 55 L218 76 L218 134 C218 167 170 196 170 196 C170 196 122 167 122 134 L122 76 Z"
        fill="rgba(124,58,237,0.10)"
      />

      {/* Lock body */}
      <rect x="145" y="130" width="50" height="42" rx="8" fill="#7C3AED"/>
      <rect x="150" y="135" width="40" height="32" rx="6" fill="#A78BFA" opacity="0.3"/>

      {/* Lock shackle */}
      {unlocked ? (
        /* Unlocked — shackle open to the right */
        <path
          d="M170 130 L170 110 Q170 95 185 95 Q200 95 200 110 L200 125"
          stroke="#7C3AED"
          strokeWidth="7"
          strokeLinecap="round"
          fill="none"
        />
      ) : (
        /* Locked — shackle closed */
        <path
          d="M157 130 L157 112 Q157 95 170 95 Q183 95 183 112 L183 130"
          stroke="#7C3AED"
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
          <path d="M100 80 L102 86 L108 88 L102 90 L100 96 L98 90 L92 88 L98 86 Z" fill="#A78BFA" opacity="0.8" className="login-logo-float"/>
          <path d="M240 75 L242 79 L246 81 L242 83 L240 87 L238 83 L234 81 L238 79 Z" fill="#7C3AED" opacity="0.7" className="login-logo-ring-mid"/>
          <path d="M230 190 L231 193 L234 194 L231 195 L230 198 L229 195 L226 194 L229 193 Z" fill="#A78BFA" opacity="0.6" className="login-logo-float"/>
        </>
      )}

      {/* Email envelope (step 1) or checkmark (step 2) */}
      {!unlocked ? (
        <g transform="translate(126, 218)">
          <rect x="0" y="0" width="88" height="58" rx="8" fill="#1B1E25" stroke="rgba(124,58,237,0.4)" strokeWidth="1.5"/>
          <path d="M0 8 L44 32 L88 8" stroke="#7C3AED" strokeWidth="1.5" fill="none"/>
          <line x1="0"  y1="58" x2="18" y2="38" stroke="rgba(124,58,237,0.25)" strokeWidth="1"/>
          <line x1="88" y1="58" x2="70" y2="38" stroke="rgba(124,58,237,0.25)" strokeWidth="1"/>
          {/* Flying dots from envelope */}
          <circle cx="104" cy="10" r="2.5" fill="#7C3AED" opacity="0.5" className="login-logo-float"/>
          <circle cx="114" cy="20" r="1.5" fill="#A78BFA" opacity="0.4" className="login-logo-ring-mid"/>
          <circle cx="120" cy="5"  r="1.5" fill="#7C3AED" opacity="0.35"/>
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

  const inputBase: React.CSSProperties = {
    background: '#F9F7FF',
    border: '1.5px solid #E5E0F5',
    color: '#12082A',
  };
  const inputCls = 'w-full rounded-xl px-4 py-3.5 text-sm outline-none transition-all duration-200 placeholder:text-[#A89FC5]';
  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.border = '1.5px solid #7C3AED';
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.10)';
  };
  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.border = '1.5px solid #E5E0F5';
    e.currentTarget.style.boxShadow = 'none';
  };

  return (
    <main className="flex h-screen overflow-hidden">

      {/* ── Left panel — illustration ──────────────────────────── */}
      <div
        className="relative hidden lg:flex lg:w-1/2 h-full flex-col items-center justify-center overflow-hidden px-10 py-8"
        style={{ background: 'linear-gradient(145deg, #0A0614 0%, #0F0A1E 50%, #1A1035 100%)' }}
      >
        {/* Radial glows — purple + gold */}
        <div className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(124,58,237,0.20) 0%, transparent 70%)' }} />
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)' }} />
        <div className="pointer-events-none absolute left-0 bottom-1/3 h-48 w-48 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.10) 0%, transparent 70%)', filter: 'blur(30px)' }} />

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
            <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.4))' }}/>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70" style={{ background: '#7C3AED' }}/>
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: '#7C3AED' }}/>
            </span>
            <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, rgba(124,58,237,0.4), transparent)' }}/>
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

      {/* ── Right panel — form (white) ─────────────────────────── */}
      <div
        className="relative flex h-full w-full lg:w-1/2 flex-col items-center justify-center overflow-y-auto px-6 py-10"
        style={{ background: '#FFFFFF' }}
      >
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-16 -right-16 h-72 w-72 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.10) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div className="pointer-events-none absolute top-0 right-0 h-40 w-40 overflow-hidden">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full"
            style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.18), rgba(167,139,250,0.08))' }} />
        </div>
        <div className="pointer-events-none absolute bottom-0 left-0 h-32 w-32 overflow-hidden">
          <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full"
            style={{ background: 'linear-gradient(315deg, rgba(245,158,11,0.14), transparent)' }} />
        </div>

        <div className="relative w-full max-w-sm">

          {/* Mobile logo */}
          <div className="mb-6 flex flex-col items-center lg:hidden">
            <img src="/foodeez-sidebar-logo.png" alt="FooDeeZ" className="h-10 w-auto object-contain"/>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#7C3AED' }}>Partner Portal</p>
          </div>

          {/* Step indicator */}
          <div className="mb-8 flex items-center gap-1">
            {['Email', 'New password'].map((label, i) => {
              const active = (i === 0 && !isReset) || (i === 1 && isReset);
              const done   = i === 0 && isReset;
              return (
                <div key={label} className="flex items-center gap-2">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all"
                    style={{
                      background: done ? '#10B981' : active ? 'linear-gradient(135deg,#7C3AED,#5B21B6)' : '#F3F0FF',
                      color: done || active ? '#fff' : '#A89FC5',
                      boxShadow: active ? '0 0 0 3px rgba(124,58,237,0.18)' : done ? '0 0 0 3px rgba(16,185,129,0.18)' : 'none',
                    }}
                  >
                    {done ? '✓' : i + 1}
                  </div>
                  <span className="text-xs font-semibold" style={{ color: active ? '#7C3AED' : done ? '#10B981' : '#A89FC5' }}>
                    {label}
                  </span>
                  {i < 1 && (
                    <div className="mx-1 h-px w-10 rounded-full transition-all"
                      style={{ background: isReset ? 'rgba(16,185,129,0.4)' : '#E5E0F5' }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Heading */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#12082A' }}>
              {isReset ? 'Set new password' : 'Reset password'}
            </h1>
            <p className="mt-2 text-sm" style={{ color: '#6B7280' }}>
              {isReset
                ? 'Enter the token from your email and choose a new password.'
                : 'Enter your partner email to receive a reset token.'}
            </p>
          </div>

          {/* ── Step 1: Email ── */}
          {!isReset && (
            <form onSubmit={handleSendReset} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold" style={{ color: '#374151' }}>Email</label>
                <div className="relative">
                  <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="#9CA3AF" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    </svg>
                  </div>
                  <input
                    type="email" required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@restaurant.com"
                    className={`${inputCls} pl-10`}
                    style={inputBase}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm"
                  style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}>
                  <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                  </svg>
                  {error}
                </div>
              )}
              {status && (
                <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm"
                  style={{ background: '#F0FDF4', border: '1px solid #86EFAC', color: '#16A34A' }}>
                  <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  {status}
                </div>
              )}

              <button
                type="submit" disabled={loading}
                className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition-all duration-200 hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
                style={{
                  background: loading ? 'rgba(124,58,237,0.5)' : 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 45%, #C2410C 100%)',
                  boxShadow: loading ? 'none' : '0 8px 28px rgba(124,58,237,0.38), 0 2px 8px rgba(0,0,0,0.08)',
                }}
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>

              <div className="text-center">
                <Link href="/auth/login" className="text-sm font-semibold transition-opacity hover:opacity-75" style={{ color: '#F59E0B' }}>
                  ← Back to sign in
                </Link>
              </div>
            </form>
          )}

          {/* ── Step 2: New password ── */}
          {isReset && (
            <form onSubmit={handleResetPassword} className="space-y-5">

              {status && (
                <div className="flex items-start gap-3 rounded-xl px-4 py-3"
                  style={{ background: '#F0FDF4', border: '1px solid #86EFAC' }}>
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <p className="text-sm" style={{ color: '#16A34A' }}>{status}</p>
                </div>
              )}

              {/* Reset token */}
              <div>
                <label className="mb-2 block text-sm font-semibold" style={{ color: '#374151' }}>Reset token</label>
                <div className="relative">
                  <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="#9CA3AF" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
                    </svg>
                  </div>
                  <input
                    type="text" required
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    placeholder="Paste token from email"
                    className={`${inputCls} pl-10`}
                    style={inputBase}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  />
                </div>
              </div>

              {/* New password */}
              <div>
                <label className="mb-2 block text-sm font-semibold" style={{ color: '#374151' }}>New password</label>
                <div className="relative">
                  <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="#9CA3AF" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                    </svg>
                  </div>
                  <input
                    type={showPw ? 'text' : 'password'} required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className={`${inputCls} pl-10 pr-12`}
                    style={inputBase}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 transition hover:opacity-70" style={{ color: '#9CA3AF' }}>
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
                <label className="mb-2 block text-sm font-semibold" style={{ color: '#374151' }}>Confirm password</label>
                <div className="relative">
                  <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="#9CA3AF" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                    </svg>
                  </div>
                  <input
                    type={showConfirm ? 'text' : 'password'} required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    className={`${inputCls} pl-10 pr-12`}
                    style={inputBase}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 transition hover:opacity-70" style={{ color: '#9CA3AF' }}>
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      {showConfirm
                        ? <><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/></>
                        : <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-5.68 1.74L3.707 2.293zM6.217 5.218A8 8 0 0110 5c4.478 0 8.268 2.943 9.542 7a9.99 9.99 0 01-2.31 3.99l-2.124-2.124a4 4 0 00-5.868-5.868l-2.123-2.12zm6.216 6.216L10 13a2 2 0 002.216-2.216l-2-2z" clipRule="evenodd"/>
                      }
                    </svg>
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm"
                  style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}>
                  <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                  </svg>
                  {error}
                </div>
              )}

              <button
                type="submit" disabled={loading}
                className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition-all duration-200 hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
                style={{
                  background: loading ? 'rgba(124,58,237,0.5)' : 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 45%, #C2410C 100%)',
                  boxShadow: loading ? 'none' : '0 8px 28px rgba(124,58,237,0.38), 0 2px 8px rgba(0,0,0,0.08)',
                }}
              >
                {loading ? 'Resetting…' : 'Reset password'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setStep('email'); setError(''); setStatus(''); setResetToken(''); setNewPassword(''); setConfirmPassword(''); }}
                  className="text-sm font-semibold transition-opacity hover:opacity-75"
                  style={{ color: '#F59E0B' }}
                >
                  ← Back to email step
                </button>
              </div>
            </form>
          )}

          <div className="my-7 flex items-center gap-3">
            <div className="h-px flex-1" style={{ background: '#EDE9FE' }} />
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#C4B5FD' }}>FooDeeZ</span>
            <div className="h-px flex-1" style={{ background: '#EDE9FE' }} />
          </div>

          <p className="text-center text-xs" style={{ color: '#9CA3AF' }}>
            © {new Date().getFullYear()} FooDeeZ · All rights reserved.
          </p>
        </div>
      </div>

    </main>
  );
}
