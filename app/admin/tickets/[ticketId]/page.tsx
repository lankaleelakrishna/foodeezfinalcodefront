'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGuard from '../../../components/AuthGuard';
import { adminTicketsApi, AdminCustomerTicketStatus, AdminTicketPriority } from '../../../../lib/api';

type TicketDetail = {
  id: string;
  type: string;
  status: AdminCustomerTicketStatus;
  priority: AdminTicketPriority;
  description: string;
  adminNote?: string;
  customer?: { id: string; name: string; email: string; phone: string };
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  orderId?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
};

const STATUSES: AdminCustomerTicketStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const PRIORITIES: AdminTicketPriority[]     = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

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

export default function TicketDetailPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const router = useRouter();

  const [ticket, setTicket]   = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const [form, setForm]       = useState<{ status: AdminCustomerTicketStatus | ''; priority: AdminTicketPriority | ''; adminNote: string }>({
    status: '', priority: '', adminNote: '',
  });
  const [saving, setSaving]   = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    adminTicketsApi.get(ticketId)
      .then(({ data }) => {
        setTicket(data);
        setForm({ status: data.status, priority: data.priority, adminNote: data.adminNote ?? '' });
      })
      .catch(() => setError('Failed to load ticket.'))
      .finally(() => setLoading(false));
  }, [ticketId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg('');
    try {
      const payload: Record<string, string> = {};
      if (form.status)    payload.status    = form.status;
      if (form.priority)  payload.priority  = form.priority;
      if (form.adminNote !== undefined) payload.adminNote = form.adminNote;
      const { data } = await adminTicketsApi.update(ticketId, payload as any);
      setTicket(data);
      setSaveMsg('Ticket updated successfully.');
    } catch {
      setSaveMsg('Failed to update ticket.');
    } finally {
      setSaving(false);
    }
  }

  const INPUT  = 'w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300';
  const SELECT = 'w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300';

  if (loading) return (
    <AuthGuard requiredRoles={['super_admin']}>
      <div className="rounded-2xl bg-white p-8 text-slate-500 shadow-sm">Loading…</div>
    </AuthGuard>
  );

  if (error || !ticket) return (
    <AuthGuard requiredRoles={['super_admin']}>
      <div className="rounded-2xl bg-rose-50 p-6 text-rose-700">{error || 'Ticket not found.'}</div>
    </AuthGuard>
  );

  return (
    <AuthGuard requiredRoles={['super_admin']}>
      <div className="space-y-6">

        {/* Header */}
        <div className="rounded-3xl bg-white p-8 shadow-lg">
          <button onClick={() => router.back()} className="mb-4 text-sm text-slate-400 hover:text-slate-600 transition">
            ← Back to Tickets
          </button>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold">Support Ticket</h1>
              <p className="mt-1 font-mono text-sm text-slate-400">{ticket.id}</p>
              <p className="mt-1 text-sm text-slate-500">{ticket.type.replace(/_/g, ' ')} · Opened {new Date(ticket.createdAt).toLocaleString()}</p>
            </div>
            <div className="flex gap-2">
              <span className={`rounded-full px-4 py-1 text-sm font-medium ${STATUS_COLORS[ticket.status] ?? 'bg-slate-100 text-slate-600'}`}>
                {ticket.status.replace(/_/g, ' ')}
              </span>
              <span className={`rounded-full px-4 py-1 text-sm font-medium ${PRIORITY_COLORS[ticket.priority] ?? 'bg-slate-100 text-slate-600'}`}>
                {ticket.priority}
              </span>
            </div>
          </div>
        </div>

        {/* Ticket info */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Customer</h2>
            {(ticket.customer || ticket.customerName) ? (
              <>
                <p
                  className="cursor-pointer font-medium text-slate-900 hover:underline"
                  onClick={() => ticket.customer ? router.push(`/admin/customers/${ticket.customer.id}`) : undefined}
                >
                  {ticket.customer?.name ?? ticket.customerName ?? '—'}
                </p>
                <p className="text-sm text-slate-500">{ticket.customer?.phone ?? ticket.customerPhone ?? ''}</p>
              </>
            ) : <p className="text-slate-500">—</p>}
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Timeline</h2>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-400">Created</dt>
                <dd className="text-slate-700">{new Date(ticket.createdAt).toLocaleString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Last Updated</dt>
                <dd className="text-slate-700">{new Date(ticket.updatedAt).toLocaleString()}</dd>
              </div>
              {ticket.resolvedAt && (
                <div className="flex justify-between">
                  <dt className="text-slate-400">Resolved</dt>
                  <dd className="text-emerald-700">{new Date(ticket.resolvedAt).toLocaleString()}</dd>
                </div>
              )}
              {ticket.closedAt && (
                <div className="flex justify-between">
                  <dt className="text-slate-400">Closed</dt>
                  <dd className="text-slate-700">{new Date(ticket.closedAt).toLocaleString()}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Description */}
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-base font-semibold">Description</h2>
          <p className="text-sm leading-relaxed text-slate-700">{ticket.description}</p>
          {ticket.orderId && (
            <p className="mt-3 text-sm text-slate-500">
              Related Order:{' '}
              <span
                className="cursor-pointer font-mono text-slate-700 hover:underline"
                onClick={() => router.push(`/admin/orders/${ticket.orderId}`)}
              >
                {ticket.orderId.slice(0, 8)}…
              </span>
            </p>
          )}
          {ticket.adminNote && (
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Admin Note</p>
              <p className="mt-1 text-sm text-slate-700">{ticket.adminNote}</p>
            </div>
          )}
        </div>

        {/* Update form */}
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">Update Ticket</h2>

          {saveMsg && (
            <div className={`mb-4 rounded-2xl p-4 text-sm ${saveMsg.includes('success') ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {saveMsg}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as AdminCustomerTicketStatus }))}
                  className={SELECT}
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as AdminTicketPriority }))}
                  className={SELECT}
                >
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Admin Note</label>
              <textarea
                value={form.adminNote}
                onChange={(e) => setForm((f) => ({ ...f, adminNote: e.target.value }))}
                rows={3}
                placeholder="Internal note visible only to admins…"
                className={INPUT}
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-slate-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-slate-700 transition disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </div>

      </div>
    </AuthGuard>
  );
}
