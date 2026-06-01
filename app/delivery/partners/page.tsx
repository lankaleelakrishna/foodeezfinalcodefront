'use client';

import { useEffect, useState } from 'react';
import AuthGuard from '../../components/AuthGuard';
import {
  deliveryPartnersApi,
  DeliveryPartnerStatus,
  VehicleType,
  CreateDeliveryPartnerPayload,
} from '../../../lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

type Partner = {
  id: string;
  name: string;
  email: string;
  phone: string;
  vehicleType: VehicleType;
  vehicleNumber: string;
  vehicleModel?: string;
  licenseNumber: string;
  status: DeliveryPartnerStatus;
  isOnline: boolean;
  isAvailable: boolean;
  rating: number;
  totalRatings: number;
  totalDeliveries: number;
  totalEarnings: number;
  city?: string;
  state?: string;
  createdAt: string;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<DeliveryPartnerStatus, string> = {
  PENDING:  'bg-amber-100 text-amber-700',
  VERIFIED: 'bg-blue-100 text-blue-700',
  ACTIVE:   'bg-emerald-100 text-emerald-700',
  INACTIVE: 'bg-slate-100 text-slate-600',
  BLOCKED:  'bg-rose-100 text-rose-700',
};

const VEHICLE_LABELS: Record<VehicleType, string> = {
  BICYCLE:          'Bicycle',
  MOTORCYCLE:       'Motorcycle',
  CAR:              'Car',
  SCOOTER:          'Scooter',
  ELECTRIC_SCOOTER: 'E-Scooter',
};

const BLANK_FORM: CreateDeliveryPartnerPayload = {
  name: '', email: '', phone: '',
  vehicleType: 'MOTORCYCLE', vehicleNumber: '', licenseNumber: '',
  vehicleModel: '', aadharNumber: '', panNumber: '',
  bankAccountNumber: '', bankIfscCode: '', bankName: '',
  city: '', state: '',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n);
}

// ── Sub-components ────────────────────────────────────────────────────────────


function OnlineDot({ online }: { online: boolean }) {
  return (
    <span className={`inline-block h-2 w-2 rounded-full ${online ? 'bg-emerald-500' : 'bg-slate-300'}`} />
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DeliveryPartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateDeliveryPartnerPayload>({ ...BLANK_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [rateModal, setRateModal] = useState<{ id: string; name: string } | null>(null);
  const [rating, setRating] = useState(5);
  const [rateComment, setRateComment] = useState('');
  const [rateSubmitting, setRateSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    setError('');
    deliveryPartnersApi.list(page, limit, statusFilter || undefined)
      .then((r) => {
        const raw = r.data;
        const items = Array.isArray(raw) ? raw : (raw?.items ?? raw?.data ?? []);
        setPartners(Array.isArray(items) ? items : []);
        setTotal(raw?.total ?? raw?.count ?? (Array.isArray(items) ? items.length : 0));
      })
      .catch(() => setError('Failed to load partners.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, statusFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    try {
      await deliveryPartnersApi.create(form);
      setShowCreate(false);
      setForm({ ...BLANK_FORM });
      load();
    } catch (err: any) {
      setSubmitError(err?.response?.data?.message ?? 'Failed to create partner.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, status: DeliveryPartnerStatus) => {
    try {
      await deliveryPartnersApi.updateStatus(id, status);
      load();
    } catch {}
  };

  const handleRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rateModal) return;
    setRateSubmitting(true);
    try {
      await deliveryPartnersApi.rate(rateModal.id, rating, rateComment || undefined);
      setRateModal(null);
      setRating(5);
      setRateComment('');
      load();
    } catch {}
    setRateSubmitting(false);
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
              <h1 className="mt-4 text-4xl font-semibold text-slate-900">Delivery Partners</h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">Manage riders and their verification status.</p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="self-start rounded-full bg-[#B88A2E] px-6 py-3 text-sm font-semibold text-white shadow-sm shadow-amber-300/20 transition hover:bg-[#a07828]"
            >
              Add Partner
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          {['', 'PENDING', 'VERIFIED', 'ACTIVE', 'INACTIVE', 'BLOCKED'].map((s) => (
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
          ) : partners.length === 0 ? (
            <p className="text-sm text-slate-400">No partners found.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-[0.16em] text-slate-400">
                      <th className="pb-3 pr-4 font-medium">Name</th>
                      <th className="pb-3 pr-4 font-medium">Phone</th>
                      <th className="pb-3 pr-4 font-medium">Vehicle</th>
                      <th className="pb-3 pr-4 font-medium">Status</th>
                      <th className="pb-3 pr-4 font-medium">Online</th>
                      <th className="pb-3 pr-4 font-medium">Rating</th>
                      <th className="pb-3 pr-4 font-medium">Deliveries</th>
                      <th className="pb-3 pr-4 font-medium">Earnings</th>
                      <th className="pb-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {partners.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 pr-4">
                          <p className="font-medium text-slate-800">{p.name}</p>
                          <p className="text-xs text-slate-400">{p.email}</p>
                        </td>
                        <td className="py-3 pr-4 text-slate-600">{p.phone}</td>
                        <td className="py-3 pr-4 text-slate-600">
                          <p>{VEHICLE_LABELS[p.vehicleType]}</p>
                          <p className="text-xs text-slate-400">{p.vehicleNumber}</p>
                        </td>
                        <td className="py-3 pr-4">
                          <select
                            value={p.status}
                            onChange={(e) => handleStatusChange(p.id, e.target.value as DeliveryPartnerStatus)}
                            className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-1 text-xs outline-none focus:border-[#B88A2E]"
                          >
                            {(['PENDING','VERIFIED','ACTIVE','INACTIVE','BLOCKED'] as DeliveryPartnerStatus[]).map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-1.5">
                            <OnlineDot online={p.isOnline} />
                            <span className="text-xs text-slate-500">{p.isOnline ? 'Online' : 'Offline'}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-slate-700">
                          ⭐ {Number(p.rating).toFixed(1)} <span className="text-xs text-slate-400">({p.totalRatings})</span>
                        </td>
                        <td className="py-3 pr-4 tabular-nums text-slate-700">{p.totalDeliveries}</td>
                        <td className="py-3 pr-4 tabular-nums text-slate-700">{fmt(p.totalEarnings)}</td>
                        <td className="py-3">
                          <button
                            onClick={() => setRateModal({ id: p.id, name: p.name })}
                            className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                          >
                            Rate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  {total === 0 ? 'No partners' : `${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total}`}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page * limit >= total}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create Partner Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-[2rem] bg-white p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Add Delivery Partner</h2>
              <button onClick={() => { setShowCreate(false); setSubmitError(''); }} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Full Name</label>
                  <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="Raju Kumar" />
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input required type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={inputCls} placeholder="raju@example.com" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Phone</label>
                  <input required value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className={inputCls} placeholder="+91 9876543210" />
                </div>
                <div>
                  <label className={labelCls}>Vehicle Type</label>
                  <select value={form.vehicleType} onChange={(e) => setForm((f) => ({ ...f, vehicleType: e.target.value as VehicleType }))} className={inputCls}>
                    {(Object.keys(VEHICLE_LABELS) as VehicleType[]).map((v) => (
                      <option key={v} value={v}>{VEHICLE_LABELS[v]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Vehicle Number</label>
                  <input required value={form.vehicleNumber} onChange={(e) => setForm((f) => ({ ...f, vehicleNumber: e.target.value }))} className={inputCls} placeholder="TS09AB1234" />
                </div>
                <div>
                  <label className={labelCls}>Vehicle Model</label>
                  <input value={form.vehicleModel} onChange={(e) => setForm((f) => ({ ...f, vehicleModel: e.target.value }))} className={inputCls} placeholder="Honda Activa" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>License Number</label>
                  <input required value={form.licenseNumber} onChange={(e) => setForm((f) => ({ ...f, licenseNumber: e.target.value }))} className={inputCls} placeholder="TS0920230001234" />
                </div>
                <div>
                  <label className={labelCls}>Aadhar Number</label>
                  <input value={form.aadharNumber} onChange={(e) => setForm((f) => ({ ...f, aadharNumber: e.target.value }))} className={inputCls} placeholder="Optional" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>City</label>
                  <input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} className={inputCls} placeholder="Hyderabad" />
                </div>
                <div>
                  <label className={labelCls}>State</label>
                  <input value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} className={inputCls} placeholder="Telangana" />
                </div>
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 pt-2">Bank Details (Optional)</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Account Number</label>
                  <input value={form.bankAccountNumber} onChange={(e) => setForm((f) => ({ ...f, bankAccountNumber: e.target.value }))} className={inputCls} placeholder="Optional" />
                </div>
                <div>
                  <label className={labelCls}>IFSC Code</label>
                  <input value={form.bankIfscCode} onChange={(e) => setForm((f) => ({ ...f, bankIfscCode: e.target.value }))} className={inputCls} placeholder="Optional" />
                </div>
                <div>
                  <label className={labelCls}>Bank Name</label>
                  <input value={form.bankName} onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))} className={inputCls} placeholder="Optional" />
                </div>
              </div>
              {submitError && <p className="text-sm text-rose-600">{submitError}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowCreate(false); setSubmitError(''); }} className="flex-1 rounded-full border border-slate-200 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 rounded-full bg-[#B88A2E] py-3 text-sm font-semibold text-white transition hover:bg-[#a07828] disabled:opacity-60">
                  {submitting ? 'Adding…' : 'Add Partner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rate Modal */}
      {rateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-[2rem] bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Rate {rateModal.name}</h2>
              <button onClick={() => setRateModal(null)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>
            <form onSubmit={handleRate} className="space-y-4">
              <div>
                <label className={labelCls}>Rating (1–5)</label>
                <input
                  type="number" min="1" max="5" step="0.1" required
                  value={rating}
                  onChange={(e) => setRating(parseFloat(e.target.value))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Comment (Optional)</label>
                <textarea rows={3} value={rateComment} onChange={(e) => setRateComment(e.target.value)} className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#B88A2E]" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setRateModal(null)} className="flex-1 rounded-full border border-slate-200 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={rateSubmitting} className="flex-1 rounded-full bg-[#B88A2E] py-3 text-sm font-semibold text-white hover:bg-[#a07828] disabled:opacity-60">
                  {rateSubmitting ? 'Submitting…' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AuthGuard>
  );
}
