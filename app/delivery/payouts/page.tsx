'use client';

import { useEffect, useState } from 'react';
import AuthGuard from '../../components/AuthGuard';
import { deliveryPayoutsApi, deliveryPartnersApi, PayoutStatus, PayoutType } from '../../../lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

type Payout = {
  id: string;
  partnerId: string;
  partner?: { name: string; phone: string };
  amount: number;
  payoutType: PayoutType;
  status: PayoutStatus;
  assignmentId?: string;
  description?: string;
  periodStart?: string;
  periodEnd?: string;
  processedAt?: string;
  transactionId?: string;
  createdAt: string;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<PayoutStatus, string> = {
  PENDING:    'bg-amber-100 text-amber-700',
  PROCESSING: 'bg-blue-100 text-blue-700',
  PAID:       'bg-emerald-100 text-emerald-700',
  FAILED:     'bg-rose-100 text-rose-700',
};

const TYPE_LABELS: Record<PayoutType, string> = {
  DELIVERY_FEE: 'Delivery Fee',
  INCENTIVE:    'Incentive',
  BONUS:        'Bonus',
  PENALTY:      'Penalty',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n);
}

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DeliveryPayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [partners, setPartners] = useState<{ id: string; name: string; phone: string }[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    partnerId: '', amount: '', payoutType: 'DELIVERY_FEE' as PayoutType,
    assignmentId: '', description: '', periodStart: '', periodEnd: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [bulkPartnerId, setBulkPartnerId] = useState('');
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const load = () => {
    setLoading(true);
    setError('');
    deliveryPayoutsApi.list(page, limit, statusFilter || undefined)
      .then((r) => {
        const raw = r.data;
        const items = Array.isArray(raw) ? raw : (raw?.items ?? raw?.data ?? []);
        setPayouts(Array.isArray(items) ? items : []);
        setTotal(raw?.total ?? raw?.count ?? (Array.isArray(items) ? items.length : 0));
      })
      .catch(() => setError('Failed to load payouts.'))
      .finally(() => setLoading(false));
  };

  const loadPartners = () => {
    deliveryPartnersApi.list(1, 200)
      .then((r) => {
        const raw = r.data;
        const items = Array.isArray(raw) ? raw : (raw?.items ?? raw?.data ?? []);
        setPartners(Array.isArray(items) ? items : []);
      })
      .catch(() => {});
  };

  useEffect(() => { load(); }, [page, statusFilter]);
  useEffect(() => { loadPartners(); }, []);

  const handleProcess = async (id: string) => {
    try {
      await deliveryPayoutsApi.process(id);
      load();
    } catch {}
  };

  const handleBulkProcess = async () => {
    setBulkProcessing(true);
    try {
      await deliveryPayoutsApi.bulkProcess(bulkPartnerId || undefined);
      load();
    } catch {}
    setBulkProcessing(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    try {
      await deliveryPayoutsApi.create({
        partnerId: createForm.partnerId,
        amount: parseFloat(createForm.amount),
        payoutType: createForm.payoutType,
        assignmentId: createForm.assignmentId || undefined,
        description: createForm.description || undefined,
        periodStart: createForm.periodStart || undefined,
        periodEnd: createForm.periodEnd || undefined,
      });
      setShowCreate(false);
      setCreateForm({ partnerId: '', amount: '', payoutType: 'DELIVERY_FEE', assignmentId: '', description: '', periodStart: '', periodEnd: '' });
      load();
    } catch (err: any) {
      setSubmitError(err?.response?.data?.message ?? 'Failed to create payout.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = 'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#B88A2E]';
  const labelCls = 'mb-1 block text-sm font-medium text-slate-700';

  return (
    <AuthGuard requiredRoles={['super_admin']}>
      <div className="space-y-6">

        {/* Header */}
        <div className="overflow-hidden rounded-[2rem] bg-white p-8 shadow-[0_24px_64px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-[#B88A2E]/90">Delivery</p>
              <h1 className="mt-4 text-4xl font-semibold text-slate-900">Payouts</h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">Manage delivery partner earnings and payouts.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowCreate(true)}
                className="rounded-full bg-[#B88A2E] px-6 py-3 text-sm font-semibold text-white shadow-sm shadow-amber-300/20 transition hover:bg-[#a07828]"
              >
                Create Payout
              </button>
            </div>
          </div>
        </div>

        {/* Bulk process */}
        <div className="rounded-[2rem] bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Bulk Process Pending Payouts</h2>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className={labelCls}>Filter by Partner (Optional)</label>
              <select value={bulkPartnerId} onChange={(e) => setBulkPartnerId(e.target.value)} className={inputCls}>
                <option value="">All Partners</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} – {p.phone}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleBulkProcess}
              disabled={bulkProcessing}
              className="rounded-full bg-slate-800 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
            >
              {bulkProcessing ? 'Processing…' : 'Process All Pending'}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {(['', 'PENDING', 'PROCESSING', 'PAID', 'FAILED'] as const).map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                statusFilter === s ? 'bg-[#B88A2E]/10 text-[#B88A2E]' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-[2rem] bg-white p-6 shadow-sm">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : error ? (
            <p className="text-sm text-rose-600">{error}</p>
          ) : payouts.length === 0 ? (
            <p className="text-sm text-slate-400">No payouts found.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-[0.16em] text-slate-400">
                      <th className="pb-3 pr-4 font-medium">Partner</th>
                      <th className="pb-3 pr-4 font-medium">Amount</th>
                      <th className="pb-3 pr-4 font-medium">Type</th>
                      <th className="pb-3 pr-4 font-medium">Status</th>
                      <th className="pb-3 pr-4 font-medium">Period</th>
                      <th className="pb-3 pr-4 font-medium">Processed</th>
                      <th className="pb-3 pr-4 font-medium">Tx ID</th>
                      <th className="pb-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {payouts.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 pr-4">
                          {p.partner ? (
                            <>
                              <p className="font-medium text-slate-800">{p.partner.name}</p>
                              <p className="text-xs text-slate-400">{p.partner.phone}</p>
                            </>
                          ) : <span className="text-slate-400 text-xs">{p.partnerId.slice(0, 8)}…</span>}
                        </td>
                        <td className="py-3 pr-4 tabular-nums font-medium text-slate-800">{fmt(p.amount)}</td>
                        <td className="py-3 pr-4 text-slate-600">{TYPE_LABELS[p.payoutType]}</td>
                        <td className="py-3 pr-4">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[p.status]}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-xs text-slate-500">
                          {p.periodStart ? `${fmtDate(p.periodStart)} – ${fmtDate(p.periodEnd)}` : '—'}
                        </td>
                        <td className="py-3 pr-4 text-xs text-slate-400">{fmtDate(p.processedAt)}</td>
                        <td className="py-3 pr-4 font-mono text-xs text-slate-400">{p.transactionId ?? '—'}</td>
                        <td className="py-3">
                          {p.status === 'PENDING' && (
                            <button
                              onClick={() => handleProcess(p.id)}
                              className="rounded-full bg-[#B88A2E]/10 px-3 py-1.5 text-xs font-medium text-[#B88A2E] hover:bg-[#B88A2E]/20"
                            >
                              Process
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-slate-500">{total === 0 ? 'No payouts' : `${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total}`}</p>
                <div className="flex gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40">Previous</button>
                  <button onClick={() => setPage((p) => p + 1)} disabled={page * limit >= total} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40">Next</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create Payout Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-[2rem] bg-white p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Create Payout</h2>
              <button onClick={() => { setShowCreate(false); setSubmitError(''); }} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className={labelCls}>Partner</label>
                <select required value={createForm.partnerId} onChange={(e) => setCreateForm((f) => ({ ...f, partnerId: e.target.value }))} className={inputCls}>
                  <option value="">Select partner</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} – {p.phone}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Amount (₹)</label>
                  <input required type="number" min="0" step="0.01" value={createForm.amount} onChange={(e) => setCreateForm((f) => ({ ...f, amount: e.target.value }))} className={inputCls} placeholder="0.00" />
                </div>
                <div>
                  <label className={labelCls}>Type</label>
                  <select value={createForm.payoutType} onChange={(e) => setCreateForm((f) => ({ ...f, payoutType: e.target.value as PayoutType }))} className={inputCls}>
                    {(Object.entries(TYPE_LABELS) as [PayoutType, string][]).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <input value={createForm.description} onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))} className={inputCls} placeholder="Optional" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Period Start</label>
                  <input type="date" value={createForm.periodStart} onChange={(e) => setCreateForm((f) => ({ ...f, periodStart: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Period End</label>
                  <input type="date" value={createForm.periodEnd} onChange={(e) => setCreateForm((f) => ({ ...f, periodEnd: e.target.value }))} className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Assignment ID (Optional)</label>
                <input value={createForm.assignmentId} onChange={(e) => setCreateForm((f) => ({ ...f, assignmentId: e.target.value }))} className={inputCls} placeholder="Optional" />
              </div>
              {submitError && <p className="text-sm text-rose-600">{submitError}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowCreate(false); setSubmitError(''); }} className="flex-1 rounded-full border border-slate-200 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 rounded-full bg-[#B88A2E] py-3 text-sm font-semibold text-white hover:bg-[#a07828] disabled:opacity-60">
                  {submitting ? 'Creating…' : 'Create Payout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AuthGuard>
  );
}
