'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { getUserRole, getUserRestaurantId } from '../../lib/auth';
import AuthGuard from '../components/AuthGuard';

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

const ROLE_LABELS: Record<string, string> = {
  restaurant_owner: 'Restaurant Owner', restaurant_admin: 'Restaurant Admin',
  restaurant_manager: 'Restaurant Manager', restaurant_staff: 'Restaurant Staff',
  sales_operator: 'Sales Operator', super_admin: 'Super Admin',
};

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  active:   'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  pending:  'bg-[var(--accent-muted)] text-[var(--accent)] border-[var(--accent)]/20',
  review:   'bg-sky-500/10 text-sky-500 border-sky-500/20',
  rejected: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status.toLowerCase()] ?? 'bg-[var(--surface-2)] text-[var(--tx-3)] border-[var(--border)]';
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}>
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
  href?: string;
  onClick?: () => void;
  selected?: boolean;
}) {
  const card = (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onClick(); } } : undefined}
      className={[
        'relative overflow-hidden rounded-xl border p-4 transition-all duration-300',
        onClick ? 'cursor-pointer focus:outline-none' : '',
        gold ? 'shadow-[var(--gold-glow)]' : 'shadow-[var(--shadow-card)]',
        selected ? 'ring-2 ring-[var(--accent)]/40' : '',
        'hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] hover:border-[var(--accent)]/30',
      ].join(' ')}
      style={{
        background: gold
          ? 'linear-gradient(135deg, var(--surface) 0%, var(--surface-2) 100%)'
          : 'var(--surface)',
        borderColor: gold ? 'rgba(220,95,43,0.35)' : 'var(--border)',
      }}
    >
      {/* Corner accent sweep */}
      <div
        className="absolute right-0 top-0 h-16 w-16 rounded-bl-3xl"
        style={{ background: gold ? 'var(--accent-muted)' : 'var(--surface-2)' }}
      />

      <div className="relative">
        <div
          className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg"
          style={
            gold
              ? { background: 'var(--accent-muted)', color: 'var(--accent)' }
              : { background: 'var(--surface-2)', color: 'var(--tx-3)' }
          }
        >
          {icon}
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--tx-3)' }}>{label}</p>
        <p className="mt-1 font-display text-3xl font-semibold" style={{ color: 'var(--tx)' }}>{value}</p>
        {sub && <p className="mt-1 text-[11px]" style={{ color: 'var(--tx-3)' }}>{sub}</p>}
        {gold && (
          <div className="absolute bottom-0 left-0 h-0.5 w-full" style={{ background: 'linear-gradient(90deg, var(--accent), var(--accent-bright), transparent)' }} />
        )}
      </div>
    </div>
  );

  return href ? <Link href={href} className="block">{card}</Link> : card;
}

// ── Mini chart bar ────────────────────────────────────────────────────────────

function DistributionBar({ breakdown, total }: { breakdown: Record<string, number>; total: number }) {
  if (total === 0) return null;
  const segments = [
    { key: 'active',   color: '#10b981', label: 'Active'  },
    { key: 'pending',  color: '#DC5F2B', label: 'Pending' },
    { key: 'review',   color: '#38bdf8', label: 'Review'  },
    { key: 'rejected', color: '#f43f5e', label: 'Rejected'},
  ].filter((s) => (breakdown[s.key] ?? 0) > 0);

  return (
    <div>
      <div className="flex h-2 w-full overflow-hidden rounded-full gap-0.5">
        {segments.map((s) => (
          <div
            key={s.key}
            style={{ width: `${((breakdown[s.key] ?? 0) / total) * 100}%`, background: s.color }}
            className="h-full rounded-full"
          />
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-[11px] text-[var(--tx-2)]">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
            {s.label} · <span className="font-semibold text-[var(--tx)]">{breakdown[s.key] ?? 0}</span>
          </span>
        ))}
      </div>
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
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  useEffect(() => {
    setUserRole(getUserRole());
    getUserRestaurantId();
    api.get('/dashboard')
      .then((r) => setData(r.data))
      .catch(() => setError('Unable to load dashboard data.'))
      .finally(() => setLoading(false));
  }, []);

  const isAdmin    = userRole === 'super_admin' || userRole === 'sales_operator';
  const roleLabel  = ROLE_LABELS[userRole ?? ''] ?? 'Partner';
  const welcomeTitle = !loading && data
    ? (isAdmin ? `Welcome back, ${roleLabel.split(' ')[0]}` : `${(data as RestaurantSummary).restaurantName}`)
    : '';

  return (
    <AuthGuard>
      <div className="space-y-3 p-1">

        {/* ── Hero header ── */}
        <div
          className="relative overflow-hidden rounded-xl border px-5 py-4"
          style={{
            background: 'linear-gradient(135deg, var(--surface) 0%, var(--surface-2) 100%)',
            borderColor: 'rgba(220,95,43,0.25)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          {/* Top amber stripe */}
          <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, var(--accent), var(--accent-bright), transparent)' }} />
          {/* Subtle radial glow */}
          <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full" style={{ background: 'radial-gradient(circle, var(--accent-muted) 0%, transparent 70%)' }} />

          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: 'var(--accent)' }}>
                Foodeez Performance
              </p>
              {loading ? (
                <div className="mt-1.5 h-7 w-48 animate-pulse rounded-lg" style={{ background: 'var(--surface-2)' }} />
              ) : (
                <h1 className="mt-1 font-display text-2xl font-semibold" style={{ color: 'var(--tx)' }}>{welcomeTitle}</h1>
              )}
              <p className="mt-1 text-[12px]" style={{ color: 'var(--tx-3)' }}>
                {isAdmin ? 'Platform overview and restaurant status' : 'Branch operations and status'} · {today}
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-lg border px-3 py-2" style={{ background: 'var(--surface-2)', borderColor: 'var(--border-sub)' }}>
              <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              <p className="text-[12px] font-medium" style={{ color: 'var(--tx-2)' }}>Live</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/8 px-4 py-3 text-[13px] text-rose-500">
            {error}
          </div>
        )}

        {loading && (
          <div className="grid gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-[var(--surface)]" />
            ))}
          </div>
        )}

        {/* ── Admin view ── */}
        {!loading && isAdmin && data && (() => {
          const d = data as AdminSummary;
          const total    = d.totalRestaurants;
          const active   = d.statusBreakdown['active']   ?? 0;
          const pending  = d.statusBreakdown['pending']  ?? 0;
          const review   = d.statusBreakdown['review']   ?? 0;
          const rejected = d.statusBreakdown['rejected'] ?? 0;
          const onboarding = pending + review;

          return (
            <>
              {/* Stat cards */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  href="/restaurants"
                  gold label="Total Restaurants" value={total}
                  sub={`${active} active right now`}
                  icon={<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.75}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>}
                />
                <StatCard
                  href="/restaurants?status=active"
                  label="Active" value={active}
                  sub={total > 0 ? `${Math.round((active / total) * 100)}% of fleet` : '—'}
                  icon={<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.75}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
                />
                <StatCard
                  href="/admin/restaurants?status=review"
                  label="In Onboarding" value={onboarding}
                  sub={`${pending} pending · ${review} in review`}
                  icon={<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.75}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
                />
                <StatCard
                  href="/restaurants?status=rejected"
                  label="Rejected" value={rejected}
                  sub="Needs attention"
                  icon={<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.75}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>}
                />
              </div>

              {/* Status distribution + quick actions */}
              <div className="grid gap-3 lg:grid-cols-3">
                {/* Distribution */}
                <div className="lg:col-span-2 rounded-xl border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-card)' }}>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--tx-3)' }}>Status Distribution</p>
                    <span className="text-[11px]" style={{ color: 'var(--tx-3)' }}>{total} total</span>
                  </div>
                  <DistributionBar breakdown={d.statusBreakdown} total={total} />
                </div>

                {/* Quick actions */}
                <div className="rounded-xl border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-card)' }}>
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--tx-3)' }}>Quick Actions</p>
                  <div className="space-y-2">
                    <Link href="/restaurants/register"
                      className="flex items-center justify-between rounded-lg px-3 py-2 text-[12px] font-semibold no-underline transition hover:opacity-90 hover:!text-[#FFFFFF]"
                      style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-bright))', color: '#FFFFFF' }}>
                      Register Restaurant
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </Link>
                    {review > 0 && (
                      <Link href="/admin/restaurants?status=review"
                        className="flex items-center justify-between rounded-lg border px-3 py-2 text-[12px] font-semibold no-underline transition"
                        style={{ borderColor: 'var(--info,#5B9BD5)', background: 'rgba(91,155,213,0.08)', color: '#5B9BD5' }}>
                        Review Restaurants ({review})
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                      </Link>
                    )}
                    <Link href="/restaurants"
                      className="flex items-center justify-between rounded-lg border px-3 py-2 text-[12px] font-medium no-underline transition hover:bg-[var(--surface-2)]"
                      style={{ borderColor: 'var(--border)', color: 'var(--tx-2)' }}>
                      View All Restaurants
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </Link>
                    <Link href="/users"
                      className="flex items-center justify-between rounded-lg border px-3 py-2 text-[12px] font-medium no-underline transition hover:bg-[var(--surface-2)]"
                      style={{ borderColor: 'var(--border)', color: 'var(--tx-2)' }}>
                      Manage Users
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Recent restaurants */}
              <div className="rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-card)' }}>
                <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--border-sub)' }}>
                  <p className="text-[13px] font-semibold" style={{ color: 'var(--tx)' }}>Recent Restaurants</p>
                  <Link href="/restaurants" className="text-[11px] font-medium no-underline" style={{ color: 'var(--accent)' }}>View all</Link>
                </div>
                {d.recentRestaurants.length === 0 ? (
                  <div className="px-4 py-8 text-center text-[13px] text-[var(--tx-3)]">No restaurants registered yet.</div>
                ) : (
                  <div className="divide-y divide-[var(--border-sub)]">
                    {d.recentRestaurants.map((r) => (
                      <Link key={r.id} href={`/restaurants/${r.id}`}
                        className="group flex items-center justify-between px-4 py-3 transition hover:bg-[var(--surface-2)]">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-muted)] text-[12px] font-bold text-[var(--accent)]">
                            {r.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-[var(--tx)]">{r.name}</p>
                            <p className="text-[11px] text-[var(--tx-3)]">
                              Step {r.onboardingStep}/5 · {r.leadStatus}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusBadge status={r.status} />
                          <svg className="h-3.5 w-3.5 text-[var(--tx-3)] opacity-0 transition group-hover:opacity-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M9 18l6-6-6-6"/>
                          </svg>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </>
          );
        })()}

        {/* ── Restaurant view ── */}
        {!loading && !isAdmin && data && (() => {
          const d = data as RestaurantSummary;

          if (!d.restaurantId) {
            return (
              <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-muted)] p-5 text-[13px] text-[var(--accent)]">
                Your account is not linked to a restaurant yet. Contact your administrator.
              </div>
            );
          }

          const pct = Math.round((d.onboardingStep / 5) * 100);

          return (
            <>
              {/* Stat cards */}
              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard
                  gold
                  label="Total Branches"
                  value={d.totalBranches}
                  sub={`${d.activeBranches} online · ${d.offlineBranches} offline`}
                  icon={<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.75}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>}
                  onClick={() => setBranchStatusFilter('all')}
                  selected={branchStatusFilter === 'all'}
                />
                <StatCard
                  label="Online"
                  value={d.activeBranches}
                  sub="Currently serving orders"
                  icon={<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.75}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
                  onClick={() => setBranchStatusFilter('online')}
                  selected={branchStatusFilter === 'online'}
                />
                <StatCard
                  label="Offline"
                  value={d.offlineBranches}
                  sub="Not accepting orders"
                  icon={<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.75}><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>}
                  onClick={() => setBranchStatusFilter('offline')}
                  selected={branchStatusFilter === 'offline'}
                />
              </div>

              {/* Onboarding + actions */}
              <div className="grid gap-3 lg:grid-cols-3">
                {/* Onboarding progress */}
                <div className="lg:col-span-2 rounded-xl border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-card)' }}>
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--tx-3)' }}>Onboarding Progress</p>
                      <p className="mt-0.5 text-[13px] font-semibold" style={{ color: 'var(--tx)' }}>{d.restaurantName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={d.status} />
                      <span className="text-[11px] font-semibold" style={{ color: 'var(--tx-2)' }}>Step {d.onboardingStep}/5</span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--surface-2)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--accent-2), var(--accent-bright))' }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px]" style={{ color: 'var(--tx-3)' }}>{pct}% complete · {d.leadStatus}</p>
                </div>

                {/* Quick actions */}
                <div className="rounded-xl border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-card)' }}>
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--tx-3)' }}>Quick Actions</p>
                  <div className="space-y-2">
                    <Link href={`/restaurants/${d.restaurantId}`}
                      className="flex items-center justify-between rounded-lg px-3 py-2 text-[12px] font-semibold no-underline transition hover:opacity-90"
                      style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-bright))', color: '#FFFFFF' }}>
                      Manage Restaurant
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </Link>
                    <Link href={`/restaurants/${d.restaurantId}/branches`}
                      className="flex items-center justify-between rounded-lg border px-3 py-2 text-[12px] font-medium no-underline transition hover:bg-[var(--surface-2)]"
                      style={{ borderColor: 'var(--border)', color: 'var(--tx-2)' }}>
                      View Branches
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Branch list */}
              {d.branchMetrics.length > 0 && (() => {
                const filteredBranchMetrics = d.branchMetrics.filter((b) => {
                  if (branchStatusFilter === 'online') return b.isOnline;
                  if (branchStatusFilter === 'offline') return !b.isOnline;
                  return true;
                });

                return (
                  <div className="rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-card)' }}>
                    <div className="border-b px-4 py-3" style={{ borderColor: 'var(--border-sub)' }}>
                      <p className="text-[13px] font-semibold" style={{ color: 'var(--tx)' }}>Branch Status</p>
                    </div>
                    {filteredBranchMetrics.length === 0 ? (
                      <div className="px-4 py-6 text-sm text-slate-500">
                        No {branchStatusFilter === 'online' ? 'online' : branchStatusFilter === 'offline' ? 'offline' : ''} branches found.
                      </div>
                    ) : (
                      <div className="divide-y divide-[var(--border-sub)]">
                        {filteredBranchMetrics.map((b) => (
                          <div key={b.id} className="flex items-center justify-between px-4 py-3">
                            <div>
                              <p className="text-[13px] font-semibold text-[var(--tx)]">{b.name}</p>
                              <p className="mt-0.5 text-[11px] text-[var(--tx-3)]">
                                {b.openingTime && b.closingTime ? `${b.openingTime} – ${b.closingTime}` : 'Hours not set'}
                                {b.busyMode ? ' · Busy mode' : ''}
                                {b.temporaryClosure ? ' · Temporarily closed' : ''}
                              </p>
                            </div>
                            <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                              b.isOnline
                                ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'
                                : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--tx-3)]'
                            }`}>
                              {b.isOnline ? 'Online' : 'Offline'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </>
          );
        })()}

      </div>
    </AuthGuard>
  );
}