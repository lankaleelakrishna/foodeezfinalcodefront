'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '../../components/AuthGuard';
import { adminCustomersApi, CustomerStatus, CustomerTier } from '../../../lib/api';

type CustomerStats = {
  customers: {
    total: number;
    active: number;
    suspended: number;
    banned: number;
    byTier: Record<string, number>;
  };
  orders: { total: number };
  tickets: { open: number; inProgress: number };
};

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: CustomerStatus;
  tier: CustomerTier;
  totalOrders: number;
  totalSpend: number;
  walletBalance: number;
  createdAt: string;
};

type Meta = { total: number; page: number; limit: number; totalPages: number };

const STATUS_OPTIONS: CustomerStatus[] = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'BANNED'];
const TIER_OPTIONS: CustomerTier[] = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];

const STATUS_COLORS: Record<CustomerStatus, string> = {
  ACTIVE:    'bg-emerald-100 text-emerald-700',
  INACTIVE:  'bg-slate-100 text-slate-600',
  SUSPENDED: 'bg-amber-100 text-amber-700',
  BANNED:    'bg-rose-100 text-rose-700',
};

const TIER_COLORS: Record<CustomerTier, string> = {
  BRONZE:   'bg-amber-100 text-amber-800',
  SILVER:   'bg-slate-100 text-slate-600',
  GOLD:     'bg-yellow-100 text-yellow-700',
  PLATINUM: 'bg-violet-100 text-violet-700',
};

function StatCard({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color ?? 'text-slate-900'}`}>{value}</p>
    </div>
  );
}

export default function CustomersPage() {
  const router = useRouter();

  const [stats, setStats]       = useState<CustomerStats | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [meta, setMeta]         = useState<Meta>({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState('');
  const [tier, setTier]       = useState('');
  const [page, setPage]       = useState(1);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (status) params.status = status;
      if (tier)   params.tier   = tier;
      const { data }: { data: { data: Customer[]; meta: Meta } } = await adminCustomersApi.list(p, 20, params);
      setCustomers(data.data ?? data);
      if (data.meta) setMeta(data.meta);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404) {
        setCustomers([]);
      } else {
        setError('Failed to load customers.');
      }
    } finally {
      setLoading(false);
    }
  }, [search, status, tier]);

  useEffect(() => {
    adminCustomersApi.stats()
      .then(({ data }) => setStats(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setPage(1);
    load(1);
  }, [search, status, tier, load]);

  function handlePage(p: number) {
    setPage(p);
    load(p);
  }

  const SELECT = 'rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300';

  return (
    <AuthGuard requiredRoles={['super_admin']}>
      <div className="space-y-6">

        {/* Header */}
        <div className="rounded-3xl bg-white p-8 shadow-lg">
          <h1 className="text-3xl font-semibold">Customers</h1>
          <p className="mt-2 text-slate-500">View and manage all registered customers.</p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            <StatCard label="Total"       value={stats.customers.total} />
            <StatCard label="Active"      value={stats.customers.active}    color="text-emerald-600" />
            <StatCard label="Inactive"    value={stats.customers.total - stats.customers.active - stats.customers.suspended - stats.customers.banned} color="text-slate-500" />
            <StatCard label="Suspended"   value={stats.customers.suspended} color="text-amber-600" />
            <StatCard label="Banned"      value={stats.customers.banned}    color="text-rose-600" />
            <StatCard label="Open Tickets"    value={stats.tickets.open}       color="text-blue-600" />
            <StatCard label="In Progress"     value={stats.tickets.inProgress} color="text-amber-600" />
          </div>
        )}

        {/* Filters */}
        <div className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Search name, email, phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 min-w-[220px] flex-1"
            />
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={SELECT}>
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={tier} onChange={(e) => setTier(e.target.value)} className={SELECT}>
              <option value="">All Tiers</option>
              {TIER_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
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
                All Customers{' '}
                <span className="text-sm font-normal text-slate-400">({meta.total})</span>
              </h2>
            </div>

            {customers.length === 0 ? (
              <p className="text-slate-500">No customers found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                      <th className="pb-3 pr-6">Customer</th>
                      <th className="pb-3 pr-6">Phone</th>
                      <th className="pb-3 pr-6">Status</th>
                      <th className="pb-3 pr-6">Tier</th>
                      <th className="pb-3 pr-6">Orders</th>
                      <th className="pb-3 pr-6">Spend</th>
                      <th className="pb-3 pr-6">Wallet</th>
                      <th className="pb-3">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {customers.map((c) => (
                      <tr
                        key={c.id}
                        onClick={() => router.push(`/admin/customers/${c.id}`)}
                        className="cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-3 pr-6">
                          <p className="font-medium text-slate-900">{c.name || '—'}</p>
                        </td>
                        <td className="py-3 pr-6 text-slate-500">{c.phone || '—'}</td>
                        <td className="py-3 pr-6">
                          <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${STATUS_COLORS[c.status] ?? 'bg-slate-100 text-slate-600'}`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3 pr-6">
                          <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${TIER_COLORS[c.tier] ?? 'bg-slate-100 text-slate-600'}`}>
                            {c.tier}
                          </span>
                        </td>
                        <td className="py-3 pr-6 text-slate-700">{c.totalOrders ?? 0}</td>
                        <td className="py-3 pr-6 text-slate-700">₹{Number(c.totalSpend ?? 0).toFixed(2)}</td>
                        <td className="py-3 pr-6 text-slate-700">₹{(c.walletBalance ?? 0).toFixed(2)}</td>
                        <td className="py-3 text-slate-400">{new Date(c.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {meta.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                <span>Page {meta.page} of {meta.totalPages}</span>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => handlePage(page - 1)}
                    className="rounded-xl border border-slate-200 px-4 py-1.5 hover:bg-slate-50 disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <button
                    disabled={page >= meta.totalPages}
                    onClick={() => handlePage(page + 1)}
                    className="rounded-xl border border-slate-200 px-4 py-1.5 hover:bg-slate-50 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </AuthGuard>
  );
}
