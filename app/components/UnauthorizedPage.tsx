'use client';

import Link from 'next/link';

interface Props {
  requiredRoles?: string[];
}

const ROLE_LABELS: Record<string, string> = {
  restaurant_owner:   'Restaurant Owner',
  restaurant_admin:   'Restaurant Admin',
  restaurant_manager: 'Restaurant Manager',
  restaurant_staff:   'Restaurant Staff',
  sales_operator:     'Sales Operator',
  super_admin:        'Super Admin',
};

export default function UnauthorizedPage({ requiredRoles }: Props) {
  const roleList = requiredRoles?.map((r) => ROLE_LABELS[r] ?? r).join(', ');

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-16 text-center">

      {/* Icon */}
      <div
        className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border"
        style={{
          background: 'linear-gradient(135deg, var(--surface), var(--surface-2))',
          borderColor: 'var(--accent)',
          boxShadow: 'var(--gold-glow)',
        }}
      >
        <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0110 0v4"/>
        </svg>
      </div>

      {/* Eyebrow */}
      <p
        className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em]"
        style={{ color: 'var(--accent)' }}
      >
        Access Restricted
      </p>

      {/* Heading */}
      <h1
        className="mb-3 font-display text-2xl font-semibold"
        style={{ color: 'var(--tx)' }}
      >
        You don&apos;t have permission here
      </h1>

      {/* Description */}
      <p className="mb-1 max-w-sm text-[13px]" style={{ color: 'var(--tx-2)' }}>
        This page is not available for your account role.
      </p>
      {roleList && (
        <p className="mb-8 max-w-sm text-[12px]" style={{ color: 'var(--tx-3)' }}>
          Required access: <span style={{ color: 'var(--tx-2)' }}>{roleList}</span>
        </p>
      )}

      {/* CTA */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-semibold no-underline transition-all"
        style={{
          background: 'linear-gradient(135deg, var(--accent), var(--accent-bright))',
          color: '#FFFFFF',
          boxShadow: 'var(--gold-glow)',
        }}
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Back to Dashboard
      </Link>
    </div>
  );
}
