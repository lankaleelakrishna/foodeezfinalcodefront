'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '../../components/AuthGuard';
import { restaurantOrdersApi } from '../../../lib/api';

const ORDER_STATUSES = ['PLACED', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'PICKED_UP', 'ON_THE_WAY', 'DELIVERED', 'CANCELLED', 'FAILED'];

const STATUS_PILL: Record<string, string> = {
  PLACED:           'bg-amber-100 text-amber-700',
  CONFIRMED:        'bg-sky-100 text-sky-700',
  PREPARING:        'bg-violet-100 text-violet-700',
  READY_FOR_PICKUP: 'bg-emerald-100 text-emerald-700',
  PICKED_UP:        'bg-orange-100 text-orange-700',
  ON_THE_WAY:       'bg-amber-200 text-amber-800',
  DELIVERED:        'bg-emerald-100 text-emerald-800',
  CANCELLED:        'bg-rose-100 text-rose-700',
  FAILED:           'bg-slate-100 text-slate-600',
};

// Quick actions visible directly on the list row
const QUICK_ACTIONS: Record<string, { label: string; next: string; cls: string }[]> = {
  PLACED: [
    { label: 'Accept',  next: 'CONFIRMED', cls: 'bg-emerald-500 text-white hover:bg-emerald-600' },
    { label: 'Reject',  next: 'CANCELLED', cls: 'bg-rose-500 text-white hover:bg-rose-600' },
  ],
  CONFIRMED: [
    { label: 'Preparing', next: 'PREPARING', cls: 'bg-violet-500 text-white hover:bg-violet-600' },
  ],
  PREPARING: [
    { label: 'Ready ✓', next: 'READY_FOR_PICKUP', cls: 'bg-emerald-500 text-white hover:bg-emerald-600' },
  ],
};

type Order = {
  id: string;
  orderNumber?: string;
  status: string;
  amount?: number;
  grandTotal?: number;
  restaurantLabel?: string;
  branchLabel?: string;
  customer?: { name?: string; email?: string };
  createdAt: string;
};

type Meta = { total: number; page: number; limit: number; totalPages: number };

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export default function RestaurantOrdersPage() {
  const router = useRouter();
  const [orders,  setOrders]  = useState<Order[]>([]);
  const [meta,    setMeta]    = useState<Meta>({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [search,  setSearch]  = useState('');
  const [status,  setStatus]  = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState<string | null>(null); // orderId being updated
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadOrders = useCallback(async (pageNumber = 1, silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = {};
      if (search)   params.search   = search;
      if (status)   params.status   = status;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo)   params.dateTo   = dateTo;
      const response = await restaurantOrdersApi.list(pageNumber, 20, params);
      const payload = response.data;
      const data = Array.isArray(payload.data) ? payload.data : payload;
      setOrders(data.map((o: any) => ({ ...o, amount: o.amount ?? o.grandTotal ?? 0 })));
      setMeta(payload.meta ?? { total: data.length, page: pageNumber, limit: 20, totalPages: 1 });
    } catch {
      if (!silent) setError('Unable to load restaurant orders.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [search, status, dateFrom, dateTo]);

  // Initial load + filter change
  useEffect(() => {
    setPage(1);
    loadOrders(1);
  }, [loadOrders]);

  // Auto-refresh every 30s (silent so no spinner)
  useEffect(() => {
    refreshRef.current = setInterval(() => loadOrders(page, true), 30_000);
    return () => { if (refreshRef.current) clearInterval(refreshRef.current); };
  }, [loadOrders, page]);

  const handlePage = (next: number) => { setPage(next); loadOrders(next); };

  const handleQuickAction = async (e: React.MouseEvent, orderId: string, nextStatus: string) => {
    e.stopPropagation();
    setBusy(orderId + nextStatus);
    try {
      const res = await restaurantOrdersApi.updateStatus(orderId, nextStatus);
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: res.data.status ?? nextStatus } : o));
    } catch {
      // silently ignore — user can open detail page for full error
    } finally {
      setBusy(null);
    }
  };

  const newOrderCount = orders.filter((o) => o.status === 'PLACED').length;

  return (
    <AuthGuard requiredRoles={['restaurant_owner', 'restaurant_admin', 'restaurant_manager', 'restaurant_staff', 'super_admin', 'sales_operator']}>
      <div className="space-y-5">

        {/* Header */}
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Restaurant Orders</h1>
              <p className="mt-1 text-sm text-slate-400">Manage and update orders from your branches.</p>
            </div>
            {newOrderCount > 0 && (
              <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
                </span>
                <span className="text-sm font-semibold text-amber-700">
                  {newOrderCount} new order{newOrderCount > 1 ? 's' : ''} waiting
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Search order or customer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-w-[180px] flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <option value="">All statuses</option>
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
          </div>
        </div>

        {error && <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

        {loading ? (
          <div className="rounded-2xl bg-white p-8 text-slate-400 shadow-sm">Loading orders…</div>
        ) : (
          <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">Orders</p>
                <p className="text-xs text-slate-400">Total: {meta.total}</p>
              </div>
              <p className="text-xs text-slate-400">Auto-refreshes every 30s</p>
            </div>

            {orders.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-400">No orders found.</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {orders.map((order) => {
                  const isNew = order.status === 'PLACED';
                  const actions = QUICK_ACTIONS[order.status] ?? [];
                  return (
                    <div
                      key={order.id}
                      onClick={() => router.push(`/restaurants/orders/${order.id}`)}
                      className="group flex cursor-pointer items-center gap-4 px-5 py-3.5 transition hover:bg-slate-50"
                      style={{ background: isNew ? 'rgba(245,158,11,0.04)' : undefined }}
                    >
                      {/* Urgency stripe for new orders */}
                      {isNew && <span className="h-10 w-1 shrink-0 rounded-full bg-amber-400" />}

                      {/* Order # + time */}
                      <div className="min-w-[110px]">
                        <p className="font-mono text-xs font-semibold text-slate-700">
                          {order.orderNumber ?? `#${order.id.slice(-6).toUpperCase()}`}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-400">{timeAgo(order.createdAt)}</p>
                      </div>

                      {/* Customer */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">{order.customer?.name ?? '—'}</p>
                        <p className="truncate text-xs text-slate-400">{order.branchLabel ?? order.restaurantLabel ?? '—'}</p>
                      </div>

                      {/* Amount */}
                      <p className="shrink-0 text-sm font-semibold text-slate-800">
                        ₹{Number(order.amount ?? 0).toFixed(0)}
                      </p>

                      {/* Status badge */}
                      <span className={`shrink-0 rounded-full px-3 py-0.5 text-xs font-semibold ${STATUS_PILL[order.status] ?? 'bg-slate-100 text-slate-600'}`}>
                        {order.status.replace(/_/g, ' ')}
                      </span>

                      {/* Quick action buttons */}
                      {actions.length > 0 && (
                        <div className="flex shrink-0 gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {actions.map((a) => (
                            <button
                              key={a.next}
                              disabled={!!busy}
                              onClick={(e) => handleQuickAction(e, order.id, a.next)}
                              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${a.cls}`}
                            >
                              {busy === order.id + a.next ? '…' : a.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {meta.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5 text-sm text-slate-400">
                <span>Page {meta.page} of {meta.totalPages}</span>
                <div className="flex gap-2">
                  <button disabled={page <= 1} onClick={() => handlePage(page - 1)}
                    className="rounded-xl border border-slate-200 px-4 py-1.5 hover:bg-slate-50 disabled:opacity-40">Prev</button>
                  <button disabled={page >= meta.totalPages} onClick={() => handlePage(page + 1)}
                    className="rounded-xl border border-slate-200 px-4 py-1.5 hover:bg-slate-50 disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
