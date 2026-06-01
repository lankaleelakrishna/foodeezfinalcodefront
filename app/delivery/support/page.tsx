'use client';

import { useEffect, useState } from 'react';
import AuthGuard from '../../components/AuthGuard';
import {
  deliverySupportApi,
  SupportTicketType,
  SupportTicketPriority,
  SupportTicketStatus,
} from '../../../lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

type Ticket = {
  id: string;
  partnerId?: string;
  partner?: { name: string; phone: string };
  assignmentId?: string;
  orderId?: string;
  ticketType: SupportTicketType;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  title: string;
  description: string;
  adminNotes?: string;
  sosLatitude?: number;
  sosLongitude?: number;
  resolvedAt?: string;
  createdAt: string;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<SupportTicketPriority, string> = {
  LOW:      'bg-slate-100 text-slate-600',
  MEDIUM:   'bg-blue-100 text-blue-700',
  HIGH:     'bg-amber-100 text-amber-700',
  CRITICAL: 'bg-rose-100 text-rose-700',
};

const STATUS_COLORS: Record<SupportTicketStatus, string> = {
  OPEN:        'bg-amber-100 text-amber-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  RESOLVED:    'bg-emerald-100 text-emerald-700',
  CLOSED:      'bg-slate-100 text-slate-600',
};

const TYPE_LABELS: Record<SupportTicketType, string> = {
  SOS:       '🆘 SOS',
  COMPLAINT: 'Complaint',
  QUERY:     'Query',
  INCIDENT:  'Incident',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DeliverySupportPage() {
  const [tab, setTab] = useState<'tickets' | 'sos'>('sos');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [sosAlerts, setSosAlerts] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const [selected, setSelected] = useState<Ticket | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [updateStatus, setUpdateStatus] = useState<SupportTicketStatus>('OPEN');
  const [updatePriority, setUpdatePriority] = useState<SupportTicketPriority>('LOW');
  const [updating, setUpdating] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    ticketType: 'COMPLAINT' as SupportTicketType,
    priority: 'LOW' as SupportTicketPriority,
    title: '', description: '', partnerId: '', assignmentId: '', orderId: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const normalize = (raw: any): any[] => {
    const items = Array.isArray(raw) ? raw : (raw?.items ?? raw?.data ?? []);
    return Array.isArray(items) ? items : [];
  };

  const loadSos = () => {
    deliverySupportApi.sosAlerts()
      .then((r) => setSosAlerts(normalize(r.data)))
      .catch(() => {});
  };

  const loadTickets = () => {
    setLoading(true);
    deliverySupportApi.listTickets(page, limit, statusFilter || undefined, typeFilter || undefined)
      .then((r) => {
        setTickets(normalize(r.data));
        setTotal(r.data?.total ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadSos(); }, []);
  useEffect(() => { if (tab === 'tickets') loadTickets(); }, [tab, page, statusFilter, typeFilter]);

  const openDetail = (t: Ticket) => {
    setSelected(t);
    setAdminNotes(t.adminNotes ?? '');
    setUpdateStatus(t.status);
    setUpdatePriority(t.priority);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setUpdating(true);
    try {
      await deliverySupportApi.updateTicket(selected.id, {
        status: updateStatus,
        priority: updatePriority,
        adminNotes: adminNotes || undefined,
      });
      setSelected(null);
      loadSos();
      if (tab === 'tickets') loadTickets();
    } catch {}
    setUpdating(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    try {
      await deliverySupportApi.createTicket({
        ...createForm,
        partnerId: createForm.partnerId || undefined,
        assignmentId: createForm.assignmentId || undefined,
        orderId: createForm.orderId || undefined,
      });
      setShowCreate(false);
      setCreateForm({ ticketType: 'COMPLAINT', priority: 'LOW', title: '', description: '', partnerId: '', assignmentId: '', orderId: '' });
      loadTickets();
    } catch (err: any) {
      setSubmitError(err?.response?.data?.message ?? 'Failed to create ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = 'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#B88A2E]';
  const labelCls = 'mb-1 block text-sm font-medium text-slate-700';

  const displayed = tab === 'sos' ? sosAlerts : tickets;

  return (
    <AuthGuard requiredRoles={['super_admin']}>
      <div className="space-y-6">

        {/* Header */}
        <div className="overflow-hidden rounded-[2rem] bg-white p-8 shadow-[0_24px_64px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-[#B88A2E]/90">Delivery</p>
              <h1 className="mt-4 text-4xl font-semibold text-slate-900">Support</h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">Manage SOS alerts and delivery support tickets.</p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="self-start rounded-full bg-[#B88A2E] px-6 py-3 text-sm font-semibold text-white shadow-sm shadow-amber-300/20 transition hover:bg-[#a07828]"
            >
              New Ticket
            </button>
          </div>
        </div>

        {/* SOS alert banner */}
        {sosAlerts.length > 0 && (
          <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-5">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🆘</span>
              <div>
                <p className="font-semibold text-rose-700">{sosAlerts.length} Open SOS Alert{sosAlerts.length > 1 ? 's' : ''}</p>
                <p className="text-sm text-rose-500">Immediate attention required.</p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {(['sos', 'tickets'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-5 py-2.5 text-sm font-medium transition ${
                tab === t ? 'bg-[#B88A2E]/10 text-[#B88A2E]' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {t === 'sos' ? `SOS Alerts (${sosAlerts.length})` : 'All Tickets'}
            </button>
          ))}
          {tab === 'tickets' && (
            <>
              {(['', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setPage(1); }}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    statusFilter === s ? 'bg-[#B88A2E]/10 text-[#B88A2E]' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {s || 'All Status'}
                </button>
              ))}
              {(['', 'SOS', 'COMPLAINT', 'QUERY', 'INCIDENT'] as const).map((t2) => (
                <button
                  key={t2}
                  onClick={() => { setTypeFilter(t2); setPage(1); }}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    typeFilter === t2 ? 'bg-[#B88A2E]/10 text-[#B88A2E]' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {t2 || 'All Types'}
                </button>
              ))}
            </>
          )}
        </div>

        {/* Table */}
        <div className="rounded-[2rem] bg-white p-6 shadow-sm">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : displayed.length === 0 ? (
            <p className="text-sm text-slate-400">No {tab === 'sos' ? 'SOS alerts' : 'tickets'} found.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-[0.16em] text-slate-400">
                      <th className="pb-3 pr-4 font-medium">Title</th>
                      <th className="pb-3 pr-4 font-medium">Type</th>
                      <th className="pb-3 pr-4 font-medium">Priority</th>
                      <th className="pb-3 pr-4 font-medium">Status</th>
                      <th className="pb-3 pr-4 font-medium">Partner</th>
                      {tab === 'sos' && <th className="pb-3 pr-4 font-medium">Location</th>}
                      <th className="pb-3 pr-4 font-medium">Created</th>
                      <th className="pb-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {displayed.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 pr-4 font-medium text-slate-800">{t.title}</td>
                        <td className="py-3 pr-4">
                          <span className="text-sm">{TYPE_LABELS[t.ticketType]}</span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${PRIORITY_COLORS[t.priority]}`}>
                            {t.priority}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[t.status]}`}>
                            {t.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-slate-500">
                          {t.partner ? `${t.partner.name}` : '—'}
                        </td>
                        {tab === 'sos' && (
                          <td className="py-3 pr-4 text-slate-500 text-xs">
                            {t.sosLatitude && t.sosLongitude ? (
                              <a
                                href={`https://www.google.com/maps?q=${t.sosLatitude},${t.sosLongitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#B88A2E] hover:underline"
                              >
                                {t.sosLatitude.toFixed(4)}, {t.sosLongitude.toFixed(4)}
                              </a>
                            ) : '—'}
                          </td>
                        )}
                        <td className="py-3 pr-4 text-slate-400 text-xs">{fmtDate(t.createdAt)}</td>
                        <td className="py-3">
                          <button
                            onClick={() => openDetail(t)}
                            className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {tab === 'tickets' && (
                <div className="mt-6 flex items-center justify-between">
                  <p className="text-sm text-slate-500">{total === 0 ? 'No tickets' : `${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total}`}</p>
                  <div className="flex gap-2">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40">Previous</button>
                    <button onClick={() => setPage((p) => p + 1)} disabled={page * limit >= total} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40">Next</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Ticket detail / update modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-[2rem] bg-white p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Manage Ticket</h2>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>
            <div className="mb-4 rounded-2xl bg-slate-50 p-4 text-sm space-y-1">
              <p><span className="font-medium text-slate-700">Title:</span> {selected.title}</p>
              <p><span className="font-medium text-slate-700">Description:</span> {selected.description}</p>
              {selected.partner && <p><span className="font-medium text-slate-700">Partner:</span> {selected.partner.name} – {selected.partner.phone}</p>}
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Status</label>
                  <select value={updateStatus} onChange={(e) => setUpdateStatus(e.target.value as SupportTicketStatus)} className={inputCls}>
                    {(['OPEN','IN_PROGRESS','RESOLVED','CLOSED'] as SupportTicketStatus[]).map((s) => (
                      <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Priority</label>
                  <select value={updatePriority} onChange={(e) => setUpdatePriority(e.target.value as SupportTicketPriority)} className={inputCls}>
                    {(['LOW','MEDIUM','HIGH','CRITICAL'] as SupportTicketPriority[]).map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Admin Notes</label>
                <textarea rows={3} value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#B88A2E]" placeholder="Internal notes…" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setSelected(null)} className="flex-1 rounded-full border border-slate-200 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={updating} className="flex-1 rounded-full bg-[#B88A2E] py-3 text-sm font-semibold text-white hover:bg-[#a07828] disabled:opacity-60">
                  {updating ? 'Saving…' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Ticket Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-[2rem] bg-white p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Create Ticket</h2>
              <button onClick={() => { setShowCreate(false); setSubmitError(''); }} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Type</label>
                  <select value={createForm.ticketType} onChange={(e) => setCreateForm((f) => ({ ...f, ticketType: e.target.value as SupportTicketType }))} className={inputCls}>
                    {(['COMPLAINT','QUERY','INCIDENT','SOS'] as SupportTicketType[]).map((t) => (
                      <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Priority</label>
                  <select value={createForm.priority} onChange={(e) => setCreateForm((f) => ({ ...f, priority: e.target.value as SupportTicketPriority }))} className={inputCls}>
                    {(['LOW','MEDIUM','HIGH','CRITICAL'] as SupportTicketPriority[]).map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Title</label>
                <input required value={createForm.title} onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))} className={inputCls} placeholder="Short title" />
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <textarea required rows={3} value={createForm.description} onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))} className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#B88A2E]" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Partner ID</label>
                  <input value={createForm.partnerId} onChange={(e) => setCreateForm((f) => ({ ...f, partnerId: e.target.value }))} className={inputCls} placeholder="Optional" />
                </div>
                <div>
                  <label className={labelCls}>Assignment ID</label>
                  <input value={createForm.assignmentId} onChange={(e) => setCreateForm((f) => ({ ...f, assignmentId: e.target.value }))} className={inputCls} placeholder="Optional" />
                </div>
                <div>
                  <label className={labelCls}>Order ID</label>
                  <input value={createForm.orderId} onChange={(e) => setCreateForm((f) => ({ ...f, orderId: e.target.value }))} className={inputCls} placeholder="Optional" />
                </div>
              </div>
              {submitError && <p className="text-sm text-rose-600">{submitError}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowCreate(false); setSubmitError(''); }} className="flex-1 rounded-full border border-slate-200 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 rounded-full bg-[#B88A2E] py-3 text-sm font-semibold text-white hover:bg-[#a07828] disabled:opacity-60">
                  {submitting ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AuthGuard>
  );
}
