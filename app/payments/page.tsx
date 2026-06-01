'use client';

import { useEffect, useState } from 'react';
import { paymentApi, PaymentType, PaymentStatus, PaymentMethod, CreatePaymentPayload } from '../../lib/api';
import { api } from '../../lib/api';
import AuthGuard from '../components/AuthGuard';

// ── Types ─────────────────────────────────────────────────────────────────────

type Summary = {
  totalRevenue: number;
  totalTransactions: number;
  paidCount: number;
  failedCount: number;
  pendingCount: number;
  refundedCount: number;
  byType: { type: string; revenue: number; total: number }[];
  byStatus: { status: string; count: number; amount: number }[];
  byMethod: { method: string; count: number }[];
  recentPayments: RecentPayment[];
};

type RecentPayment = {
  id: string;
  restaurantName: string;
  amount: number;
  currency: string;
  type: string;
  status: string;
  paymentMethod?: string;
  paidAt?: string;
  createdAt: string;
};

type ChartItem = {
  label: string;
  revenue: number;
  total: number;
  paidCount: number;
  failedCount: number;
  pendingCount: number;
  refundedCount: number;
};

type ChartData = {
  period: string;
  year: number;
  month?: number;
  monthName?: string;
  quarter?: number;
  data: ChartItem[];
  totals: {
    totalRevenue: number;
    totalTransactions: number;
    totalPaid: number;
    totalFailed: number;
    totalPending: number;
    totalRefunded: number;
  };
};

type Transaction = {
  id: string;
  restaurantId: string;
  restaurant?: { id: string; name: string };
  amount: number;
  currency: string;
  type: string;
  status: string;
  transactionId?: string;
  paymentMethod?: string;
  description?: string;
  paidAt?: string;
  createdAt: string;
};

type TabKey = 'summary' | 'monthly' | 'quarterly' | 'weekly' | 'daily' | 'transactions';

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  PAID: 'bg-emerald-100 text-emerald-700',
  PENDING: 'bg-amber-100 text-amber-700',
  FAILED: 'bg-rose-100 text-rose-700',
  REFUNDED: 'bg-slate-100 text-slate-600',
};

const TYPE_LABELS: Record<string, string> = {
  SUBSCRIPTION: 'Subscription',
  ONBOARDING: 'Onboarding',
  COMMISSION: 'Commission',
};

const METHOD_LABELS: Record<string, string> = {
  UPI: 'UPI',
  CARD: 'Card',
  NET_BANKING: 'Net Banking',
  CASH: 'Cash',
  OTHER: 'Other',
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const QUARTER_OPTIONS = ['All Quarters', 'Q1 (Jan–Mar)', 'Q2 (Apr–Jun)', 'Q3 (Jul–Sep)', 'Q4 (Oct–Dec)'];

const TABS: { key: TabKey; label: string }[] = [
  { key: 'summary', label: 'Summary' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'quarterly', label: 'Quarterly' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'daily', label: 'Daily' },
  { key: 'transactions', label: 'All Transactions' },
];

const BLANK_FORM = {
  restaurantId: '',
  amount: '',
  currency: 'INR',
  type: 'SUBSCRIPTION' as PaymentType,
  status: 'PENDING' as PaymentStatus,
  transactionId: '',
  paymentMethod: '' as PaymentMethod | '',
  description: '',
  paidAt: '',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] ?? 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-block rounded-full px-3 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className={`rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md ${accent ?? ''}`}>
      <div className="h-2 w-12 rounded-full bg-slate-100" />
      <p className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function BarChart({ data }: { data: ChartItem[] }) {
  const max = Math.max(...data.map((d) => d.revenue), 1);
  return (
    <div className="relative flex items-end gap-1 h-52 mt-4 pt-8">
      {data.map((d, i) => (
        <div key={i} className="group relative flex flex-col items-center flex-1 min-w-0 h-full justify-end">
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-900 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap z-10 pointer-events-none">
            {fmt(d.revenue)}
          </div>
          <div
            className="w-full rounded-t bg-[#B88A2E]/60 group-hover:bg-[#B88A2E] transition-colors min-h-[2px]"
            style={{ height: `${Math.max((d.revenue / max) * 100, 1)}%` }}
          />
          <p className="mt-2 text-[9px] text-slate-400 truncate w-full text-center leading-none">{d.label}</p>
        </div>
      ))}
    </div>
  );
}

function PaymentsTable({ rows }: { rows: RecentPayment[] }) {
  if (rows.length === 0) return <p className="text-sm text-slate-400">No transactions found.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-[0.16em] text-slate-400">
            <th className="pb-3 pr-4 font-medium">Restaurant</th>
            <th className="pb-3 pr-4 font-medium">Amount</th>
            <th className="pb-3 pr-4 font-medium">Type</th>
            <th className="pb-3 pr-4 font-medium">Method</th>
            <th className="pb-3 pr-4 font-medium">Status</th>
            <th className="pb-3 font-medium">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {rows.map((p) => (
            <tr key={p.id} className="hover:bg-slate-50 transition-colors">
              <td className="py-3 pr-4 font-medium text-slate-800">{p.restaurantName ?? '—'}</td>
              <td className="py-3 pr-4 tabular-nums text-slate-700">{fmt(p.amount)}</td>
              <td className="py-3 pr-4 text-slate-500">{TYPE_LABELS[p.type] ?? p.type}</td>
              <td className="py-3 pr-4 text-slate-500">{p.paymentMethod ? (METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod) : '—'}</td>
              <td className="py-3 pr-4"><StatusBadge status={p.status} /></td>
              <td className="py-3 text-slate-400">{fmtDate(p.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TransactionsTable({ rows }: { rows: Transaction[] }) {
  if (rows.length === 0) return <p className="text-sm text-slate-400">No transactions found.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-[0.16em] text-slate-400">
            <th className="pb-3 pr-4 font-medium">Restaurant</th>
            <th className="pb-3 pr-4 font-medium">Amount</th>
            <th className="pb-3 pr-4 font-medium">Type</th>
            <th className="pb-3 pr-4 font-medium">Method</th>
            <th className="pb-3 pr-4 font-medium">Tx ID</th>
            <th className="pb-3 pr-4 font-medium">Status</th>
            <th className="pb-3 font-medium">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {rows.map((p) => (
            <tr key={p.id} className="hover:bg-slate-50 transition-colors">
              <td className="py-3 pr-4 font-medium text-slate-800">{p.restaurant?.name ?? '—'}</td>
              <td className="py-3 pr-4 tabular-nums text-slate-700">{fmt(p.amount)}</td>
              <td className="py-3 pr-4 text-slate-500">{TYPE_LABELS[p.type] ?? p.type}</td>
              <td className="py-3 pr-4 text-slate-500">{p.paymentMethod ? (METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod) : '—'}</td>
              <td className="py-3 pr-4 text-slate-400 font-mono text-xs">{p.transactionId ?? '—'}</td>
              <td className="py-3 pr-4"><StatusBadge status={p.status} /></td>
              <td className="py-3 text-slate-400">{fmtDate(p.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PaymentsPage() {
  const today = new Date();
  const [tab, setTab] = useState<TabKey>('summary');
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [quarter, setQuarter] = useState(0);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [chart, setChart] = useState<ChartData | null>(null);
  const [transactions, setTransactions] = useState<{
    items: Transaction[]; total: number; page: number; limit: number;
  } | null>(null);
  const [txPage, setTxPage] = useState(1);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [restaurants, setRestaurants] = useState<{ id: string; name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Load summary once on mount
  useEffect(() => {
    paymentApi.summary()
      .then((r) => setSummary(r.data))
      .catch(() => {});
  }, []);

  // Load chart data when tab/year/month/quarter changes
  useEffect(() => {
    if (tab === 'summary' || tab === 'transactions') return;
    setLoading(true);
    setError('');
    let req: Promise<any>;
    if (tab === 'daily') req = paymentApi.daily(year, month);
    else if (tab === 'weekly') req = paymentApi.weekly(year, quarter || undefined);
    else if (tab === 'monthly') req = paymentApi.monthly(year);
    else req = paymentApi.quarterly(year);
    req
      .then((r) => setChart(r.data))
      .catch(() => setError('Failed to load chart data.'))
      .finally(() => setLoading(false));
  }, [tab, year, month, quarter]);

  // Load paginated transactions
  useEffect(() => {
    if (tab !== 'transactions') return;
    setLoading(true);
    setError('');
    paymentApi.list(txPage)
      .then((r) => setTransactions(r.data))
      .catch(() => setError('Failed to load transactions.'))
      .finally(() => setLoading(false));
  }, [tab, txPage]);

  // Load restaurants for the modal
  useEffect(() => {
    if (!showModal || restaurants.length > 0) return;
    api.get('/restaurants')
      .then((r) => setRestaurants(r.data))
      .catch(() => {});
  }, [showModal, restaurants.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    try {
      const payload: CreatePaymentPayload = {
        restaurantId: form.restaurantId,
        amount: parseFloat(form.amount),
        currency: form.currency || 'INR',
        type: form.type,
        status: form.status,
        transactionId: form.transactionId || undefined,
        paymentMethod: (form.paymentMethod as PaymentMethod) || undefined,
        description: form.description || undefined,
        paidAt: form.paidAt || undefined,
      };
      await paymentApi.create(payload);
      setShowModal(false);
      setForm({ ...BLANK_FORM });
      // Refresh summary
      paymentApi.summary().then((r) => setSummary(r.data)).catch(() => {});
    } catch (err: any) {
      setSubmitError(err?.response?.data?.message ?? 'Failed to record payment.');
    } finally {
      setSubmitting(false);
    }
  };

  const years = Array.from({ length: 4 }, (_, i) => today.getFullYear() - 2 + i);

  return (
    <AuthGuard requiredRoles={['super_admin']}>
      <div className="space-y-6">

          {/* Header */}
          <div className="overflow-hidden rounded-[2rem] bg-white p-8 shadow-[0_24px_64px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-[#B88A2E]/90">Finance</p>
                <h1 className="mt-4 text-4xl font-semibold text-slate-900">Payment Analysis</h1>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Revenue and transaction analytics across all restaurants.
                </p>
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="self-start rounded-full bg-[#B88A2E] px-6 py-3 text-sm font-semibold text-white shadow-sm shadow-amber-300/20 transition hover:bg-[#a07828]"
              >
                Record Payment
              </button>
            </div>
          </div>

          {/* Summary stat cards */}
          {summary && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <StatCard label="Total Revenue" value={fmt(summary.totalRevenue)} accent="border-[#B88A2E]/60" />
              <StatCard label="Transactions" value={summary.totalTransactions} />
              <StatCard label="Paid" value={summary.paidCount} accent="border-emerald-400/60" />
              <StatCard label="Pending" value={summary.pendingCount} accent="border-amber-400/60" />
              <StatCard label="Failed" value={summary.failedCount} accent="border-rose-400/60" />
              <StatCard label="Refunded" value={summary.refundedCount} />
            </div>
          )}

          {/* Tab panel */}
          <div className="rounded-[2rem] bg-white p-6 shadow-sm">

            {/* Tab bar */}
            <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-4">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    tab === t.key
                      ? 'bg-[#B88A2E]/10 text-[#B88A2E]'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Filters for chart tabs */}
            {tab !== 'summary' && tab !== 'transactions' && (
              <div className="mt-4 flex flex-wrap gap-3">
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 outline-none focus:border-[#B88A2E]"
                >
                  {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
                {tab === 'daily' && (
                  <select
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                    className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 outline-none focus:border-[#B88A2E]"
                  >
                    {MONTH_NAMES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                  </select>
                )}
                {tab === 'weekly' && (
                  <select
                    value={quarter}
                    onChange={(e) => setQuarter(Number(e.target.value))}
                    className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 outline-none focus:border-[#B88A2E]"
                  >
                    {QUARTER_OPTIONS.map((q, i) => <option key={i} value={i}>{q}</option>)}
                  </select>
                )}
              </div>
            )}

            {/* ── Summary tab ── */}
            {tab === 'summary' && summary && (
              <div className="mt-6 space-y-8">
                <div>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Revenue by Type</h3>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {summary.byType.length === 0 ? (
                      <p className="text-sm text-slate-400">No data.</p>
                    ) : summary.byType.map((t) => (
                      <div key={t.type} className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-sm font-medium text-slate-600">{TYPE_LABELS[t.type] ?? t.type}</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-900">{fmt(t.revenue)}</p>
                        <p className="mt-1 text-xs text-slate-400">{t.total} transactions</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">By Payment Method</h3>
                  <div className="flex flex-wrap gap-2">
                    {summary.byMethod.length === 0 ? (
                      <p className="text-sm text-slate-400">No data.</p>
                    ) : summary.byMethod.map((m) => (
                      <div key={m.method} className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
                        <span className="font-medium">{METHOD_LABELS[m.method] ?? m.method}</span>
                        <span className="ml-2 text-slate-400">{m.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Recent Payments</h3>
                  <PaymentsTable rows={summary.recentPayments} />
                </div>
              </div>
            )}

            {/* ── Chart tabs ── */}
            {tab !== 'summary' && tab !== 'transactions' && (
              <div className="mt-6">
                {loading ? (
                  <div className="h-52 animate-pulse rounded-2xl bg-slate-100" />
                ) : error ? (
                  <p className="text-sm text-rose-600">{error}</p>
                ) : chart ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                      <MiniStat label="Revenue" value={fmt(chart.totals.totalRevenue)} />
                      <MiniStat label="Transactions" value={chart.totals.totalTransactions} />
                      <MiniStat label="Paid" value={chart.totals.totalPaid} />
                      <MiniStat label="Pending" value={chart.totals.totalPending} />
                      <MiniStat label="Failed" value={chart.totals.totalFailed} />
                      <MiniStat label="Refunded" value={chart.totals.totalRefunded} />
                    </div>
                    {chart.data.length === 0 ? (
                      <p className="mt-6 text-sm text-slate-400">No data for this period.</p>
                    ) : (
                      <BarChart data={chart.data} />
                    )}
                  </>
                ) : null}
              </div>
            )}

            {/* ── Transactions tab ── */}
            {tab === 'transactions' && (
              <div className="mt-6">
                {loading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-12 animate-pulse rounded-2xl bg-slate-100" />
                    ))}
                  </div>
                ) : error ? (
                  <p className="text-sm text-rose-600">{error}</p>
                ) : transactions ? (
                  <>
                    <TransactionsTable rows={transactions.items} />
                    <div className="mt-6 flex items-center justify-between">
                      <p className="text-sm text-slate-500">
                        {transactions.total === 0
                          ? 'No transactions'
                          : `${(txPage - 1) * transactions.limit + 1}–${Math.min(txPage * transactions.limit, transactions.total)} of ${transactions.total}`}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                          disabled={txPage === 1}
                          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setTxPage((p) => p + 1)}
                          disabled={txPage * transactions.limit >= transactions.total}
                          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            )}

          </div>
        </div>

        {/* ── Record Payment modal ── */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-[2rem] bg-white p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">Record Payment</h2>
                <button
                  onClick={() => { setShowModal(false); setForm({ ...BLANK_FORM }); setSubmitError(''); }}
                  className="text-slate-400 transition hover:text-slate-700"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Restaurant</label>
                  <select
                    required
                    value={form.restaurantId}
                    onChange={(e) => setForm((f) => ({ ...f, restaurantId: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#B88A2E]"
                  >
                    <option value="">Select a restaurant</option>
                    {restaurants.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Amount</label>
                    <input
                      type="number" min="0" step="0.01" required
                      value={form.amount}
                      onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                      placeholder="0.00"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#B88A2E]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Currency</label>
                    <input
                      value={form.currency}
                      onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                      placeholder="INR"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#B88A2E]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Type</label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as PaymentType }))}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#B88A2E]"
                    >
                      <option value="SUBSCRIPTION">Subscription</option>
                      <option value="ONBOARDING">Onboarding</option>
                      <option value="COMMISSION">Commission</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as PaymentStatus }))}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#B88A2E]"
                    >
                      <option value="PENDING">Pending</option>
                      <option value="PAID">Paid</option>
                      <option value="FAILED">Failed</option>
                      <option value="REFUNDED">Refunded</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Payment Method</label>
                  <select
                    value={form.paymentMethod}
                    onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value as PaymentMethod | '' }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#B88A2E]"
                  >
                    <option value="">None</option>
                    <option value="UPI">UPI</option>
                    <option value="CARD">Card</option>
                    <option value="NET_BANKING">Net Banking</option>
                    <option value="CASH">Cash</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Transaction ID</label>
                  <input
                    value={form.transactionId}
                    onChange={(e) => setForm((f) => ({ ...f, transactionId: e.target.value }))}
                    placeholder="Optional"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#B88A2E]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Paid At</label>
                  <input
                    type="datetime-local"
                    value={form.paidAt}
                    onChange={(e) => setForm((f) => ({ ...f, paidAt: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#B88A2E]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={2}
                    placeholder="Optional"
                    className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#B88A2E]"
                  />
                </div>

                {submitError && <p className="text-sm text-rose-600">{submitError}</p>}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); setForm({ ...BLANK_FORM }); setSubmitError(''); }}
                    className="flex-1 rounded-full border border-slate-200 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 rounded-full bg-[#B88A2E] py-3 text-sm font-semibold text-white transition hover:bg-[#a07828] disabled:opacity-60"
                  >
                    {submitting ? 'Recording…' : 'Record Payment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

    </AuthGuard>
  );
}
