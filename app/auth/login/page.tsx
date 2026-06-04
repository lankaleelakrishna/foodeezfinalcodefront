'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { login } from '../../../lib/auth';

// ── Tap · Eat · Repeat illustration ──────────────────────────────────────────

function DeliveryIllustration() {
  return (
    <svg viewBox="0 0 480 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full" style={{ display: 'block' }}>

      {/* ── Ambient dots ── */}
      {[[18,12],[462,18],[440,170],[22,175],[240,6]].map(([cx,cy],i) => (
        <circle key={i} cx={cx} cy={cy} r="1.8" fill="white" opacity={0.15 + i*0.05}/>
      ))}

      {/* ══ STEP 1 — TAP ══ phone centered at x=80 ══ */}
      <g transform="translate(14, 8)">
        {/* Phone shadow */}
        <ellipse cx="54" cy="168" rx="36" ry="6" fill="#7C3AED" opacity="0.12"/>
        {/* Phone body */}
        <rect x="14" y="0" width="80" height="158" rx="13" fill="#1B1E25" stroke="#2E333C" strokeWidth="1.5"/>
        {/* Screen */}
        <rect x="20" y="8" width="68" height="130" rx="8" fill="#0A0B0D"/>
        {/* Notch */}
        <rect x="44" y="12" width="20" height="3" rx="1.5" fill="#2E333C"/>
        {/* App header */}
        <rect x="24" y="20" width="60" height="16" rx="4" fill="#7C3AED"/>
        <text x="39" y="31" fontSize="7.5" fontWeight="bold" fill="white" fontFamily="sans-serif">FooDeeZ</text>
        {/* Menu rows */}
        {[42, 64, 86].map((y, i) => (
          <g key={y}>
            <rect x="24" y={y} width="60" height="18" rx="3" fill="#1B1E25" stroke="#2E333C" strokeWidth="0.8"/>
            <circle cx="33" cy={y+9} r="5" fill={['#DC5F2B','#F1A682','#10b981'][i]} opacity="0.85"/>
            <rect x="42" y={y+4} width="30" height="3.5" rx="1.5" fill="#2E333C"/>
            <rect x="42" y={y+10} width="20" height="2.5" rx="1" fill="#2E333C" opacity="0.5"/>
          </g>
        ))}
        {/* Order button */}
        <rect x="28" y="110" width="52" height="14" rx="7" fill="#7C3AED"/>
        <text x="40" y="120" fontSize="6" fontWeight="bold" fill="white" fontFamily="sans-serif">ORDER NOW</text>
        {/* Home bar */}
        <rect x="44" y="148" width="20" height="3" rx="1.5" fill="#2E333C"/>
        {/* Tap ripple finger */}
        <g transform="translate(66, 96)" className="login-logo-float">
          <circle cx="12" cy="12" r="16" stroke="#7C3AED" strokeWidth="1.2" opacity="0.20"/>
          <circle cx="12" cy="12" r="10" stroke="#7C3AED" strokeWidth="1.4" opacity="0.35"/>
          <circle cx="12" cy="12" r="5.5" fill="rgba(124,58,237,0.30)" stroke="#7C3AED" strokeWidth="1.4"/>
          <ellipse cx="12" cy="6"  rx="4"   ry="6"   fill="#A78BFA"/>
          <ellipse cx="12" cy="9"  rx="3.5" ry="3.5" fill="#E68B5F"/>
        </g>
        {/* TAP label */}
        <text x="32" y="182" fontSize="10" fontWeight="bold" fill="#7C3AED" fontFamily="sans-serif" letterSpacing="3">TAP</text>
      </g>

      {/* ══ STEP 2 — EAT ══ plate centered at x=240 ══ */}
      <g transform="translate(168, 10)">
        {/* Plate shadow */}
        <ellipse cx="60" cy="162" rx="50" ry="7" fill="#7C3AED" opacity="0.10"/>
        {/* Plate rim */}
        <ellipse cx="60" cy="148" rx="50" ry="13" fill="#23272F" stroke="#2E333C" strokeWidth="1.2"/>
        <ellipse cx="60" cy="145" rx="43" ry="10" fill="#1B1E25"/>
        {/* Bowl */}
        <path d="M22 122 Q22 95 60 95 Q98 95 98 122 Z" fill="#23272F" stroke="#2E333C" strokeWidth="1.2"/>
        <path d="M26 120 Q26 99 60 99 Q94 99 94 120 Z" fill="#1B1E25"/>
        {/* Food base */}
        <ellipse cx="60" cy="120" rx="32" ry="9" fill="#2E333C"/>
        {/* Burger bun */}
        <path d="M38 112 Q38 92 60 92 Q82 92 82 112 Z" fill="#F59E0B"/>
        <ellipse cx="60" cy="112" rx="22" ry="4.5" fill="#D97706"/>
        {/* Seeds */}
        <ellipse cx="52" cy="101" rx="2.5" ry="1.5" fill="#A78BFA" opacity="0.8"/>
        <ellipse cx="62" cy="97"  rx="2.5" ry="1.5" fill="#A78BFA" opacity="0.8"/>
        <ellipse cx="70" cy="103" rx="2.5" ry="1.5" fill="#A78BFA" opacity="0.8"/>
        {/* Patty */}
        <ellipse cx="60" cy="117" rx="20" ry="4" fill="#7C3A1E"/>
        {/* Lettuce */}
        <path d="M38 114 Q44 110 50 113 Q56 110 62 113 Q68 110 74 113 Q80 110 82 114" stroke="#10b981" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        {/* Steam */}
        <path d="M48 86 Q46 80 48 74" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5" className="login-logo-ring-outer"/>
        <path d="M60 84 Q58 78 60 72" stroke="#A78BFA" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.4" className="login-logo-ring-mid"/>
        <path d="M72 86 Q70 80 72 74" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5" className="login-logo-ring-outer"/>
        {/* Floating pizza */}
        <g transform="translate(96, 44)" className="login-logo-float">
          <path d="M10 0 L0 24 L20 24 Z" fill="#F59E0B"/>
          <circle cx="6"  cy="17" r="2.5" fill="#D97706"/>
          <circle cx="13" cy="11" r="2"   fill="#D97706"/>
          <circle cx="10" cy="19" r="1.8" fill="#D97706"/>
        </g>
        {/* Sparkle */}
        <path d="M108 22 L110 27 L115 29 L110 31 L108 36 L106 31 L101 29 L106 27 Z" fill="#A78BFA" opacity="0.65" className="login-logo-ring-mid"/>
        {/* EAT label */}
        <text x="46" y="182" fontSize="10" fontWeight="bold" fill="#7C3AED" fontFamily="sans-serif" letterSpacing="3">EAT</text>
      </g>

      {/* ══ STEP 3 — REPEAT ══ scooter at right ══ */}
      <g transform="translate(318, 14)">
        {/* Shadow */}
        <ellipse cx="66" cy="170" rx="52" ry="7" fill="#7C3AED" opacity="0.10"/>
        {/* Rear wheel */}
        <circle cx="22" cy="152" r="20" fill="#23272F" stroke="#7C3AED" strokeWidth="2.5"/>
        <circle cx="22" cy="152" r="9"  fill="#15171D" stroke="#7C3AED" strokeWidth="1.5"/>
        <circle cx="22" cy="152" r="3"  fill="#7C3AED"/>
        {/* Front wheel */}
        <circle cx="108" cy="152" r="20" fill="#23272F" stroke="#7C3AED" strokeWidth="2.5"/>
        <circle cx="108" cy="152" r="9"  fill="#15171D" stroke="#7C3AED" strokeWidth="1.5"/>
        <circle cx="108" cy="152" r="3"  fill="#7C3AED"/>
        {/* Chassis */}
        <path d="M22 136 Q52 108 82 118 L108 132 Q96 144 80 144 L32 144 Q24 144 22 136Z" fill="#7C3AED"/>
        <path d="M62 118 L82 118 L108 132 L90 132Z" fill="#A78BFA"/>
        {/* Seat */}
        <rect x="32" y="108" width="36" height="8" rx="4" fill="#1B1E25"/>
        {/* Handlebars */}
        <path d="M100 116 L112 104 M104 110 L116 110" stroke="#A1A1AA" strokeWidth="2" strokeLinecap="round"/>
        {/* Box */}
        <rect x="20" y="76" width="42" height="34" rx="6" fill="#A78BFA"/>
        <rect x="24" y="80" width="34" height="26" rx="4" fill="#7C3AED"/>
        <line x1="41" y1="80"  x2="41" y2="106" stroke="#A78BFA" strokeWidth="1.5"/>
        <line x1="24" y1="93"  x2="58" y2="93"  stroke="#A78BFA" strokeWidth="1.5"/>
        <text x="28" y="100" fontSize="12" fontWeight="bold" fill="white" fontFamily="sans-serif">F</text>
        {/* Helmet */}
        <ellipse cx="90" cy="96"  rx="13" ry="14" fill="#7C3AED"/>
        <ellipse cx="90" cy="100" rx="9"  ry="7"  fill="#1B1E25"/>
        <rect    x="81" y="94"   width="20" height="5" rx="2" fill="#0A0B0D" opacity="0.7"/>
        {/* Body */}
        <path d="M80 112 Q86 108 95 110 L100 132 L78 132Z" fill="#A1A1AA"/>
        <path d="M93 116 L112 116 L110 122 L91 122Z"       fill="#A1A1AA"/>
        {/* Speed lines */}
        {[0,8,16].map((dy,i) => (
          <line key={i} x1={-8-i*3} y1={152-dy} x2={8+i*2} y2={152-dy}
            stroke="#7C3AED" strokeWidth={2-i*0.4} strokeLinecap="round" opacity={0.5-i*0.1}/>
        ))}
        {/* REPEAT label */}
        <text x="14" y="188" fontSize="9" fontWeight="bold" fill="#7C3AED" fontFamily="sans-serif" letterSpacing="2.5">REPEAT</text>
      </g>

      {/* ══ Connecting arrows ══ */}
      {/* TAP → EAT */}
      <path d="M 128 90 Q 155 72 168 88" stroke="#7C3AED" strokeWidth="1.8" strokeDasharray="5 4" fill="none" opacity="0.65" markerEnd="url(#arrowO)"/>
      {/* EAT → REPEAT */}
      <path d="M 304 90 Q 326 72 336 88" stroke="#7C3AED" strokeWidth="1.8" strokeDasharray="5 4" fill="none" opacity="0.65" markerEnd="url(#arrowO)"/>
      {/* REPEAT → TAP loop back (bottom curve) */}
      <path d="M 400 185 Q 330 210 240 208 Q 150 206 90 190" stroke="#A78BFA" strokeWidth="1.5" strokeDasharray="5 4" fill="none" opacity="0.40" markerEnd="url(#arrowP)"/>

      <defs>
        <marker id="arrowO" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#7C3AED"/>
        </marker>
        <marker id="arrowP" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#A78BFA"/>
        </marker>
      </defs>
    </svg>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch {
      setError('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
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
          style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(124,58,237,0.22) 0%, transparent 70%)' }} />
        <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.14) 0%, transparent 70%)' }} />
        <div className="pointer-events-none absolute right-0 bottom-1/3 h-48 w-48 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.10) 0%, transparent 70%)', filter: 'blur(30px)' }} />

        <div className="relative z-10 flex w-full flex-col items-center text-center">

          {/* ── Animated logo hero ── */}
          <div className="relative flex flex-col items-center">
            <div className="absolute rounded-full login-logo-ring-outer"
              style={{ width: 180, height: 180, background: 'radial-gradient(circle, rgba(124,58,237,0.20) 0%, transparent 70%)' }} />
            <div className="absolute rounded-full login-logo-ring-mid"
              style={{ width: 140, height: 140, background: 'radial-gradient(circle, rgba(167,139,250,0.22) 0%, transparent 65%)' }} />
            <div className="absolute rounded-full login-logo-glow"
              style={{ width: 100, height: 100, background: 'rgba(124,58,237,0.32)', filter: 'blur(22px)' }} />
            <img
              src="/foodeez-sidebar-logo.png"
              alt="FooDeeZ"
              className="login-logo-float relative z-10"
              style={{ height: 80, width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 0 18px rgba(124,58,237,0.65))' }}
            />
          </div>

          {/* Brand name */}
          <div className="mt-6 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.32em]" style={{ color: '#A78BFA' }}>
              Partner Portal
            </p>
            <h2 className="text-3xl font-bold leading-tight" style={{ color: '#FAFAFA' }}>
              <span style={{ color: '#A78BFA' }}>Tap.</span>{' '}
              <span style={{ color: '#F59E0B' }}>Eat.</span>{' '}
              <span style={{ color: '#FAFAFA' }}>Repeat.</span>
            </h2>
            <p className="text-sm" style={{ color: '#6B5B95' }}>
              Order in seconds · Delivered fast · Come back for more
            </p>
          </div>

          {/* Illustration */}
          <div className="mt-4 mb-3 w-full">
            <DeliveryIllustration />
          </div>

          {/* Animated divider with live dot */}
          <div className="flex w-full items-center gap-3">
            <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.5))' }} />
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70" style={{ background: '#7C3AED' }} />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: '#7C3AED' }} />
            </span>
            <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, rgba(124,58,237,0.5), transparent)' }} />
          </div>

          {/* Tagline chips */}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {['👆 Tap to order', '🍔 Eat your favourite', '🔁 Repeat anytime', '🛵 Fast delivery'].map((chip) => (
              <span key={chip} className="rounded-full px-3 py-1 text-[11px] font-medium"
                style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(167,139,250,0.25)', color: '#C4B5FD' }}>
                {chip}
              </span>
            ))}
          </div>

        </div>
      </div>

      {/* ── Right panel — login form ───────────────────────────── */}
      <div
        className="relative flex h-full w-full lg:w-1/2 items-center justify-center overflow-y-auto px-6 py-8"
        style={{ background: 'linear-gradient(160deg, #0F0A1E 0%, #1A1035 55%, #120D2A 100%)' }}
      >
        {/* Background glow orbs */}
        <div className="pointer-events-none absolute top-1/4 right-8 h-72 w-72 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)', filter: 'blur(50px)' }} />
        <div className="pointer-events-none absolute bottom-1/4 left-8 h-56 w-56 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.10) 0%, transparent 70%)', filter: 'blur(40px)' }} />

        <div className="relative w-full max-w-sm">

          {/* Mobile logo */}
          <div className="mb-8 flex flex-col items-center lg:hidden">
            <img src="/foodeez-sidebar-logo.png" alt="FooDeeZ" className="h-12 w-auto object-contain"/>
            <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.24em]" style={{ color: '#A78BFA' }}>Partner Portal</p>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1"
              style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(167,139,250,0.25)' }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#A78BFA' }} />
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#A78BFA' }}>Partner Portal</span>
            </div>
            <h1 className="text-3xl font-bold" style={{ color: '#F0EEFF' }}>Welcome back</h1>
            <p className="mt-1.5 text-sm" style={{ color: '#7C6FA0' }}>Sign in to access your partner dashboard.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Email */}
            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: '#C4B5FD' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@restaurant.com"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition placeholder:text-[#4A3F6B]"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(167,139,250,0.20)',
                  color: '#F0EEFF',
                }}
                onFocus={(e) => (e.currentTarget.style.border = '1px solid rgba(167,139,250,0.65)')}
                onBlur={(e)  => (e.currentTarget.style.border = '1px solid rgba(167,139,250,0.20)')}
              />
            </div>

            {/* Password */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-medium" style={{ color: '#C4B5FD' }}>Password</label>
                <Link href="/auth/request-reset" className="text-xs font-semibold transition hover:opacity-80" style={{ color: '#F59E0B' }}>
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full rounded-xl px-4 py-3 pr-12 text-sm outline-none transition placeholder:text-[#4A3F6B]"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(167,139,250,0.20)',
                    color: '#F0EEFF',
                  }}
                  onFocus={(e) => (e.currentTarget.style.border = '1px solid rgba(167,139,250,0.65)')}
                  onBlur={(e)  => (e.currentTarget.style.border = '1px solid rgba(167,139,250,0.20)')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded p-1 transition hover:opacity-80"
                  style={{ color: '#7C5BB0' }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-5.68 1.74L3.707 2.293zM6.217 5.218A8 8 0 0110 5c4.478 0 8.268 2.943 9.542 7a9.99 9.99 0 01-2.31 3.99l-2.124-2.124a4 4 0 00-5.868-5.868l-2.123-2.12zm6.216 6.216L10 13a2 2 0 002.216-2.216l-2-2z" clipRule="evenodd"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl px-4 py-2.5 text-sm" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.28)', color: '#FCA5A5' }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background: loading
                  ? 'rgba(124,58,237,0.4)'
                  : 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 45%, #B45309 100%)',
                boxShadow: loading ? 'none' : '0 4px 22px rgba(124,58,237,0.40), 0 0 0 1px rgba(167,139,250,0.15)',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                  </svg>
                  Signing in…
                </span>
              ) : 'Sign in'}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1" style={{ background: 'rgba(124,58,237,0.2)' }} />
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#4A3F6B' }}>FooDeeZ</span>
            <div className="h-px flex-1" style={{ background: 'rgba(124,58,237,0.2)' }} />
          </div>

          {/* Footer */}
          <p className="text-center text-xs" style={{ color: '#3D3160' }}>
            © {new Date().getFullYear()} FooDeeZ · All rights reserved.
          </p>
        </div>
      </div>

    </main>
  );
}
