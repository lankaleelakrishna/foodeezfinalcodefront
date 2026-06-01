'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getUserRole, getUserDisplayName } from '../../lib/auth';
import { useTheme } from '../providers';

const ROLE_LABELS: Record<string, string> = {
  restaurant_owner:   'Restaurant Owner',
  restaurant_admin:   'Restaurant Admin',
  restaurant_manager: 'Restaurant Manager',
  restaurant_staff:   'Restaurant Staff',
  sales_operator:     'Sales Operator',
  super_admin:        'Super Admin',
};

// ── Breadcrumb derivation ─────────────────────────────────────────────────────

type Crumb = { label: string; href?: string };

function getCrumbs(pathname: string): { trail: Crumb[]; title: string } {
  const seg = pathname.replace(/^\//, '').split('/').filter(Boolean);

  const map: Record<string, string> = {
    dashboard: 'Dashboard', restaurants: 'Restaurants', payments: 'Payments',
    users: 'Team', admin: 'Admin', customers: 'Customers', orders: 'Orders',
    tickets: 'Tickets', delivery: 'Delivery', analytics: 'Analytics',
    partners: 'Partners', assignments: 'Assignments', tracking: 'Live Tracking',
    support: 'Support', payouts: 'Payouts', branches: 'Branches',
    documents: 'Documents', register: 'Register', onboarding: 'Onboarding',
    menu: 'Menu', profile: 'Profile',
  };

  const isId = (s: string) => /^[0-9a-f-]{8,}$/i.test(s) || /^\d+$/.test(s);

  const labels = seg.map((s) => (isId(s) ? null : (map[s] ?? s)));
  const meaningful = labels.filter(Boolean) as string[];

  if (meaningful.length === 0) return { trail: [{ label: 'Foodeez' }], title: 'Dashboard' };

  const title = meaningful[meaningful.length - 1];
  const trail: Crumb[] = [{ label: 'Foodeez', href: '/dashboard' }];

  if (meaningful.length > 1) {
    meaningful.slice(0, -1).forEach((l, i) => {
      trail.push({ label: l, href: '/' + seg.slice(0, i + 1).join('/') });
    });
  }

  return { trail, title };
}

// ── Icon helpers ──────────────────────────────────────────────────────────────

function SunIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 01-3.46 0"/>
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M4 6h16M4 12h16M4 18h16"/>
    </svg>
  );
}

// ── Icon button ───────────────────────────────────────────────────────────────

function IconBtn({
  children, onClick, title, badge,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
  badge?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--tx-2)] transition-all hover:border-[var(--accent)] hover:text-[var(--accent)] focus:outline-none"
    >
      {children}
      {badge && (
        <span
          className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full"
          style={{ background: 'var(--accent)', boxShadow: '0 0 0 2px var(--surface)' }}
        />
      )}
    </button>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface TopHeaderProps { onMenuClick?: () => void; }

export default function TopHeader({ onMenuClick }: TopHeaderProps) {
  const pathname = usePathname() ?? '';
  const { theme, toggleTheme } = useTheme();
  const [roleLabel, setRoleLabel] = useState('Super Admin');
  const [name,      setName]      = useState('Admin');
  const [initials,  setInitials]  = useState('SA');

  useEffect(() => {
    const role        = getUserRole();
    const displayName = getUserDisplayName();
    const label       = ROLE_LABELS[role ?? 'super_admin'] ?? 'Admin';
    setRoleLabel(label);
    const resolved = displayName || label;
    setName(resolved.split(' ')[0]);
    setInitials(
      resolved.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2),
    );
  }, [pathname]);

  if (pathname.startsWith('/auth')) return null;

  const { trail, title } = getCrumbs(pathname);
  const isCustomer = pathname.startsWith('/customer');

  return (
    <header
      className="relative z-30 flex shrink-0 h-14 items-center gap-3 border-b px-4 transition-colors duration-200"
      style={{
        background: 'var(--hdr-bg)',
        borderColor: 'var(--hdr-bdr)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
      }}
    >
      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="mr-1 flex h-7 w-7 items-center justify-center rounded-md text-[var(--tx-2)] transition hover:text-[var(--accent)] lg:hidden"
        aria-label="Open menu"
      >
        <MenuIcon />
      </button>

      {/* Breadcrumb + title */}
      <div className="min-w-0 flex-1">
        {/* Crumb trail */}
        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.18em]">
          {trail.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span className="opacity-30">/</span>}
              {c.href ? (
                <Link
                  href={c.href}
                  className="text-[var(--tx-3)] no-underline transition-colors hover:text-[var(--accent)]"
                >
                  {c.label}
                </Link>
              ) : (
                <span className="text-[var(--tx-3)]">{c.label}</span>
              )}
            </span>
          ))}
          {trail.length > 0 && <span className="opacity-30">/</span>}
          <span style={{ color: 'var(--accent)' }}>{title}</span>
        </div>
      </div>

      {/* Search */}
      {!isCustomer && (
        <label className="relative hidden sm:flex items-center w-[240px]">
          <span className="sr-only">Search</span>
          <span className="absolute left-2.5 text-[var(--tx-3)]">
            <SearchIcon />
          </span>
          <input
            type="search"
            placeholder="Search…"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] py-1.5 pl-8 pr-10 text-[13px] text-[var(--tx)] placeholder:text-[var(--tx-3)] outline-none transition focus:border-[var(--accent)] focus:bg-[var(--surface)]"
          />
          <span
            className="absolute right-2.5 rounded px-1 py-0.5 text-[9px] font-semibold text-[var(--tx-3)] border border-[var(--border)]"
            style={{ background: 'var(--surface-2)', fontFamily: 'monospace' }}
          >
            ⌘K
          </span>
        </label>
      )}

      {/* Right controls */}
      <div className="flex items-center gap-1.5">

        {/* Theme toggle */}
        <IconBtn onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </IconBtn>

        {/* Bell */}
        <IconBtn badge title="Notifications">
          <BellIcon />
        </IconBtn>

        {/* User chip */}
        <div
          className="ml-0.5 flex items-center gap-2 rounded-lg border border-[var(--border)] px-2 py-1"
          style={{ background: 'var(--surface)' }}
        >
          <div
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
            style={{
              background: 'linear-gradient(135deg, var(--accent), var(--accent-bright))',
              color: '#FFFFFF',
            }}
          >
            {initials}
          </div>
          <div className="hidden sm:block">
            <p className="text-[12px] font-semibold leading-none" style={{ color: 'var(--tx)' }}>{name}</p>
            <p className="mt-0.5 text-[9px] leading-none" style={{ color: 'var(--tx-3)' }}>{roleLabel}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
