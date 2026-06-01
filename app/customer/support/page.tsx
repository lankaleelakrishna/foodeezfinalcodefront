'use client';

import { useEffect, useState } from 'react';
import { customerSupportApi, CustomerTicketType, CustomerTicketPriority } from '../../../lib/api';
import { getCustomerToken } from '../../../lib/customer-auth';

type Ticket = {
  id: string; type: string; description: string; status: string;
  priority: string; createdAt: string; orderId?: string;
};

const TICKET_TYPES: CustomerTicketType[] = [
  'MISSING_ITEM',
  'WRONG_ORDER',
  'DELIVERY_ISSUE',
  'PAYMENT_ISSUE',
  'REFUND_REQUEST',
  'FOOD_QUALITY',
  'OTHER',
];

const STATUS_COLOR: Record<string, string> = {
  OPEN: 'bg-blue-50 text-blue-700',
  IN_PROGRESS: 'bg-amber-50 text-amber-700',
  RESOLVED: 'bg-green-50 text-green-700',
  CLOSED: 'bg-slate-100 text-slate-500',
};

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<CustomerTicketType>('MISSING_ITEM');
  const [description, setDescription] = useState('');
  const [orderId, setOrderId] = useState('');
  const [priority, setPriority] = useState<CustomerTicketPriority>('MEDIUM');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const normalizeTickets = (raw: any): Ticket[] => {
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.tickets)) return raw.tickets;
    if (Array.isArray(raw?.data?.tickets)) return raw.data.tickets;
    if (Array.isArray(raw?.data)) return raw.data;
    return [];
  };

  const fetchTickets = async () => {
    try {
      const res = await customerSupportApi.getTickets(1, 20);
      const data = normalizeTickets(res.data);
      if (res.data && !data.length) {
        console.warn('Unexpected tickets response:', res.data);
      }
      setTickets(data);
    } catch {
      setError('Failed to load tickets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = getCustomerToken();
    if (!token) {
      setLoading(false);
      setError('Please sign in to view support tickets.');
      return;
    }
    fetchTickets();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim().length < 10) { setError('Description must be at least 10 characters.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await customerSupportApi.createTicket({
        type, description, priority, orderId: orderId.trim() || undefined,
      });
      await fetchTickets();
      setShowForm(false);
      setDescription('');
      setOrderId('');
      setType('MISSING_ITEM');
      setPriority('MEDIUM');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to create ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-950">Support</h1>
        <button onClick={() => setShowForm((v) => !v)}
          className="rounded-2xl bg-[#B88A2E] px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:brightness-110">
          {showForm ? 'Cancel' : '+ New ticket'}
        </button>
      </div>

      {error && <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      {/* New ticket form */}
      {showForm && (
        <form onSubmit={handleSubmit}
          className="mb-6 space-y-4 rounded-[1.5rem] border border-slate-200/60 bg-white p-5">
          <p className="font-bold text-slate-900">New support ticket</p>

          <div>
            <label className="block text-sm font-medium text-slate-700">Issue type</label>
            <select value={type} onChange={(e) => setType(e.target.value as CustomerTicketType)}
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-amber-400">
              {TICKET_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Priority</label>
            <div className="mt-2 flex gap-2">
              {(['LOW', 'MEDIUM', 'HIGH'] as CustomerTicketPriority[]).map((p) => (
                <label key={p}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${priority === p ? 'border-[#B88A2E] bg-amber-50 text-slate-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  <input type="radio" name="priority" value={p} checked={priority === p}
                    onChange={() => setPriority(p)} className="sr-only" />
                  {p}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Order ID <span className="text-slate-400">(optional)</span>
            </label>
            <input type="text" value={orderId} onChange={(e) => setOrderId(e.target.value)}
              placeholder="Paste your order ID if related"
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              required rows={4} minLength={10} maxLength={1000}
              placeholder="Describe your issue (min 10 characters)…"
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200 resize-none" />
            <p className="mt-1 text-right text-xs text-slate-400">{description.length}/1000</p>
          </div>

          <button type="submit" disabled={submitting}
            className="w-full rounded-2xl bg-[#B88A2E] py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:opacity-60">
            {submitting ? 'Submitting…' : 'Submit ticket'}
          </button>
        </form>
      )}

      {/* Ticket list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-200" />)}
        </div>
      ) : tickets.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-5xl">🎧</p>
          <p className="mt-4 text-lg font-semibold text-slate-700">No support tickets</p>
          <p className="mt-1 text-sm text-slate-400">Create a ticket if you need help with an order or payment.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <div key={ticket.id}
              className="rounded-2xl border border-slate-200/60 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">{ticket.type.replace(/_/g, ' ')}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[ticket.status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {ticket.status}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ticket.priority === 'HIGH' ? 'bg-red-50 text-red-600' : ticket.priority === 'MEDIUM' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                      {ticket.priority}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">{ticket.description}</p>
                  {ticket.orderId && <p className="mt-0.5 text-xs text-slate-400">Order: {ticket.orderId}</p>}
                </div>
                <p className="shrink-0 text-xs text-slate-400">{new Date(ticket.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}