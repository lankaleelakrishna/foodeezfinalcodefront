'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import AuthGuard from '../../components/AuthGuard';
import { api } from '../../../lib/api';

type ChangeRequest = {
  id: string;
  item: { id: string; name: string; price: number; currency: string; description?: string };
  branch?: { id: string; name: string };
  restaurantId: string;
  requestedBy?: string;
  status: 'pending' | 'approved' | 'rejected';
  changeDescription: string;
  payload: Record<string, any>;
  reviewComment?: string;
  createdAt: string;
};

const STATUS_COLORS: Record<string, string> = {
  pending:  'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
};

export default function MenuChangeRequestsPage() {
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [selectedReq, setSelectedReq] = useState<ChangeRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [comment, setComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/menu-item-change-requests');
      const data = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setRequests(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load change requests.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const filtered = filter === 'all' ? requests : requests.filter((r) => r.status === filter);

  const handleAction = async () => {
    if (!selectedReq || !actionType) return;
    setActionLoading(true);
    try {
      await api.post(`/menu-item-change-requests/${selectedReq.id}/${actionType}`, comment ? { reviewComment: comment } : {});
      setSelectedReq(null);
      setActionType(null);
      setComment('');
      await fetchRequests();
    } catch (err: any) {
      const msg = err?.response?.data?.message || `Failed to ${actionType} request.`;
      setError(Array.isArray(msg) ? msg.join(' ') : msg);
    } finally { setActionLoading(false); }
  };

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <AuthGuard requiredRoles={['super_admin']}>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="rounded-3xl bg-[var(--surface)] p-8 shadow-lg">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-[var(--tx)]">Menu Change Requests</h1>
              <p className="mt-2 text-[var(--tx-3)]">
                Review and approve price or item updates submitted by sales operators and restaurant admins.
                {pendingCount > 0 && (
                  <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                    {pendingCount} pending
                  </span>
                )}
              </p>
            </div>
            <Link href="/admin/restaurants"
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--tx-2)] hover:bg-[var(--surface-2)] transition">
              ← Restaurant Reviews
            </Link>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl bg-[var(--danger-bg)] border border-[var(--danger-border)] p-4 text-sm text-[var(--danger-text)]">{error}</div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-1 rounded-2xl bg-[var(--surface-2)] p-1 w-fit">
          {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition capitalize ${
                filter === f ? 'bg-[var(--surface)] text-[var(--tx)] shadow-sm' : 'text-[var(--tx-3)] hover:text-[var(--tx)]'
              }`}>
              {f}{f === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="rounded-3xl bg-[var(--surface)] p-8 text-center text-[var(--tx-3)]">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl bg-[var(--surface)] p-8 text-center text-[var(--tx-3)]">
            No {filter !== 'all' ? filter : ''} change requests.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((req) => (
              <div key={req.id} className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  {/* Status badge */}
                  <span className={`shrink-0 mt-0.5 text-xs px-2 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[req.status] || ''}`}>
                    {req.status}
                  </span>

                  <div className="flex-1 min-w-0">
                    {/* Item name */}
                    <p className="font-semibold text-[var(--tx)]">{req.item?.name || 'Unknown item'}</p>
                    {req.branch && <p className="text-xs text-[var(--tx-3)]">Branch: {req.branch.name}</p>}
                    <p className="mt-1 text-sm text-[var(--tx-2)]">{req.changeDescription}</p>

                    {/* Changes diff */}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {req.payload.price !== undefined && (
                        <div className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-xs">
                          <span className="text-rose-600 line-through">{req.item?.price} {req.item?.currency}</span>
                          <span className="text-[var(--tx-3)]">→</span>
                          <span className="text-emerald-600 font-semibold">{req.payload.price} {req.item?.currency}</span>
                        </div>
                      )}
                      {req.payload.name !== undefined && (
                        <div className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-xs">
                          <span className="text-rose-600 line-through">{req.item?.name}</span>
                          <span className="text-[var(--tx-3)]">→</span>
                          <span className="text-emerald-600 font-semibold">{req.payload.name}</span>
                        </div>
                      )}
                      {req.payload.description !== undefined && (
                        <span className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-xs text-[var(--tx-2)]">
                          Description updated
                        </span>
                      )}
                      {req.payload.isInStock !== undefined && (
                        <span className={`rounded-xl px-2 py-1 text-xs font-medium ${req.payload.isInStock ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {req.payload.isInStock ? 'Mark in stock' : 'Mark out of stock'}
                        </span>
                      )}
                    </div>

                    {req.reviewComment && (
                      <p className="mt-2 text-xs text-[var(--tx-3)] italic">Review note: {req.reviewComment}</p>
                    )}

                    <p className="mt-1 text-xs text-[var(--tx-3)]">
                      Submitted {new Date(req.createdAt).toLocaleString()}
                      {req.requestedBy && ` · by ${req.requestedBy}`}
                    </p>
                  </div>

                  {/* Actions */}
                  {req.status === 'pending' && (
                    <div className="flex flex-col gap-2 shrink-0">
                      <button onClick={() => { setSelectedReq(req); setActionType('approve'); }}
                        className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 whitespace-nowrap">
                        Approve
                      </button>
                      <button onClick={() => { setSelectedReq(req); setActionType('reject'); }}
                        className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 whitespace-nowrap">
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Confirm dialog */}
        {selectedReq && actionType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="rounded-3xl bg-[var(--surface)] p-6 max-w-sm w-full shadow-2xl">
              <h3 className="text-lg font-semibold text-[var(--tx)] capitalize">{actionType} Change Request</h3>
              <div className="mt-3 rounded-2xl bg-[var(--surface-2)] p-3 text-sm">
                <p className="font-medium text-[var(--tx)]">{selectedReq.item?.name}</p>
                <p className="text-[var(--tx-3)]">{selectedReq.changeDescription}</p>
                {selectedReq.payload.price !== undefined && (
                  <p className="mt-1 text-xs text-[var(--tx-2)]">
                    Price change: <span className="line-through text-rose-600">{selectedReq.item?.price}</span> → <span className="font-semibold text-emerald-600">{selectedReq.payload.price} {selectedReq.item?.currency}</span>
                  </p>
                )}
              </div>
              <label className="mt-4 block text-sm font-medium text-[var(--tx)]">
                Review comment <span className="text-[var(--tx-3)] font-normal">(optional)</span>
              </label>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)}
                placeholder="Add a note for the restaurant team…"
                className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--tx)] outline-none focus:border-[var(--accent)]"
                rows={3} />
              <div className="mt-4 flex gap-3">
                <button onClick={handleAction} disabled={actionLoading}
                  className={`flex-1 rounded-2xl px-4 py-2.5 text-white font-semibold disabled:opacity-60 ${
                    actionType === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}>
                  {actionLoading ? 'Processing…' : actionType === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
                </button>
                <button onClick={() => { setSelectedReq(null); setActionType(null); setComment(''); }}
                  disabled={actionLoading}
                  className="flex-1 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[var(--tx-2)] hover:bg-[var(--surface-2)]">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
