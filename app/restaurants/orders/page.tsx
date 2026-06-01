'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '../../components/AuthGuard';
import { restaurantOrdersApi } from '../../../lib/api';

const ORDER_STATUSES = ['PLACED', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'PICKED_UP', 'ON_THE_WAY', 'DELIVERED', 'CANCELLED', 'FAILED'];

const STATUS_COLORS: Record<string, string> = {
  PLACED: 'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-sky-100 text-sky-700',
  PREPARING: 'bg-amber-100 text-amber-700',
  READY_FOR_PICKUP: 'bg-violet-100 text-violet-700',
  PICKED_UP: 'bg-orange-100 text-orange-700',
  ON_THE_WAY: 'bg-amber-200 text-amber-800',
  DELIVERED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-rose-100 text-rose-700',
  FAILED: 'bg-slate-100 text-slate-700',
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

function formatAmount(value: number | undefined) {
  return Number(value ?? 0).toFixed(2);
}

export default function RestaurantOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const loadOrders = useCallback(async (pageNumber = 1) => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (status) params.status = status;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const response = await restaurantOrdersApi.list(pageNumber, 20, params);
      const payload = response.data;
      const data = Array.isArray(payload.data) ? payload.data : payload;
      setOrders(data.map((order: any) => ({ ...order, amount: order.amount ?? order.grandTotal ?? 0 })));
      if (payload.meta) {
        setMeta(payload.meta);
      } else {
        setMeta({ total: data.length, page: pageNumber, limit: 20, totalPages: 1 });
      }
    } catch (err) {
      setError('Unable to load restaurant orders.');
    } finally {
      setLoading(false);
    }
  }, [search, status, dateFrom, dateTo]);

  useEffect(() => {
    setPage(1);
    loadOrders(1);
  }, [loadOrders]);

  const handlePage = (nextPage: number) => {
    setPage(nextPage);
    loadOrders(nextPage);
  };

  return (
    <AuthGuard requiredRoles={['restaurant_owner', 'restaurant_admin', 'restaurant_manager', 'restaurant_staff', 'super_admin', 'sales_operator']}>
      <div className="space-y-6">
        <div className="rounded-3xl bg-white p-8 shadow-lg">
          <h1 className="text-3xl font-semibold">Restaurant Orders</h1>
          <p className="mt-2 text-slate-500">View orders from your restaurant branches.</p>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Search order number or customer"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-w-[200px] flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <option value="">All statuses</option>
              {ORDER_STATUSES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>
        </div>

        {error && <div className="rounded-2xl bg-rose-50 p-4 text-rose-700">{error}</div>}

        {loading ? (
          <div className="rounded-2xl bg-white p-8 text-slate-500 shadow-sm">Loading orders…</div>
        ) : (
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Orders</h2>
                <p className="text-sm text-slate-500">Total orders: {meta.total}</p>
              </div>
            </div>

            {orders.length === 0 ? (
              <p className="text-slate-500">No restaurant orders were found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                      <th className="pb-3 pr-6">Order</th>
                      <th className="pb-3 pr-6">Customer</th>
                      <th className="pb-3 pr-6">Branch</th>
                      <th className="pb-3 pr-6">Status</th>
                      <th className="pb-3 pr-6">Amount</th>
                      <th className="pb-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {orders.map((order) => (
                      <tr
                        key={order.id}
                        onClick={() => router.push(`/restaurants/orders/${order.id}`)}
                        className="cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-3 pr-6 font-mono text-xs text-slate-500">
                          {order.orderNumber || order.id.slice(0, 8)}
                        </td>
                        <td className="py-3 pr-6">
                          <p className="font-medium text-slate-900">{order.customer?.name || '—'}</p>
                          <p className="text-slate-400">{order.customer?.email || '—'}</p>
                        </td>
                        <td className="py-3 pr-6 text-slate-600">{order.branchLabel || order.restaurantLabel || '—'}</td>
                        <td className="py-3 pr-6">
                          <span className={`inline-flex rounded-full px-3 py-0.5 text-xs font-medium ${STATUS_COLORS[order.status] ?? 'bg-slate-100 text-slate-600'}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3 pr-6 text-slate-700">₹{formatAmount(order.amount)}</td>
                        <td className="py-3 text-slate-400">{new Date(order.createdAt).toLocaleDateString()}</td>
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
                  <button
                    disabled={page <= 1}
                    onClick={() => handlePage(page - 1)}
                    className="rounded-xl border border-slate-200 px-4 py-1.5 hover:bg-slate-50 disabled:opacity-40"
                  >Prev</button>
                  <button
                    disabled={page >= meta.totalPages}
                    onClick={() => handlePage(page + 1)}
                    className="rounded-xl border border-slate-200 px-4 py-1.5 hover:bg-slate-50 disabled:opacity-40"
                  >Next</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
