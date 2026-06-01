'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '../../components/AuthGuard';
import { adminOrdersApi } from '../../../lib/api';

type Order = {
  id: string;
  status: string;
  amount?: number;
  totalAmount?: number;
  restaurant?: {
    name?: string;
    displayName?: string;
    restaurantName?: string;
    title?: string;
    display_name?: string;
  } | string;
  restaurantName?: string;
  restaurantLabel?: string;
  branch?: { name?: string; displayName?: string; restaurantName?: string } | string;
  branchName?: string;
  branchLabel?: string;
  customer?: { name?: string; email?: string };
  createdAt: string;
};

type Meta = { total: number; page: number; limit: number; totalPages: number };

const ORDER_STATUSES = ['PLACED', 'CONFIRMED', 'PREPARING', 'READY', 'PICKED_UP', 'DELIVERED', 'CANCELLED'];

const STATUS_COLORS: Record<string, string> = {
  PLACED:     'bg-blue-100 text-blue-700',
  CONFIRMED:  'bg-sky-100 text-sky-700',
  PREPARING:  'bg-amber-100 text-amber-700',
  READY:      'bg-violet-100 text-violet-700',
  PICKED_UP:  'bg-orange-100 text-orange-700',
  DELIVERED:  'bg-emerald-100 text-emerald-700',
  CANCELLED:  'bg-rose-100 text-rose-700',
};

export default function AdminOrdersPage() {
  const router = useRouter();

  const [orders, setOrders]   = useState<Order[]>([]);
  const [meta, setMeta]       = useState<Meta>({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');
  const [page, setPage]         = useState(1);

  // Safe number conversion + formatting
  function toNumberSafe(v: any): number {
    if (v == null) return 0;
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
      const n = parseFloat(v as string);
      return Number.isFinite(n) ? n : 0;
    }
    if (typeof v === 'object') {
      if (typeof v.toNumber === 'function') {
        try { return Number(v.toNumber()); } catch { /* fallthrough */ }
      }
      if (typeof v.toString === 'function') {
        const n = parseFloat(v.toString());
        if (Number.isFinite(n)) return n;
      }
    }
    return 0;
  }

  const formatAmount = (v: any) => toNumberSafe(v).toFixed(2);

  function getRestaurantLabel(o: Order): string {
    if (o.branchLabel) return o.branchLabel;
    if (o.restaurantLabel) return o.restaurantLabel;
    const restaurant = o.restaurant;
    if (typeof restaurant === 'string') return restaurant;
    if (restaurant) {
      return (
        restaurant.name ||
        restaurant.displayName ||
        restaurant.restaurantName ||
        restaurant.title ||
        restaurant.display_name ||
        o.restaurantName ||
        o.branchName ||
        ''
      );
    }

    if (typeof o.branch === 'string') return o.branch;
    if (o.branch) {
      return o.branch.name || o.branch.displayName || o.branch.restaurantName || o.branchName || '';
    }

    return o.restaurantName || o.branchName || '—';
  }

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = {};
      if (search)   params.search   = search;
      if (status)   params.status   = status;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo)   params.dateTo   = dateTo;
      const { data } = await adminOrdersApi.list(p, 20, params);
      const ordersData = (data.data ?? data).map((order: any) => ({
        ...order,
        amount: order.amount ?? order.grandTotal ?? order.totalAmount ?? 0,
      }));
      setOrders(ordersData);
      if (data.meta) setMeta(data.meta);
    } catch {
      setError('Failed to load orders.');
    } finally {
      setLoading(false);
    }
  }, [search, status, dateFrom, dateTo]);

  useEffect(() => {
    setPage(1);
    load(1);
  }, [search, status, dateFrom, dateTo, load]);

  function handlePage(p: number) {
    setPage(p);
    load(p);
  }

  const INPUT = 'rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300';

  return (
    <AuthGuard requiredRoles={['super_admin']}>
      <div className="space-y-6">

        {/* Header */}
        <div className="rounded-3xl bg-white p-8 shadow-lg">
          <h1 className="text-3xl font-semibold">Orders</h1>
          <p className="mt-2 text-slate-500">Browse and inspect all customer orders.</p>
        </div>

        {/* Filters */}
        <div className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Search order ID, customer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${INPUT} min-w-[200px] flex-1`}
            />
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={INPUT}>
              <option value="">All Statuses</option>
              {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={INPUT} title="From date" />
            <input type="date" value={dateTo}   onChange={(e) => setDateTo(e.target.value)}   className={INPUT} title="To date" />
          </div>
        </div>

        {/* Table */}
        {error && <div className="rounded-2xl bg-rose-50 p-4 text-rose-700">{error}</div>}

        {loading ? (
          <div className="rounded-2xl bg-white p-8 text-slate-500 shadow-sm">Loading…</div>
        ) : (
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                All Orders{' '}
                <span className="text-sm font-normal text-slate-400">({meta.total})</span>
              </h2>
            </div>

            {orders.length === 0 ? (
              <p className="text-slate-500">No orders found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                      <th className="pb-3 pr-6">Order ID</th>
                      <th className="pb-3 pr-6">Customer</th>
                      <th className="pb-3 pr-6">Restaurant</th>
                      <th className="pb-3 pr-6">Status</th>
                      <th className="pb-3 pr-6">Amount</th>
                      <th className="pb-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {orders.map((o) => (
                      <tr
                        key={o.id}
                        onClick={() => router.push(`/admin/orders/${o.id}`)}
                        className="cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-3 pr-6 font-mono text-xs text-slate-500">{o.id.slice(0, 8)}…</td>
                        <td className="py-3 pr-6">
                          <p className="font-medium text-slate-900">{o.customer?.name || '—'}</p>
                          <p className="text-slate-400">{o.customer?.email}</p>
                        </td>
                        <td className="py-3 pr-6 text-slate-600">{getRestaurantLabel(o)}</td>
                        <td className="py-3 pr-6">
                          <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${STATUS_COLORS[o.status] ?? 'bg-slate-100 text-slate-600'}`}>
                            {o.status}
                          </span>
                        </td>
                        <td className="py-3 pr-6 text-slate-700">₹{formatAmount(o.amount ?? o.totalAmount)}</td>
                        <td className="py-3 text-slate-400">{new Date(o.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {meta.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                <span>Page {meta.page} of {meta.totalPages}</span>
                <div className="flex gap-2">
                  <button disabled={page <= 1} onClick={() => handlePage(page - 1)} className="rounded-xl border border-slate-200 px-4 py-1.5 hover:bg-slate-50 disabled:opacity-40">Prev</button>
                  <button disabled={page >= meta.totalPages} onClick={() => handlePage(page + 1)} className="rounded-xl border border-slate-200 px-4 py-1.5 hover:bg-slate-50 disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </AuthGuard>
  );
}
