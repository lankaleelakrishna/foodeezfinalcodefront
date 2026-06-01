'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGuard from '../../../components/AuthGuard';
import { adminCustomersApi, CustomerStatus } from '../../../../lib/api';

type Address = { id: string; label: string; addressLine1: string; city: string; isDefault: boolean };

type CustomerDetail = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: CustomerStatus;
  tier: string;
  totalOrders: number;
  totalSpend: number;
  wallet: { balance: number; cashbackBalance: number; isActive: boolean } | null;
  dateOfBirth?: string;
  gender?: string;
  referralCode?: string;
  createdAt: string;
  addresses?: Address[];
};

type Order = {
  id: string;
  status: string;
  totalAmount: number;
  restaurant?: { name: string };
  createdAt: string;
};

type Ticket = {
  id: string;
  type: string;
  status: string;
  priority: string;
  description: string;
  createdAt: string;
};

type Meta = { total: number; page: number; limit: number; totalPages: number };

const STATUS_OPTIONS: CustomerStatus[] = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'BANNED'];

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:    'bg-emerald-100 text-emerald-700',
  INACTIVE:  'bg-slate-100 text-slate-600',
  SUSPENDED: 'bg-amber-100 text-amber-700',
  BANNED:    'bg-rose-100 text-rose-700',
};

const TICKET_STATUS_COLORS: Record<string, string> = {
  OPEN:        'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  RESOLVED:    'bg-emerald-100 text-emerald-700',
  CLOSED:      'bg-slate-100 text-slate-600',
};

const ORDER_STATUS_COLORS: Record<string, string> = {
  PLACED:     'bg-blue-100 text-blue-700',
  CONFIRMED:  'bg-sky-100 text-sky-700',
  PREPARING:  'bg-amber-100 text-amber-700',
  READY:      'bg-violet-100 text-violet-700',
  PICKED_UP:  'bg-orange-100 text-orange-700',
  DELIVERED:  'bg-emerald-100 text-emerald-700',
  CANCELLED:  'bg-rose-100 text-rose-700',
};

type Tab = 'orders' | 'tickets';

export default function CustomerDetailPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const router = useRouter();

  const [customer, setCustomer]   = useState<CustomerDetail | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  const [tab, setTab]             = useState<Tab>('tickets');

  const [orders, setOrders]       = useState<Order[]>([]);
  const [orderMeta, setOrderMeta] = useState<Meta>({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderPage, setOrderPage] = useState(1);

  const [tickets, setTickets]         = useState<Ticket[]>([]);
  const [ticketMeta, setTicketMeta]   = useState<Meta>({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketPage, setTicketPage]   = useState(1);

  const [statusUpdate, setStatusUpdate] = useState<CustomerStatus | ''>('');
  const [updating, setUpdating]         = useState(false);
  const [updateMsg, setUpdateMsg]       = useState('');

  // Safely convert various numeric shapes (number, string, Decimal, etc.) to a JS number
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

  useEffect(() => {
    adminCustomersApi.get(customerId)
      .then(({ data }) => {
        setCustomer(data);
        setStatusUpdate(data.status);
      })
      .catch(() => setError('Failed to load customer.'))
      .finally(() => setLoading(false));
  }, [customerId]);

  async function loadOrders(p = 1) {
    setOrdersLoading(true);
    try {
      const { data } = await adminCustomersApi.getOrders(customerId, p, 10);
      setOrders(data.data ?? data);
      if (data.meta) setOrderMeta(data.meta);
    } finally {
      setOrdersLoading(false);
    }
  }

  async function loadTickets(p = 1) {
    setTicketsLoading(true);
    try {
      const { data } = await adminCustomersApi.getTickets(customerId, p, 10);
      setTickets(data.data ?? data);
      if (data.meta) setTicketMeta(data.meta);
    } finally {
      setTicketsLoading(false);
    }
  }

  useEffect(() => {
    loadOrders(1);
    loadTickets(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  async function handleStatusUpdate() {
    if (!statusUpdate || !customer) return;
    setUpdating(true);
    setUpdateMsg('');
    try {
      await adminCustomersApi.updateStatus(customerId, statusUpdate as CustomerStatus);
      setCustomer((prev) => prev ? { ...prev, status: statusUpdate as CustomerStatus } : prev);
      setUpdateMsg('Status updated.');
    } catch {
      setUpdateMsg('Failed to update status.');
    } finally {
      setUpdating(false);
    }
  }

  if (loading) return (
    <AuthGuard requiredRoles={['super_admin']}>
      <div className="rounded-2xl bg-white p-8 text-slate-500 shadow-sm">Loading…</div>
    </AuthGuard>
  );

  if (error || !customer) return (
    <AuthGuard requiredRoles={['super_admin']}>
      <div className="rounded-2xl bg-rose-50 p-6 text-rose-700">{error || 'Customer not found.'}</div>
    </AuthGuard>
  );

  return (
    <AuthGuard requiredRoles={['super_admin']}>
      <div className="space-y-6">

        {/* Back + Header */}
        <div className="rounded-3xl bg-white p-8 shadow-lg">
          <button
            onClick={() => router.back()}
            className="mb-4 text-sm text-slate-400 hover:text-slate-600 transition"
          >
            ← Back to Customers
          </button>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold">{customer.name || customer.email}</h1>
              <p className="mt-1 text-slate-500">{customer.email} · {customer.phone}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${STATUS_COLORS[customer.status] ?? 'bg-slate-100 text-slate-600'}`}>
                  {customer.status}
                </span>
                <span className="rounded-full bg-violet-100 px-3 py-0.5 text-xs font-medium text-violet-700">
                  {customer.tier}
                </span>
              </div>
            </div>
            {/* Status update */}
            <div className="flex flex-col gap-2 sm:items-end">
              <div className="flex gap-2">
                <select
                  value={statusUpdate}
                  onChange={(e) => setStatusUpdate(e.target.value as CustomerStatus)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                >
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {updateMsg && <p className="text-xs text-slate-500">{updateMsg}</p>}
            </div>
          </div>
        </div>

        {/* Info cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Total Orders</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{customer.totalOrders ?? 0}</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Total Spend</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">₹{formatAmount(customer.totalSpend)}</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Wallet Balance</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">₹{formatAmount(customer.wallet?.balance)}</p>
          </div>
        </div>

        {/* Extra details */}
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-base font-semibold">Profile</h2>
          <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2 text-sm">
            {customer.dateOfBirth && (
              <>
                <dt className="text-slate-400">Date of Birth</dt>
                <dd className="text-slate-700">{new Date(customer.dateOfBirth).toLocaleDateString()}</dd>
              </>
            )}
            {customer.gender && (
              <>
                <dt className="text-slate-400">Gender</dt>
                <dd className="text-slate-700">{customer.gender === 'M' ? 'Male' : customer.gender === 'F' ? 'Female' : 'Other'}</dd>
              </>
            )}
            {customer.referralCode && (
              <>
                <dt className="text-slate-400">Referral Code</dt>
                <dd className="font-mono text-slate-700">{customer.referralCode}</dd>
              </>
            )}
            <dt className="text-slate-400">Member Since</dt>
            <dd className="text-slate-700">{new Date(customer.createdAt).toLocaleDateString()}</dd>
          </dl>

          {customer.addresses && customer.addresses.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-slate-500">Saved Addresses</p>
              <div className="space-y-1">
                {customer.addresses.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 text-sm text-slate-700">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{a.label}</span>
                    {a.addressLine1}, {a.city}
                    {a.isDefault && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">default</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="mb-5 flex gap-1 border-b border-slate-100 pb-1">
            {(['tickets'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  tab === t ? 'bg-slate-100 text-slate-700' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Orders tab */}
          {tab === 'orders' && (
            <>
              {ordersLoading ? (
                <p className="text-slate-500">Loading orders…</p>
              ) : orders.length === 0 ? (
                <p className="text-slate-500">No orders found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                        <th className="pb-3 pr-6">Order ID</th>
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
                          <td className="py-3 pr-6 text-slate-700">{o.restaurant?.name ?? '—'}</td>
                          <td className="py-3 pr-6">
                            <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${ORDER_STATUS_COLORS[o.status] ?? 'bg-slate-100 text-slate-600'}`}>
                              {o.status}
                            </span>
                          </td>
                          <td className="py-3 pr-6 text-slate-700">₹{formatAmount(o.totalAmount)}</td>
                          <td className="py-3 text-slate-400">{new Date(o.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {orderMeta.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                  <span>Page {orderMeta.page} of {orderMeta.totalPages}</span>
                  <div className="flex gap-2">
                    <button disabled={orderPage <= 1} onClick={() => { setOrderPage(p => p - 1); loadOrders(orderPage - 1); }} className="rounded-xl border border-slate-200 px-4 py-1.5 hover:bg-slate-50 disabled:opacity-40">Prev</button>
                    <button disabled={orderPage >= orderMeta.totalPages} onClick={() => { setOrderPage(p => p + 1); loadOrders(orderPage + 1); }} className="rounded-xl border border-slate-200 px-4 py-1.5 hover:bg-slate-50 disabled:opacity-40">Next</button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Tickets tab */}
          {tab === 'tickets' && (
            <>
              {ticketsLoading ? (
                <p className="text-slate-500">Loading tickets…</p>
              ) : tickets.length === 0 ? (
                <p className="text-slate-500">No tickets found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                        <th className="pb-3 pr-6">Type</th>
                        <th className="pb-3 pr-6">Status</th>
                        <th className="pb-3 pr-6">Priority</th>
                        <th className="pb-3 pr-6">Description</th>
                        <th className="pb-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {tickets.map((t) => (
                        <tr
                          key={t.id}
                          onClick={() => router.push(`/admin/tickets/${t.id}`)}
                          className="cursor-pointer hover:bg-slate-50 transition-colors"
                        >
                          <td className="py-3 pr-6 text-slate-700">{t.type.replace(/_/g, ' ')}</td>
                          <td className="py-3 pr-6">
                            <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${TICKET_STATUS_COLORS[t.status] ?? 'bg-slate-100 text-slate-600'}`}>
                              {t.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="py-3 pr-6 text-slate-600">{t.priority}</td>
                          <td className="py-3 pr-6 max-w-xs truncate text-slate-600">{t.description}</td>
                          <td className="py-3 text-slate-400">{new Date(t.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {ticketMeta.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                  <span>Page {ticketMeta.page} of {ticketMeta.totalPages}</span>
                  <div className="flex gap-2">
                    <button disabled={ticketPage <= 1} onClick={() => { setTicketPage(p => p - 1); loadTickets(ticketPage - 1); }} className="rounded-xl border border-slate-200 px-4 py-1.5 hover:bg-slate-50 disabled:opacity-40">Prev</button>
                    <button disabled={ticketPage >= ticketMeta.totalPages} onClick={() => { setTicketPage(p => p + 1); loadTickets(ticketPage + 1); }} className="rounded-xl border border-slate-200 px-4 py-1.5 hover:bg-slate-50 disabled:opacity-40">Next</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </AuthGuard>
  );
}
