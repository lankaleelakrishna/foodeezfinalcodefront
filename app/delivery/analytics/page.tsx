'use client';

import { useEffect, useState } from 'react';
import AuthGuard from '../../components/AuthGuard';
import { deliveryAnalyticsApi } from '../../../lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

type Overview = {
  totalDeliveries: number;
  deliveredCount: number;
  cancelledCount: number;
  successRate: number;
  avgDurationMins: number;
  activeRiders: number;
  delayedDeliveries: number;
};

type RiderPerf = {
  id: string;
  name: string;
  phone: string;
  vehicleType: string;
  totalDeliveries: number;
  rating: number;
  totalEarnings: number;
  recentDeliveries?: number;
};

type OrderAnalytics = {
  byStatus: { status: string; count: number }[];
  hourlyVolume: { hour: number; count: number }[];
  topRestaurants: { restaurantId: string; name?: string; count: number }[];
};

type EarningsAnalytics = {
  totalPayout: number;
  byType: { type: string; amount: number }[];
};

type TabKey = 'overview' | 'riders' | 'orders' | 'earnings';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n);
}

function pct(n: number) {
  return `${Number(n).toFixed(1)}%`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition">
      <div className="h-2 w-12 rounded-full bg-slate-100" />
      <p className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function HourlyBar({ data }: { data: { hour: number; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-0.5 h-24 mt-2">
      {data.map((d) => (
        <div key={d.hour} className="group relative flex-1 flex flex-col items-center justify-end h-full">
          <div
            className="w-full rounded-t bg-[#B88A2E]/50 group-hover:bg-[#B88A2E] transition-colors min-h-[2px]"
            style={{ height: `${Math.max((d.count / max) * 100, 2)}%` }}
          />
          {d.hour % 4 === 0 && (
            <p className="text-[8px] text-slate-400 mt-0.5 leading-none">{d.hour}h</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DeliveryAnalyticsPage() {
  const [tab, setTab] = useState<TabKey>('overview');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [overview, setOverview] = useState<Overview | null>(null);
  const [riders, setRiders] = useState<RiderPerf[]>([]);
  const [riderTotal, setRiderTotal] = useState(0);
  const [riderPage, setRiderPage] = useState(1);
  const riderLimit = 20;
  const [orderAnalytics, setOrderAnalytics] = useState<OrderAnalytics | null>(null);
  const [earnings, setEarnings] = useState<EarningsAnalytics | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    const f = from || undefined;
    const t = to || undefined;
    let req: Promise<any>;
    if (tab === 'overview') req = deliveryAnalyticsApi.overview(f, t).then((r) => setOverview(r.data));
    else if (tab === 'riders') req = deliveryAnalyticsApi.riders(riderPage, riderLimit).then((r) => {
      const raw = r.data;
      const items = Array.isArray(raw) ? raw : (raw?.items ?? raw?.data ?? []);
      setRiders(Array.isArray(items) ? items : []);
      setRiderTotal(raw?.total ?? raw?.count ?? (Array.isArray(items) ? items.length : 0));
    });
    else if (tab === 'orders') req = deliveryAnalyticsApi.orders(f, t).then((r) => setOrderAnalytics(r.data));
    else req = deliveryAnalyticsApi.earnings(f, t).then((r) => setEarnings(r.data));
    req.catch(() => setError('Failed to load analytics.')).finally(() => setLoading(false));
  }, [tab, from, to, riderPage]);

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'riders',   label: 'Rider Performance' },
    { key: 'orders',   label: 'Order Analytics' },
    { key: 'earnings', label: 'Earnings' },
  ];

  return (
    <AuthGuard requiredRoles={['super_admin']}>
      <div className="space-y-6">

        {/* Header */}
        <div className="overflow-hidden rounded-[2rem] bg-white p-8 shadow-[0_24px_64px_rgba(15,23,42,0.08)]">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-[#B88A2E]/90">Delivery</p>
            <h1 className="mt-4 text-4xl font-semibold text-slate-900">Analytics</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">Delivery performance metrics and trends.</p>
          </div>
        </div>

        {/* Tabs + date filters */}
        <div className="rounded-[2rem] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex flex-wrap gap-2">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    tab === t.key ? 'bg-[#B88A2E]/10 text-[#B88A2E]' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {tab !== 'riders' && (
              <div className="flex items-center gap-2">
                <input
                  type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#B88A2E]"
                />
                <span className="text-slate-400 text-sm">–</span>
                <input
                  type="date" value={to} onChange={(e) => setTo(e.target.value)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#B88A2E]"
                />
              </div>
            )}
          </div>

          {loading ? (
            <div className="mt-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : error ? (
            <p className="mt-6 text-sm text-rose-600">{error}</p>
          ) : (
            <div className="mt-6">

              {/* ── Overview ── */}
              {tab === 'overview' && overview && (
                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard label="Total Deliveries"  value={overview.totalDeliveries} />
                    <StatCard label="Delivered"         value={overview.deliveredCount} sub={`Success rate: ${pct(overview.successRate)}`} />
                    <StatCard label="Cancelled"         value={overview.cancelledCount} />
                    <StatCard label="Active Riders"     value={overview.activeRiders} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <StatCard label="Avg Duration"     value={`${Number(overview.avgDurationMins).toFixed(0)} min`} />
                    <StatCard label="Delayed"          value={overview.delayedDeliveries} />
                    <StatCard label="Success Rate"     value={pct(overview.successRate)} />
                  </div>
                </div>
              )}

              {/* ── Riders ── */}
              {tab === 'riders' && (
                <>
                  {riders.length === 0 ? (
                    <p className="text-sm text-slate-400">No rider data.</p>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-[0.16em] text-slate-400">
                              <th className="pb-3 pr-4 font-medium">Rider</th>
                              <th className="pb-3 pr-4 font-medium">Vehicle</th>
                              <th className="pb-3 pr-4 font-medium">Total Deliveries</th>
                              <th className="pb-3 pr-4 font-medium">Rating</th>
                              <th className="pb-3 font-medium">Total Earnings</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {riders.map((r) => (
                              <tr key={r.id} className="hover:bg-slate-50">
                                <td className="py-3 pr-4">
                                  <p className="font-medium text-slate-800">{r.name}</p>
                                  <p className="text-xs text-slate-400">{r.phone}</p>
                                </td>
                                <td className="py-3 pr-4 text-slate-600">{r.vehicleType}</td>
                                <td className="py-3 pr-4 tabular-nums text-slate-700">{r.totalDeliveries}</td>
                                <td className="py-3 pr-4 text-slate-700">⭐ {Number(r.rating).toFixed(1)}</td>
                                <td className="py-3 tabular-nums text-slate-700">{fmt(r.totalEarnings)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-6 flex items-center justify-between">
                        <p className="text-sm text-slate-500">{`${(riderPage - 1) * riderLimit + 1}–${Math.min(riderPage * riderLimit, riderTotal)} of ${riderTotal}`}</p>
                        <div className="flex gap-2">
                          <button onClick={() => setRiderPage((p) => Math.max(1, p - 1))} disabled={riderPage === 1} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40">Previous</button>
                          <button onClick={() => setRiderPage((p) => p + 1)} disabled={riderPage * riderLimit >= riderTotal} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40">Next</button>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* ── Orders ── */}
              {tab === 'orders' && orderAnalytics && (
                <div className="space-y-8">
                  <div>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Orders by Status</h3>
                    <div className="flex flex-wrap gap-3">
                      {orderAnalytics.byStatus?.map((s) => (
                        <div key={s.status} className="rounded-2xl bg-slate-50 px-4 py-3">
                          <p className="text-xs text-slate-500">{s.status.replace(/_/g, ' ')}</p>
                          <p className="text-2xl font-semibold text-slate-900">{s.count}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  {orderAnalytics.hourlyVolume?.length > 0 && (
                    <div>
                      <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Hourly Volume</h3>
                      <HourlyBar data={orderAnalytics.hourlyVolume} />
                    </div>
                  )}
                  {orderAnalytics.topRestaurants?.length > 0 && (
                    <div>
                      <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Top Restaurants</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-[0.16em] text-slate-400">
                              <th className="pb-3 pr-4 font-medium">Restaurant</th>
                              <th className="pb-3 font-medium">Orders</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {orderAnalytics.topRestaurants.map((r) => (
                              <tr key={r.restaurantId} className="hover:bg-slate-50">
                                <td className="py-3 pr-4 text-slate-700">{r.name ?? r.restaurantId.slice(0, 8) + '…'}</td>
                                <td className="py-3 tabular-nums text-slate-700">{r.count}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Earnings ── */}
              {tab === 'earnings' && earnings && (
                <div className="space-y-6">
                  <div className="rounded-[2rem] border border-[#B88A2E]/40 bg-[#B88A2E]/5 p-6">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#B88A2E]/80">Total Payout</p>
                    <p className="mt-2 text-4xl font-semibold text-slate-900">{fmt(earnings.totalPayout)}</p>
                  </div>
                  {earnings.byType?.length > 0 && (
                    <div>
                      <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Breakdown by Type</h3>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {earnings.byType.map((b) => (
                          <div key={b.type} className="rounded-2xl bg-slate-50 p-4">
                            <p className="text-sm text-slate-500">{b.type.replace(/_/g, ' ')}</p>
                            <p className="mt-2 text-2xl font-semibold text-slate-900">{fmt(b.amount)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
