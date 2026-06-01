'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { clearToken, getUserRole, getUserEmail, getUserDisplayName, getUserRestaurantId } from '../../lib/auth';

// ── Icons ─────────────────────────────────────────────────────────────────────

function Icon({ d, d2, size = 16 }: { d: string; d2?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />{d2 && <path d={d2} />}
    </svg>
  );
}

const icons = {
  dashboard:   () => <Icon d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" />,
  restaurant:  () => <Icon d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" d2="M9 22V12h6v10" />,
  payments:    () => <Icon d="M1 4h22v16H1zM1 10h22" />,
  users:       () => <Icon d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.74" />,
  delivery:    () => <Icon d="M1 3h15v13H1zM16 8h4l3 5v3h-7V8z" d2="M5.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM18.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />,
  rider:       () => <Icon d="M12 3a2 2 0 100 4 2 2 0 000-4zM12 7v6l4 2M5 16a7 7 0 0114 0" />,
  tracking:    () => <Icon d="M12 9a3 3 0 100 6 3 3 0 000-6zM12 2v3M12 19v3M2 12h3M19 12h3" />,
  support:     () => <Icon d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" d2="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" />,
  payout:      () => <Icon d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />,
  analytics:   () => <Icon d="M18 20V10M12 20V4M6 20v-6" />,
  logout:      () => <Icon d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />,
  customers:   () => <Icon d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z" />,
  orders:      () => <Icon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />,
  tickets:     () => <Icon d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />,
  branches:    () => <Icon d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" d2="M3 7h18M3 12h18" />,
  documents:   () => <Icon d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" d2="M14 2v6h6M16 13H8M16 17H8M10 9H8" />,
  profile:     () => <Icon d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" />,
  menu:        () => <Icon d="M4 6h16M4 10h16M4 14h16M4 18h16" />,
};

// ── Role-based nav ────────────────────────────────────────────────────────────

type NavItem = { label: string; href: string; icon: () => React.JSX.Element };
type NavSection = { title: string; items: NavItem[] };

function getNavSections(role: string | null, restaurantId: string | null): NavSection[] {
  const rid = restaurantId ?? '';

  switch (role) {
    case 'super_admin':
      return [
        {
          title: 'Platform',
          items: [
            { label: 'Dashboard',   href: '/dashboard',          icon: icons.dashboard },
            { label: 'Restaurants', href: '/restaurants',        icon: icons.restaurant },
            { label: 'Customers',   href: '/admin/customers',    icon: icons.customers },
          ],
        },
        {
          title: 'Ops',
          items: [
            { label: 'Orders',    href: '/admin/orders',   icon: icons.orders },
            { label: 'Tickets',   href: '/admin/tickets',  icon: icons.tickets },
            { label: 'Payments',  href: '/payments',       icon: icons.payments },
            { label: 'Team',      href: '/users',          icon: icons.users },
          ],
        },
        {
          title: 'Delivery',
          items: [
            { label: 'Analytics',     href: '/delivery/analytics',   icon: icons.analytics },
            { label: 'Partners',      href: '/delivery/partners',    icon: icons.rider },
            { label: 'Assignments',   href: '/delivery/assignments', icon: icons.delivery },
            { label: 'Live Tracking', href: '/delivery/tracking',    icon: icons.tracking },
            { label: 'Support',       href: '/delivery/support',     icon: icons.support },
            { label: 'Payouts',       href: '/delivery/payouts',     icon: icons.payout },
          ],
        },
      ];

    case 'sales_operator':
      return [
        {
          title: 'Pipeline',
          items: [
            { label: 'Dashboard',   href: '/dashboard',    icon: icons.dashboard },
            { label: 'Restaurants', href: '/restaurants',  icon: icons.restaurant },
          ],
        },
        {
          title: 'Service',
          items: [
            { label: 'Orders',  href: '/restaurants/orders', icon: icons.orders },
            { label: 'Tickets', href: '/admin/tickets',      icon: icons.tickets },
          ],
        },
      ];

    case 'restaurant_owner':
    case 'restaurant_admin':
    case 'restaurant_manager':
      return [
        {
          title: 'My Restaurant',
          items: [
            { label: 'Dashboard', href: '/dashboard',                          icon: icons.dashboard },
            { label: 'Profile',   href: rid ? `/restaurants/${rid}` : '/restaurants', icon: icons.profile },
            { label: 'Branches',  href: rid ? `/restaurants/${rid}/branches` : '/restaurants', icon: icons.branches },
          ],
        },
        {
          title: 'Service',
          items: [
            { label: 'Orders',    href: '/restaurants/orders',                        icon: icons.orders },
            { label: 'Documents', href: rid ? `/restaurants/${rid}/documents` : '/restaurants', icon: icons.documents },
          ],
        },
      ];

    case 'restaurant_staff':
      return [
        {
          title: 'Today',
          items: [
            { label: 'Dashboard', href: '/dashboard',          icon: icons.dashboard },
            { label: 'Orders',    href: '/restaurants/orders', icon: icons.orders },
          ],
        },
      ];

    default:
      return [
        {
          title: 'Overview',
          items: [
            { label: 'Dashboard', href: '/dashboard', icon: icons.dashboard },
          ],
        },
      ];
  }
}

const ROLE_LABELS: Record<string, string> = {
  restaurant_owner:   'Restaurant Owner',
  restaurant_admin:   'Restaurant Admin',
  restaurant_manager: 'Restaurant Manager',
  restaurant_staff:   'Restaurant Staff',
  sales_operator:     'Sales Operator',
  super_admin:        'Super Admin',
};

// ── Inner ─────────────────────────────────────────────────────────────────────

interface SidebarInnerProps {
  userRole: string | null;
  roleLabel: string;
  email: string | null;
  displayName: string | null;
  initials: string;
  pathname: string;
  restaurantId: string | null;
  onLogout: () => void;
  onLinkClick?: () => void;
}

function SidebarInner({
  userRole, roleLabel, email, displayName, initials,
  pathname, restaurantId, onLogout, onLinkClick,
}: SidebarInnerProps) {
  const navSections = getNavSections(userRole, restaurantId);

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      {/* Amber left-edge accent stripe */}
      <div
        className="pointer-events-none absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ background: 'linear-gradient(180deg, var(--accent) 0%, transparent 70%)', opacity: 0.75 }}
      />

      {/* Logo */}
      <div className="px-4 pb-3 pt-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--sb-bdr)] bg-[var(--surface-2)] p-1.5">
            <Image src="/foodeez-sidebar-logo.png" alt="Foodeez" width={28} height={28} className="h-full w-full object-contain" />
          </div>
          <div>
            <p className="font-display text-[15px] font-semibold leading-none tracking-tight text-[var(--sb-tx)]">Foodeez</p>
            <p className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.24em] text-[var(--sb-tx2)]">
              {roleLabel}
            </p>
          </div>
        </div>
        <div className="mt-3.5 h-px" style={{ background: 'linear-gradient(90deg, var(--accent), var(--accent-bright), transparent)', opacity: 0.4 }} />
      </div>

      {/* Nav */}
      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-1" style={{ scrollbarWidth: 'none' }}>
        {navSections.map((section) => (
          <div key={section.title} className="mb-4">
            <p className="mb-1.5 px-2 text-[9px] font-bold uppercase tracking-[0.24em] text-[var(--sb-tx2)] opacity-70">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
                const Ico = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onLinkClick}
                    className={[
                      'group flex items-center gap-2.5 rounded-lg border-l-[3px] px-2.5 py-[9px] text-[13px] font-medium no-underline transition-all',
                      isActive
                        ? 'border-[var(--accent)] text-[var(--accent)]'
                        : 'border-transparent text-[var(--sb-tx2)] hover:text-[var(--sb-tx)]',
                    ].join(' ')}
                    style={
                      isActive
                        ? { background: 'linear-gradient(90deg, var(--sb-active) 0%, rgba(220,95,43,0.03) 100%)' }
                        : undefined
                    }
                    onMouseEnter={(e) => {
                      if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--sb-hover)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) (e.currentTarget as HTMLElement).style.background = '';
                    }}
                  >
                    <span className={`shrink-0 transition-colors ${isActive ? 'text-[var(--accent)]' : 'text-[var(--sb-tx2)] group-hover:text-[var(--sb-tx)]'}`}>
                      <Ico />
                    </span>
                    <span className="truncate">{item.label}</span>
                    {isActive && (
                      <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom separator */}
      <div className="mx-3 h-px bg-[var(--sb-bdr)] opacity-60" />

      {/* User */}
      <div className="px-3 py-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-2" style={{ background: 'var(--sb-2)' }}>
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
            style={{
              background: 'linear-gradient(135deg, var(--accent), var(--accent-light, var(--accent-bright)))',
              color: '#FFFFFF',
            }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-semibold text-[var(--sb-tx)]">{displayName || roleLabel}</p>
            <p className="truncate text-[10px] text-[var(--sb-tx2)]">{email ?? roleLabel}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-[var(--sb-tx2)] transition-all hover:bg-rose-500/10 hover:text-rose-400"
        >
          {icons.logout()}
          Sign out
        </button>
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface SideBarProps { mobileOpen?: boolean; onClose?: () => void; }

export default function SideBar({ mobileOpen = false, onClose }: SideBarProps) {
  const pathname = usePathname() ?? '/dashboard';
  const router   = useRouter();
  const [userRole,     setUserRole]     = useState<string | null>(null);
  const [email,        setEmail]        = useState<string | null>(null);
  const [displayName,  setDisplayName]  = useState<string | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  useEffect(() => {
    setUserRole(getUserRole());
    setEmail(getUserEmail());
    setDisplayName(getUserDisplayName());
    setRestaurantId(getUserRestaurantId());
  }, [pathname]);

  const roleLabel = ROLE_LABELS[userRole ?? 'super_admin'] ?? 'Admin';
  const name      = displayName || roleLabel;
  const initials  = name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  const handleLogout = () => { clearToken(); router.push('/auth/login'); };

  const innerProps: SidebarInnerProps = {
    userRole, roleLabel, email, displayName, initials,
    pathname, restaurantId, onLogout: handleLogout,
  };

  const asideClass = 'flex flex-col overflow-hidden border border-[var(--sb-bdr)] shadow-[var(--shadow-card)]';
  const asideStyle = { background: 'var(--sb-bg)' };

  return (
    <>
      {/* Desktop */}
      <aside
        className={`hidden h-full min-h-0 w-56 shrink-0 rounded-xl lg:flex lg:sticky lg:top-0 lg:self-start ${asideClass}`}
        style={asideStyle}
      >
        <SidebarInner {...innerProps} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={onClose} aria-hidden="true" />
          <aside
            className={`fixed inset-y-0 left-0 z-50 flex w-56 flex-col lg:hidden ${asideClass}`}
            style={asideStyle}
          >
            <SidebarInner {...innerProps} onLinkClick={onClose} />
          </aside>
        </>
      )}
    </>
  );
}
