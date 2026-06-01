'use client';

import { useEffect, useState } from 'react';
import AuthGuard from '../../components/AuthGuard';
import {
  deliveryAssignmentsApi,
  deliveryPartnersApi,
  DeliveryStatus,
  ManualAssignPayload,
} from '../../../lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

type Assignment = {
  id: string;
  orderId: string;
  restaurantId: string;
  partnerId?: string;
  partner?: { id: string; name: string; phone: string };
  assignmentType: 'AUTO' | 'MANUAL';
  status: DeliveryStatus;
  customerAddress?: string;
  estimatedDistanceKm?: number;
  estimatedDurationMins?: number;
  actualDurationMins?: number;
  deliveryFee?: number;
  cancellationReason?: string;
  assignedAt: string;
  deliveredAt?: string;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<DeliveryStatus, string> = {
  ASSIGNED:   'bg-blue-100 text-blue-700',
  ACCEPTED:   'bg-indigo-100 text-indigo-700',
  PICKED_UP:  'bg-amber-100 text-amber-700',
  ON_THE_WAY: 'bg-orange-100 text-orange-700',
  ARRIVED:    'bg-purple-100 text-purple-700',
  DELIVERED:  'bg-emerald-100 text-emerald-700',
  CANCELLED:  'bg-rose-100 text-rose-700',
};

const ALL_STATUSES: DeliveryStatus[] = [
  'ASSIGNED','ACCEPTED','PICKED_UP','ON_THE_WAY','ARRIVED','DELIVERED','CANCELLED',
];

const BLANK_MANUAL: ManualAssignPayload = {
  orderId: '', partnerId: '', restaurantId: '',
  customerAddress: '', deliveryFee: undefined,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n);
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DeliveryAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [pending, setPending] = useState<Assignment[]>([]);
  const [tab, setTab] = useState<'all' | 'pending'>('pending');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadAll = () => {
    setLoading(true);
    setError('');
    // backend returns paginated list from the pending endpoint filtered by partner;
    // for "all" we fetch pending + a wider set via partner wildcard
    deliveryAssignmentsApi.pending()
      .then((r) => {
        const raw = r.data;
        const items = Array.isArray(raw) ? raw : (raw?.items ?? raw?.data ?? []);
        setAssignments(Array.isArray(items) ? items : []);
        setTotal(raw?.total ?? (Array.isArray(items) ? items.length : 0));
      })
      .catch(() => setError('Failed to load assignments.'))
      .finally(() => setLoading(false));
  };

  const [showManual, setShowManual] = useState(false);
  const [manualForm, setManualForm] = useState<ManualAssignPayload>({ ...BLANK_MANUAL });
  const [partners, setPartners] = useState<{ id: string; name: string; phone: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [reassignModal, setReassignModal] = useState<{ id: string } | null>(null);
  const [reassignPartnerId, setReassignPartnerId] = useState('');
  const [reassignReason, setReassignReason] = useState('');

  const loadPending = () => {
    deliveryAssignmentsApi.pending()
      .then((r) => setPending(r.data ?? []))
      .catch(() => {});
  };

  useEffect(() => {
    loadPending();
    loadPartners();
  }, []);

  useEffect(() => {
    if (tab === 'all') loadAll();
  }, [tab, page]);

  const loadPartners = () => {
    deliveryPartnersApi.list(1, 100, 'ACTIVE')
      .then((r) => {
        const raw = r.data;
        const items = Array.isArray(raw) ? raw : (raw?.items ?? raw?.data ?? []);
        setPartners(Array.isArray(items) ? items : []);
      })
      .catch(() => {});
  };

  const handleManualAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    try {
      await deliveryAssignmentsApi.manualAssign({
        ...manualForm,
        deliveryFee: manualForm.deliveryFee ? Number(manualForm.deliveryFee) : undefined,
      });
      setShowManual(false);
      setManualForm({ ...BLANK_MANUAL });
      loadPending();
    } catch (err: any) {
      setSubmitError(err?.response?.data?.message ?? 'Failed to assign.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: DeliveryStatus) => {
    try {
      await deliveryAssignmentsApi.updateStatus(id, status);
      loadPending();
    } catch {}
  };

  const handleReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignModal) return;
    try {
      await deliveryAssignmentsApi.reassign(reassignModal.id, reassignPartnerId, reassignReason || undefined);
      setReassignModal(null);
      loadPending();
    } catch {}
  };

  const inputCls = 'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#B88A2E]';
  const labelCls = 'mb-1 block text-sm font-medium text-slate-700';

  const displayed = tab === 'pending' ? pending : assignments;

  return (
    <AuthGuard requiredRoles={['super_admin']}>
      <div className="space-y-6">

        {/* Header */}
        <div className="overflow-hidden rounded-[2rem] bg-white p-8 shadow-[0_24px_64px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-[#B88A2E]/90">Delivery</p>
              <h1 className="mt-4 text-4xl font-semibold text-slate-900">Assignments</h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">View and manage delivery order assignments.</p>
            </div>
            <button
              onClick={() => setShowManual(true)}
              className="self-start rounded-full bg-[#B88A2E] px-6 py-3 text-sm font-semibold text-white shadow-sm shadow-amber-300/20 transition hover:bg-[#a07828]"
            >
              Manual Assign
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {(['pending', 'all'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-5 py-2.5 text-sm font-medium transition ${
                tab === t ? 'bg-[#B88A2E]/10 text-[#B88A2E]' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {t === 'pending' ? `Pending (${pending.length})` : 'All Assignments'}
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
          ) : displayed.length === 0 ? (
            <p className="text-sm text-slate-400">No assignments found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-[0.16em] text-slate-400">
                    <th className="pb-3 pr-4 font-medium">Order ID</th>
                    <th className="pb-3 pr-4 font-medium">Partner</th>
                    <th className="pb-3 pr-4 font-medium">Type</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 pr-4 font-medium">Distance</th>
                    <th className="pb-3 pr-4 font-medium">ETA</th>
                    <th className="pb-3 pr-4 font-medium">Fee</th>
                    <th className="pb-3 pr-4 font-medium">Assigned At</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {displayed.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 pr-4 font-mono text-xs text-slate-600">{a.orderId.slice(0, 8)}…</td>
                      <td className="py-3 pr-4">
                        {a.partner ? (
                          <>
                            <p className="font-medium text-slate-800">{a.partner.name}</p>
                            <p className="text-xs text-slate-400">{a.partner.phone}</p>
                          </>
                        ) : <span className="text-slate-400">Unassigned</span>}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${a.assignmentType === 'AUTO' ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-700'}`}>
                          {a.assignmentType}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[a.status]}`}>
                          {a.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-slate-600">{a.estimatedDistanceKm ? `${a.estimatedDistanceKm} km` : '—'}</td>
                      <td className="py-3 pr-4 text-slate-600">{a.estimatedDurationMins ? `${a.estimatedDurationMins} min` : '—'}</td>
                      <td className="py-3 pr-4 text-slate-600">{a.deliveryFee ? fmt(a.deliveryFee) : '—'}</td>
                      <td className="py-3 pr-4 text-slate-400 text-xs">{fmtDate(a.assignedAt)}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          {a.status !== 'DELIVERED' && a.status !== 'CANCELLED' && (
                            <select
                              value={a.status}
                              onChange={(e) => handleStatusUpdate(a.id, e.target.value as DeliveryStatus)}
                              className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-1 text-xs outline-none focus:border-[#B88A2E]"
                            >
                              {ALL_STATUSES.map((s) => (
                                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                              ))}
                            </select>
                          )}
                          {a.status !== 'DELIVERED' && a.status !== 'CANCELLED' && (
                            <button
                              onClick={() => setReassignModal({ id: a.id })}
                              className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                            >
                              Reassign
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {tab === 'all' && !loading && total > limit && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                {`${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total}`}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40">Previous</button>
                <button onClick={() => setPage((p) => p + 1)} disabled={page * limit >= total} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Manual Assign Modal */}
      {showManual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-[2rem] bg-white p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Manual Assignment</h2>
              <button onClick={() => { setShowManual(false); setSubmitError(''); }} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>
            <form onSubmit={handleManualAssign} className="space-y-4">
              <div>
                <label className={labelCls}>Order ID</label>
                <input required value={manualForm.orderId} onChange={(e) => setManualForm((f) => ({ ...f, orderId: e.target.value }))} className={inputCls} placeholder="Order UUID" />
              </div>
              <div>
                <label className={labelCls}>Restaurant ID</label>
                <input required value={manualForm.restaurantId} onChange={(e) => setManualForm((f) => ({ ...f, restaurantId: e.target.value }))} className={inputCls} placeholder="Restaurant UUID" />
              </div>
              <div>
                <label className={labelCls}>Delivery Partner</label>
                <select required value={manualForm.partnerId} onChange={(e) => setManualForm((f) => ({ ...f, partnerId: e.target.value }))} className={inputCls}>
                  <option value="">Select a partner</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} – {p.phone}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Customer Address</label>
                <input value={manualForm.customerAddress} onChange={(e) => setManualForm((f) => ({ ...f, customerAddress: e.target.value }))} className={inputCls} placeholder="Optional" />
              </div>
              <div>
                <label className={labelCls}>Delivery Fee (₹)</label>
                <input type="number" min="0" step="0.01" value={manualForm.deliveryFee ?? ''} onChange={(e) => setManualForm((f) => ({ ...f, deliveryFee: e.target.value ? parseFloat(e.target.value) : undefined }))} className={inputCls} placeholder="Optional" />
              </div>
              {submitError && <p className="text-sm text-rose-600">{submitError}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowManual(false); setSubmitError(''); }} className="flex-1 rounded-full border border-slate-200 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 rounded-full bg-[#B88A2E] py-3 text-sm font-semibold text-white hover:bg-[#a07828] disabled:opacity-60">
                  {submitting ? 'Assigning…' : 'Assign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reassign Modal */}
      {reassignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-[2rem] bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Reassign Delivery</h2>
              <button onClick={() => setReassignModal(null)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>
            <form onSubmit={handleReassign} className="space-y-4">
              <div>
                <label className={labelCls}>New Partner</label>
                <select required value={reassignPartnerId} onChange={(e) => setReassignPartnerId(e.target.value)} className={inputCls}>
                  <option value="">Select a partner</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} – {p.phone}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Reason (Optional)</label>
                <input value={reassignReason} onChange={(e) => setReassignReason(e.target.value)} className={inputCls} placeholder="e.g. Partner unavailable" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setReassignModal(null)} className="flex-1 rounded-full border border-slate-200 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="submit" className="flex-1 rounded-full bg-[#B88A2E] py-3 text-sm font-semibold text-white hover:bg-[#a07828]">Reassign</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AuthGuard>
  );
}
