'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '../../components/AuthGuard';
import { adminTicketsApi, AdminCustomerTicketStatus, AdminTicketType, AdminTicketPriority } from '../../../lib/api';

type Ticket = {
  id: string;
  type: AdminTicketType;
  status: AdminCustomerTicketStatus;
  priority: AdminTicketPriority;
  description: string;
  customer?: { name: string; email: string; id: string };
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  orderId?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
};

type Meta = { total: number; page: number; limit: number; totalPages: number };

const STATUSES: AdminCustomerTicketStatus[]  = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const TYPES: AdminTicketType[]               = ['MISSING_ITEM', 'WRONG_ORDER', 'DELIVERY_ISSUE', 'PAYMENT_ISSUE', 'REFUND_REQUEST', 'FOOD_QUALITY', 'OTHER'];
const PRIORITIES: AdminTicketPriority[]      = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const STATUS_COLORS: Record<string, string> = {
  OPEN:        'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  RESOLVED:    'bg-emerald-100 text-emerald-700',
  CLOSED:      'bg-slate-100 text-slate-600',
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW:      'bg-slate-100 text-slate-600',
  MEDIUM:   'bg-blue-100 text-blue-700',
  HIGH:     'bg-amber-100 text-amber-700',
  CRITICAL: 'bg-rose-100 text-rose-700',
};

export default function AdminTicketsPage() {
  const router = useRouter();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [meta, setMeta]       = useState<Meta>({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const [search, setSearch]     = useState('');
  const [status, setStatus]     = useState('');
  const [type, setType]         = useState('');
  const [priority, setPriority] = useState('');
  const [page, setPage]         = useState(1);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = {};
      if (search)   params.search   = search;
      if (status)   params.status   = status;
      if (type)     params.type     = type;
      if (priority) params.priority = priority;
      const { data } = await adminTicketsApi.list(p, 20, params);
      setTickets(data.data ?? data);
      if (data.meta) setMeta(data.meta);
    } catch {
      setError('Failed to load tickets.');
    } finally {
      setLoading(false);
    }
  }, [search, status, type, priority]);

  useEffect(() => {
    setPage(1);
    load(1);
  }, [search, status, type, priority, load]);

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
          <h1 className="text-3xl font-semibold">Support Tickets</h1>
          <p className="mt-2 text-slate-500">Manage all customer support tickets.</p>
        </div>

        {/* Filters */}
        <div className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Search customer, description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 min-w-[200px] flex-1"
            />
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={SELECT}>
              <option value="">All Statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
            <select value={type} onChange={(e) => setType(e.target.value)} className={SELECT}>
              <option value="">All Types</option>
              {TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className={SELECT}>
              <option value="">All Priorities</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
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
                All Tickets{' '}
                <span className="text-sm font-normal text-slate-400">({meta.total})</span>
              </h2>
            </div>

            {tickets.length === 0 ? (
              <p className="text-slate-500">No tickets found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                      <th className="pb-3 pr-6">Customer</th>
                      <th className="pb-3 pr-6">Type</th>
                      <th className="pb-3 pr-6">Status</th>
                      <th className="pb-3 pr-6">Priority</th>
                      <th className="pb-3 pr-6">Description</th>
                      <th className="pb-3">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {tickets.map((t) => (
                      <tr
                        key={t.id}
                        onClick={() => router.push(`/admin/tickets/${t.id}`)}
                        className="cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-3 pr-6">
                          <p className="font-medium text-slate-900">
                            {t.customer?.name ?? t.customerName ?? '—'}
                          </p>
                        </td>
                        <td className="py-3 pr-6 text-slate-600">{t.type.replace(/_/g, ' ')}</td>
                        <td className="py-3 pr-6">
                          <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${STATUS_COLORS[t.status] ?? 'bg-slate-100 text-slate-600'}`}>
                            {t.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 pr-6">
                          <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${PRIORITY_COLORS[t.priority] ?? 'bg-slate-100 text-slate-600'}`}>
                            {t.priority}
                          </span>
                        </td>
                        <td className="py-3 pr-6 max-w-xs truncate text-slate-600">{t.description}</td>
                        <td className="py-3 text-slate-400">{new Date(t.createdAt).toLocaleDateString()}</td>
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
