'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, restaurantOrdersApi } from '../../lib/api';
import { getUserRole, getUserRestaurantId } from '../../lib/auth';
import AuthGuard from '../components/AuthGuard';

// ── Count-up animation hook ───────────────────────────────────────────────────

function useCountUp(target: number, duration = 1200) {
  const [count, setCount] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return count;
}

// ── Formatted number display ──────────────────────────────────────────────────

function AnimatedNumber({ value }: { value: string | number }) {
  const isNum = typeof value === 'number';
  const count = useCountUp(isNum ? value : 0);
  if (!isNum) {
    return (
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    );
  }
  return (
    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
      {count.toLocaleString('en-IN')}
    </span>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

type RestaurantSummary = {
  restaurantId: string; restaurantName: string; status: string;
  onboardingStep: number; leadStatus: string;
  activeBranches: number; offlineBranches: number; totalBranches: number;
  branchMetrics: Array<{
    id: string; name: string; isOnline: boolean;
    openingTime: string | null; closingTime: string | null;
    busyMode: boolean; temporaryClosure: boolean;
  }>;
};

type AdminSummary = {
  totalRestaurants: number;
  statusBreakdown: Record<string, number>;
  recentRestaurants: Array<{
    id: string; name: string; status: string;
    leadStatus: string; onboardingStep: number; createdAt: string;
  }>;
};

type ActiveOrder = {
  id: string;
  orderNumber?: string;
  status: string;
  amount?: number;
  grandTotal?: number;
  customer?: { name?: string };
  createdAt: string;
};

const ACTIVE_ORDER_STATUSES = ['PLACED', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP'];

const ORDER_STATUS_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  PLACED:            { bg: 'rgba(245,158,11,0.12)', color: '#d97706',  border: 'rgba(245,158,11,0.35)' },
  CONFIRMED:         { bg: 'rgba(56,189,248,0.10)', color: '#0284c7',  border: 'rgba(56,189,248,0.30)' },
  PREPARING:         { bg: 'rgba(139,92,246,0.10)', color: '#7c3aed',  border: 'rgba(139,92,246,0.30)' },
  READY_FOR_PICKUP:  { bg: 'rgba(16,185,129,0.10)', color: '#059669',  border: 'rgba(16,185,129,0.30)' },
};

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

const ROLE_LABELS: Record<string, string> = {
  restaurant_owner: 'Restaurant Owner', restaurant_admin: 'Restaurant Admin',
  restaurant_manager: 'Restaurant Manager', restaurant_staff: 'Restaurant Staff',
  sales_operator: 'Sales Operator', super_admin: 'Super Admin',
};

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  active:   'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400',
  pending:  'bg-[var(--accent-muted)] text-[var(--accent)] border-[var(--accent)]/30',
  review:   'bg-sky-500/10 text-sky-600 border-sky-500/30 dark:text-sky-400',
  rejected: 'bg-rose-500/10 text-rose-600 border-rose-500/30 dark:text-rose-400',
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status.toLowerCase()] ?? 'bg-[var(--surface-2)] text-[var(--tx-3)] border-[var(--border)]';
  return (
    <span className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${cls}`}>
      {status}
    </span>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, gold, icon, href, onClick, selected,
}: {
  label: string; value: string | number; sub?: string; gold?: boolean;
  icon: React.ReactNode;
  href?: string; onClick?: () => void; selected?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const active = hovered || selected;

  const card = (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      className={[
        'relative flex flex-col gap-4 rounded-2xl border p-5 overflow-hidden',
        'transition-all duration-300 ease-out',
        onClick ? 'cursor-pointer focus:outline-none' : '',
      ].filter(Boolean).join(' ')}
      style={{
        background: active
          ? 'linear-gradient(145deg, color-mix(in srgb, var(--accent) 6%, var(--surface)) 0%, var(--surface) 100%)'
          : gold
          ? 'linear-gradient(145deg, var(--surface) 0%, var(--surface-2) 100%)'
          : 'var(--surface)',
        borderColor: active ? 'var(--accent)' : selected ? 'var(--accent)' : 'var(--border)',
        boxShadow: active
          ? '0 0 0 2px var(--accent-muted), 0 8px 32px var(--accent-glow), 0 2px 8px rgba(0,0,0,0.08)'
          : gold ? 'var(--gold-glow)' : 'var(--shadow-card)',
        transform: active ? 'translateY(-4px) scale(1.01)' : 'translateY(0) scale(1)',
      }}
    >
      {/* Purple radial glow overlay on hover */}
      <div
        className="pointer-events-none absolute -top-6 -left-6 h-24 w-24 rounded-full transition-opacity duration-300"
        style={{
          background: 'radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)',
          opacity: active ? 1 : 0,
        }}
      />

      {/* Icon */}
      <div
        className="flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300"
        style={{
          background: active ? 'var(--accent)' : gold ? 'var(--accent-muted)' : 'var(--surface-2)',
          color: active ? '#fff' : gold ? 'var(--accent)' : 'var(--tx-3)',
          boxShadow: active ? '0 4px 12px var(--accent-glow)' : 'none',
          transform: active ? 'scale(1.08)' : 'scale(1)',
        }}
      >
        {icon}
      </div>

      {/* Text */}
      <div className="space-y-1">
        <p
          className="text-[10px] font-bold uppercase tracking-[0.18em] transition-colors duration-300"
          style={{ color: active ? 'var(--accent)' : 'var(--tx-3)' }}
        >
          {label}
        </p>
        {/* Separator — grows and turns accent on hover */}
        <div
          className="h-px transition-all duration-300"
          style={{
            width: active ? '3rem' : '2rem',
            background: active
              ? 'linear-gradient(90deg, var(--accent), var(--accent-bright))'
              : gold ? 'var(--accent)' : 'var(--border)',
          }}
        />
        <p className="pt-1 font-display text-4xl font-extrabold leading-none tracking-tight" style={{ color: 'var(--tx)' }}>
          <AnimatedNumber value={value} />
        </p>
        {sub && (
          <p
            className="pt-1 text-[11px] leading-snug transition-colors duration-300"
            style={{ color: active ? 'var(--accent-light)' : 'var(--tx-3)' }}
          >
            {sub}
          </p>
        )}
      </div>

      {/* Bottom shimmer line — always for gold, appears on hover for others */}
      <div
        className="absolute inset-x-0 bottom-0 h-[2px] rounded-b-2xl transition-opacity duration-300"
        style={{
          background: 'linear-gradient(90deg, var(--accent), var(--accent-bright), transparent)',
          opacity: active || gold ? 1 : 0,
        }}
      />
    </div>
  );

  return href ? <Link href={href} className="block">{card}</Link> : card;
}

// ── Distribution bar ──────────────────────────────────────────────────────────

function DistributionBar({ breakdown, total }: { breakdown: Record<string, number>; total: number }) {
  if (total === 0) return <p className="text-sm" style={{ color: 'var(--tx-3)' }}>No data yet.</p>;
  const segments = [
    { key: 'active',   color: '#10b981', label: 'Active'   },
    { key: 'pending',  color: '#DC5F2B', label: 'Pending'  },
    { key: 'review',   color: '#38bdf8', label: 'Review'   },
    { key: 'rejected', color: '#f43f5e', label: 'Rejected' },
  ].filter((s) => (breakdown[s.key] ?? 0) > 0);

  return (
    <div className="space-y-3">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full gap-0.5">
        {segments.map((s) => (
          <div
            key={s.key}
            title={`${s.label}: ${breakdown[s.key]}`}
            style={{ width: `${((breakdown[s.key] ?? 0) / total) * 100}%`, background: s.color }}
            className="h-full first:rounded-l-full last:rounded-r-full"
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1.5">
        {segments.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--tx-2)' }}>
            <span className="h-2 w-2 rounded-full shrink-0" style={{ background: s.color }} />
            {s.label}
            <span className="font-semibold" style={{ color: 'var(--tx)' }}>{breakdown[s.key] ?? 0}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Section card shell ────────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border ${className}`}
      style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-card)' }}
    >
      {children}
    </div>
  );
}

function CardHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-between border-b px-5 py-4"
      style={{ borderColor: 'var(--border-sub)' }}
    >
      <p className="text-sm font-semibold" style={{ color: 'var(--tx)' }}>{title}</p>
      {action}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [data,     setData]     = useState<RestaurantSummary | AdminSummary | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [branchStatusFilter, setBranchStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  const fetchActiveOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const res = await restaurantOrdersApi.list(1, 20, { status: 'PLACED,CONFIRMED,PREPARING,READY_FOR_PICKUP' });
      const payload = res.data;
      const raw: ActiveOrder[] = Array.isArray(payload.data) ? payload.data : (Array.isArray(payload) ? payload : []);
      // keep only the active statuses and sort newest first
      const active = raw
        .filter((o) => ACTIVE_ORDER_STATUSES.includes(o.status))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 8);
      setActiveOrders(active);
    } catch {
      // silently ignore — dashboard still works without live orders
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    const role = getUserRole();
    setUserRole(role);
    getUserRestaurantId();
    api.get('/dashboard')
      .then((r) => setData(r.data))
      .catch(() => setError('Unable to load dashboard data.'))
      .finally(() => setLoading(false));

    // Only poll orders for restaurant roles
    const isRestaurantRole = ['restaurant_owner', 'restaurant_admin', 'restaurant_manager', 'restaurant_staff'].includes(role ?? '');
    if (isRestaurantRole) {
      fetchActiveOrders();
      const interval = setInterval(fetchActiveOrders, 30_000);
      return () => clearInterval(interval);
    }
  }, [fetchActiveOrders]);

  const isAdmin   = userRole === 'super_admin' || userRole === 'sales_operator';
  const roleLabel = ROLE_LABELS[userRole ?? ''] ?? 'Partner';
  const welcomeTitle = !loading && data
    ? (isAdmin ? `Welcome back, ${roleLabel.split(' ')[0]}` : `${(data as RestaurantSummary).restaurantName}`)
    : '';

  return (
    <AuthGuard>
      <div className="min-h-screen space-y-5 p-4 sm:p-6" style={{ background: 'var(--bg)' }}>

        {/* ── Hero header ─────────────────────────────────────────────── */}
        <div
          className="relative overflow-hidden rounded-2xl border px-6 py-5"
          style={{
            background: 'linear-gradient(135deg, var(--surface) 0%, var(--surface-2) 100%)',
            borderColor: 'var(--border)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          {/* Top accent stripe */}
          <div
            className="absolute inset-x-0 top-0 h-[3px] rounded-t-2xl"
            style={{ background: 'linear-gradient(90deg, var(--accent), var(--accent-bright), transparent)' }}
          />
          {/* Soft radial glow */}
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-40"
            style={{ background: 'radial-gradient(circle, var(--accent-muted), transparent 70%)' }}
          />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--accent)' }}>
                Foodeez Performance
              </p>
              {loading ? (
                <div className="h-7 w-52 animate-pulse rounded-lg" style={{ background: 'var(--surface-2)' }} />
              ) : (
                <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--tx)' }}>
                  {welcomeTitle}
                </h1>
              )}
              <p className="text-xs" style={{ color: 'var(--tx-3)' }}>
                {isAdmin ? 'Platform overview · restaurant status' : 'Branch operations · live status'} · {today}
              </p>
            </div>

            <div
              className="flex w-fit items-center gap-2 rounded-xl border px-3.5 py-2"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
              <span className="text-xs font-semibold" style={{ color: 'var(--tx-2)' }}>Live</span>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-500">
            {error}
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl" style={{ background: 'var(--surface)' }} />
            ))}
          </div>
        )}

        {/* ── Admin view ──────────────────────────────────────────────── */}
        {!loading && isAdmin && data && (() => {
          const d        = data as AdminSummary;
          const total    = d.totalRestaurants;
          const active   = d.statusBreakdown['active']   ?? 0;
          const pending  = d.statusBreakdown['pending']  ?? 0;
          const review   = d.statusBreakdown['review']   ?? 0;
          const rejected = d.statusBreakdown['rejected'] ?? 0;
          const onboarding = pending + review;

          return (
            <>
              {/* Stat cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  href="/restaurants" gold
                  label="Total Restaurants" value={total}
                  sub={`${active} active right now`}
                  icon={<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.75}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>}
                />
                <StatCard
                  href="/restaurants?status=active"
                  label="Active" value={active}
                  sub={total > 0 ? `${Math.round((active / total) * 100)}% of fleet` : '—'}
                  icon={<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.75}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
                />
                <StatCard
                  href="/admin/restaurants?status=review"
                  label="In Onboarding" value={onboarding}
                  sub={`${pending} pending · ${review} in review`}
                  icon={<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.75}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
                />
                <StatCard
                  href="/restaurants?status=rejected"
                  label="Rejected" value={rejected}
                  sub="Needs attention"
                  icon={<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.75}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>}
                />
              </div>

              {/* Distribution + Quick actions */}
              <div className="grid gap-4 lg:grid-cols-3">
                {/* Distribution */}
                <Card className="lg:col-span-2 p-5">
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--tx-3)' }}>
                    Status Distribution
                  </p>
                  <p className="mb-4 text-xs" style={{ color: 'var(--tx-3)' }}>{total} restaurants total</p>
                  <DistributionBar breakdown={d.statusBreakdown} total={total} />
                </Card>

                {/* Quick actions */}
                <Card className="p-5">
                  <p className="mb-4 text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--tx-3)' }}>
                    Quick Actions
                  </p>
                  <div className="flex flex-col gap-2">
                    {/* Primary — always dark text so it's readable on any accent shade */}
                    <Link
                      href="/restaurants/register"
                      className="flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-semibold no-underline transition hover:brightness-105 active:scale-[0.98]"
                      style={{
                        background: 'var(--btn-primary-bg)',
                        color: 'var(--btn-primary-color)',
                        boxShadow: 'var(--btn-primary-shadow)',
                        border: '1px solid var(--btn-primary-border)',
                      }}
                    >
                      Register Restaurant
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </Link>
                    <Link
                      href="/admin/restaurants?status=review"
                      className="flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm font-medium no-underline transition hover:brightness-95"
                      style={{ borderColor: 'rgba(56,189,248,0.35)', background: 'rgba(56,189,248,0.08)', color: '#0284c7' }}
                    >
                      Pending Approvals{review > 0 ? ` (${review})` : ''}
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </Link>
                    <Link
                      href="/restaurants"
                      className="flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm font-medium no-underline transition"
                      style={{ borderColor: 'var(--border)', color: 'var(--tx-2)', background: 'var(--surface)' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; (e.currentTarget as HTMLElement).style.color = 'var(--tx)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface)'; (e.currentTarget as HTMLElement).style.color = 'var(--tx-2)'; }}
                    >
                      View All Restaurants
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </Link>
                    <Link
                      href="/users"
                      className="flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm font-medium no-underline transition"
                      style={{ borderColor: 'var(--border)', color: 'var(--tx-2)', background: 'var(--surface)' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; (e.currentTarget as HTMLElement).style.color = 'var(--tx)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface)'; (e.currentTarget as HTMLElement).style.color = 'var(--tx-2)'; }}
                    >
                      Manage Users
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </Link>
                  </div>
                </Card>
              </div>

              {/* Recent restaurants */}
              <Card>
                <CardHeader
                  title="Recent Restaurants"
                  action={
                    <Link href="/restaurants" className="text-xs font-medium no-underline" style={{ color: 'var(--accent)' }}>
                      View all →
                    </Link>
                  }
                />
                {d.recentRestaurants.length === 0 ? (
                  <div className="px-5 py-10 text-center text-sm" style={{ color: 'var(--tx-3)' }}>
                    No restaurants registered yet.
                  </div>
                ) : (
                  <div className="divide-y" style={{ borderColor: 'var(--border-sub)' }}>
                    {d.recentRestaurants.map((r) => (
                      <Link
                        key={r.id}
                        href={`/restaurants/${r.id}`}
                        className="group flex items-center gap-4 px-5 py-3.5 no-underline transition hover:bg-[var(--surface-2)]"
                      >
                        {/* Avatar */}
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
                          style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}
                        >
                          {r.name.charAt(0).toUpperCase()}
                        </div>
                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold" style={{ color: 'var(--tx)' }}>{r.name}</p>
                          <p className="text-xs" style={{ color: 'var(--tx-3)' }}>
                            Step {r.onboardingStep}/5 · {r.leadStatus}
                          </p>
                        </div>
                        {/* Status + arrow */}
                        <div className="flex shrink-0 items-center gap-3">
                          <StatusBadge status={r.status} />
                          <svg
                            className="h-4 w-4 opacity-0 transition group-hover:opacity-100"
                            style={{ color: 'var(--tx-3)' }}
                            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                          >
                            <path d="M9 18l6-6-6-6"/>
                          </svg>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </Card>
            </>
          );
        })()}

        {/* ── Restaurant admin view ────────────────────────────────────── */}
        {!loading && !isAdmin && data && (() => {
          const d = data as RestaurantSummary;

          if (!d.restaurantId) {
            return (
              <Card className="p-5">
                <p className="text-sm" style={{ color: 'var(--tx-3)' }}>
                  Your account is not linked to a restaurant yet. Contact your administrator.
                </p>
              </Card>
            );
          }

          const pct = Math.round((d.onboardingStep / 5) * 100);

          const filteredBranches = d.branchMetrics.filter((b) => {
            if (branchStatusFilter === 'online')  return b.isOnline;
            if (branchStatusFilter === 'offline') return !b.isOnline;
            return true;
          });

          return (
            <>
              {/* Stat cards */}
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard
                  gold
                  label="Total Branches" value={d.totalBranches}
                  sub={`${d.activeBranches} online · ${d.offlineBranches} offline`}
                  icon={<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.75}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>}
                  onClick={() => setBranchStatusFilter('all')}
                  selected={branchStatusFilter === 'all'}
                />
                <StatCard
                  label="Online" value={d.activeBranches}
                  sub="Currently serving orders"
                  icon={<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.75}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
                  onClick={() => setBranchStatusFilter('online')}
                  selected={branchStatusFilter === 'online'}
                />
                <StatCard
                  label="Offline" value={d.offlineBranches}
                  sub="Not accepting orders"
                  icon={<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.75}><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>}
                  onClick={() => setBranchStatusFilter('offline')}
                  selected={branchStatusFilter === 'offline'}
                />
              </div>

              {/* ── Live Orders ──────────────────────────────────── */}
              {(() => {
                const placed = activeOrders.filter((o) => o.status === 'PLACED');
                const hasUrgent = placed.length > 0;
                return (
                  <Card>
                    {/* Header */}
                    <div
                      className="flex items-center justify-between border-b px-5 py-4"
                      style={{ borderColor: 'var(--border-sub)' }}
                    >
                      <div className="flex items-center gap-2.5">
                        {/* Pulsing dot — amber when new PLACED orders, green otherwise */}
                        <span className="relative flex h-2.5 w-2.5 shrink-0">
                          <span
                            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                            style={{ background: hasUrgent ? '#f59e0b' : '#10b981' }}
                          />
                          <span
                            className="relative inline-flex h-2.5 w-2.5 rounded-full"
                            style={{ background: hasUrgent ? '#f59e0b' : '#10b981' }}
                          />
                        </span>
                        <p className="text-sm font-semibold" style={{ color: 'var(--tx)' }}>
                          Live Orders
                        </p>
                        {activeOrders.length > 0 && (
                          <span
                            className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                            style={{
                              background: hasUrgent ? 'rgba(245,158,11,0.15)' : 'var(--accent-muted)',
                              color: hasUrgent ? '#d97706' : 'var(--accent)',
                            }}
                          >
                            {activeOrders.length} active
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {ordersLoading && (
                          <span className="text-[11px]" style={{ color: 'var(--tx-3)' }}>Refreshing…</span>
                        )}
                        <Link
                          href="/restaurants/orders"
                          className="text-xs font-medium no-underline"
                          style={{ color: 'var(--accent)' }}
                        >
                          View all →
                        </Link>
                      </div>
                    </div>

                    {/* Body */}
                    {activeOrders.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
                        <svg viewBox="0 0 24 24" className="h-8 w-8 opacity-25" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ color: 'var(--tx-3)' }}>
                          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                        </svg>
                        <p className="text-sm" style={{ color: 'var(--tx-3)' }}>No active orders right now</p>
                      </div>
                    ) : (
                      <div className="divide-y" style={{ borderColor: 'var(--border-sub)' }}>
                        {activeOrders.map((o) => {
                          const style = ORDER_STATUS_STYLES[o.status] ?? { bg: 'var(--surface-2)', color: 'var(--tx-3)', border: 'var(--border)' };
                          const isNew = o.status === 'PLACED';
                          return (
                            <Link
                              key={o.id}
                              href={`/restaurants/orders/${o.id}`}
                              className="group flex items-center gap-3 px-5 py-3 no-underline transition"
                              style={{
                                background: isNew ? 'rgba(245,158,11,0.04)' : 'transparent',
                              }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = isNew ? 'rgba(245,158,11,0.04)' : 'transparent'; }}
                            >
                              {/* Urgency stripe */}
                              {isNew && (
                                <span className="h-8 w-1 shrink-0 rounded-full" style={{ background: '#f59e0b' }} />
                              )}

                              {/* Order info */}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--tx)' }}>
                                    {o.orderNumber ? `#${o.orderNumber}` : `#${o.id.slice(-6).toUpperCase()}`}
                                  </p>
                                  {isNew && (
                                    <span className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide animate-pulse"
                                      style={{ background: 'rgba(245,158,11,0.2)', color: '#d97706' }}>
                                      New
                                    </span>
                                  )}
                                </div>
                                <p className="mt-0.5 text-xs truncate" style={{ color: 'var(--tx-3)' }}>
                                  {o.customer?.name ?? 'Customer'} · {timeAgo(o.createdAt)}
                                </p>
                              </div>

                              {/* Amount */}
                              <p className="shrink-0 text-sm font-semibold" style={{ color: 'var(--tx)' }}>
                                ₹{Number(o.amount ?? o.grandTotal ?? 0).toFixed(0)}
                              </p>

                              {/* Status badge */}
                              <span
                                className="shrink-0 rounded-lg border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
                                style={{ background: style.bg, color: style.color, borderColor: style.border }}
                              >
                                {o.status.replace(/_/g, ' ')}
                              </span>

                              {/* Arrow */}
                              <svg className="h-4 w-4 shrink-0 opacity-0 transition group-hover:opacity-100"
                                style={{ color: 'var(--tx-3)' }}
                                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <path d="M9 18l6-6-6-6"/>
                              </svg>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                );
              })()}

              {/* Onboarding progress + quick actions */}
              <div className="grid gap-4 lg:grid-cols-3">
                {/* Onboarding */}
                <Card className="lg:col-span-2 p-5">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--tx-3)' }}>
                        Onboarding Progress
                      </p>
                      <p className="mt-1 text-base font-semibold" style={{ color: 'var(--tx)' }}>
                        {d.restaurantName}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge status={d.status} />
                      <span className="text-xs font-semibold" style={{ color: 'var(--tx-2)' }}>
                        Step {d.onboardingStep}/5
                      </span>
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: 'var(--surface-2)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--accent), var(--accent-bright))' }}
                    />
                  </div>
                  <p className="mt-2 text-xs" style={{ color: 'var(--tx-3)' }}>
                    {pct}% complete · {d.leadStatus}
                  </p>
                </Card>

                {/* Quick actions */}
                <Card className="p-5">
                  <p className="mb-4 text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--tx-3)' }}>
                    Quick Actions
                  </p>
                  <div className="flex flex-col gap-2">
                    <Link
                      href={`/restaurants/${d.restaurantId}`}
                      className="flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-semibold no-underline transition hover:brightness-95"
                      style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', color: '#FFFFFF' }}
                    >
                      Manage Restaurant
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </Link>
                    <Link
                      href={`/restaurants/${d.restaurantId}/branches`}
                      className="flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm font-medium no-underline transition"
                      style={{ borderColor: 'var(--border)', color: 'var(--tx-2)', background: 'var(--surface)' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; (e.currentTarget as HTMLElement).style.color = 'var(--tx)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface)'; (e.currentTarget as HTMLElement).style.color = 'var(--tx-2)'; }}
                    >
                      View Branches
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </Link>
                  </div>
                </Card>
              </div>

              {/* Branch list */}
              {d.branchMetrics.length > 0 && (
                <Card>
                  <CardHeader
                    title="Branch Status"
                    action={
                      <div className="flex gap-1">
                        {(['all', 'online', 'offline'] as const).map((f) => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => setBranchStatusFilter(f)}
                            className="rounded-lg px-2.5 py-1 text-xs font-medium capitalize transition"
                            style={{
                              background: branchStatusFilter === f ? 'var(--accent-muted)' : 'transparent',
                              color: branchStatusFilter === f ? 'var(--accent)' : 'var(--tx-3)',
                            }}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    }
                  />
                  {filteredBranches.length === 0 ? (
                    <div className="px-5 py-8 text-center text-sm" style={{ color: 'var(--tx-3)' }}>
                      No {branchStatusFilter !== 'all' ? branchStatusFilter : ''} branches found.
                    </div>
                  ) : (
                    <div className="divide-y" style={{ borderColor: 'var(--border-sub)' }}>
                      {filteredBranches.map((b) => (
                        <div key={b.id} className="flex items-center gap-4 px-5 py-3.5">
                          {/* Status dot */}
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ background: b.isOnline ? '#10b981' : 'var(--tx-3)' }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold" style={{ color: 'var(--tx)' }}>{b.name}</p>
                            <p className="mt-0.5 text-xs" style={{ color: 'var(--tx-3)' }}>
                              {b.openingTime && b.closingTime
                                ? `${b.openingTime} – ${b.closingTime}`
                                : 'Hours not set'}
                              {b.busyMode ? ' · Busy mode' : ''}
                              {b.temporaryClosure ? ' · Temporarily closed' : ''}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-lg border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                              b.isOnline
                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--tx-3)]'
                            }`}
                          >
                            {b.isOnline ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              )}
            </>
          );
        })()}

      </div>
    </AuthGuard>
  );
}