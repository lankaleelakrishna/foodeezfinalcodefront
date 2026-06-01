'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '../../../lib/api';
import { getUserRole } from '../../../lib/auth';
import AuthGuard from '../../components/AuthGuard';

// ── Types ─────────────────────────────────────────────────────────────────────

type RestaurantDetail = {
  id: string; name: string; ownerName: string; email: string; phone: string;
  address: string; city: string; state: string; zipCode: string;
  status: string; onboardingStep: number; leadStatus: string | null; riskScore: number;
  cuisineTags?: string[]; brandDescription?: string; serviceRadiusKm?: number;
  gstNumber?: string; fssaiNumber?: string;
  bankName?: string; bankAccountNumber?: string; ifscCode?: string;
  temporaryClosure: boolean; holidayMode: boolean;
};

type EditForm = {
  brandDescription: string; cuisineTags: string; serviceRadiusKm: string;
  gstNumber: string; fssaiNumber: string;
  bankName: string; bankAccountNumber: string; ifscCode: string;
  temporaryClosure: boolean; holidayMode: boolean; status: string; leadStatus: string;
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-[#B88A2E]/10 text-[#B88A2E]',
  review: 'bg-blue-100 text-blue-700',
  rejected: 'bg-rose-100 text-rose-700',
};

const INPUT = 'mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--tx)] outline-none transition focus:border-[var(--accent)]';

// ── Review panel ──────────────────────────────────────────────────────────────

function ReviewPanel({ restaurantId, restaurant, onSaved }: {
  restaurantId: string;
  restaurant: RestaurantDetail;
  onSaved: (updated: RestaurantDetail) => void;
}) {
  const [form, setForm] = useState<EditForm>({
    brandDescription: restaurant.brandDescription ?? '',
    cuisineTags: restaurant.cuisineTags?.join(', ') ?? '',
    serviceRadiusKm: restaurant.serviceRadiusKm?.toString() ?? '',
    gstNumber: restaurant.gstNumber ?? '',
    fssaiNumber: restaurant.fssaiNumber ?? '',
    bankName: restaurant.bankName ?? '',
    bankAccountNumber: restaurant.bankAccountNumber ?? '',
    ifscCode: restaurant.ifscCode ?? '',
    temporaryClosure: restaurant.temporaryClosure,
    holidayMode: restaurant.holidayMode,
    status: restaurant.status,
    leadStatus: restaurant.leadStatus ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [serverError, setServerError] = useState('');

  const set = (field: keyof EditForm, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveStatus('idle');
    setServerError('');
    try {
      const res = await api.patch(`/restaurants/${restaurantId}`, {
        brandDescription: form.brandDescription || undefined,
        cuisineTags: form.cuisineTags
          ? form.cuisineTags.split(',').map((t) => t.trim()).filter(Boolean)
          : [],
        serviceRadiusKm: form.serviceRadiusKm ? Number(form.serviceRadiusKm) : undefined,
        gstNumber: form.gstNumber || undefined,
        fssaiNumber: form.fssaiNumber || undefined,
        bankName: form.bankName || undefined,
        bankAccountNumber: form.bankAccountNumber || undefined,
        ifscCode: form.ifscCode ? form.ifscCode.toUpperCase() : undefined,
        temporaryClosure: form.temporaryClosure,
        holidayMode: form.holidayMode,
        status: form.status,
        leadStatus: form.leadStatus || undefined,
      });
      setSaveStatus('success');
      onSaved(res.data);
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: any) {
      setSaveStatus('error');
      const msg = err?.response?.data?.message;
      setServerError(Array.isArray(msg) ? msg.join(' ') : (msg ?? 'Failed to save changes.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="rounded-3xl bg-[var(--surface)] p-8 shadow-sm border border-[var(--border)] space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Review &amp; Edit Restaurant</h2>
        {saveStatus === 'success' && (
          <span className="text-sm font-medium text-emerald-600">Saved successfully</span>
        )}
      </div>

      {serverError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{serverError}</div>
      )}

      {/* Status */}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-[var(--tx-2)]">Status</span>
          <select
            value={form.status}
            onChange={(e) => set('status', e.target.value)}
            className={INPUT}
          >
            <option value="pending">Pending</option>
            <option value="review">Review</option>
            <option value="active">Active</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-[var(--tx-2)]">Lead status</span>
          <select
            value={form.leadStatus}
            onChange={(e) => set('leadStatus', e.target.value)}
            className={INPUT}
          >
            <option value="INTERESTED">Interested</option>
            <option value="REGISTERED">Registered</option>
            <option value="ACTIVATED">Activated</option>
            <option value="REVIEW">Review</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </label>
      </div>

      {/* Brand */}
      <div className="grid gap-4">
        <label className="block">
          <span className="text-sm font-medium text-[var(--tx-2)]">Brand description</span>
          <textarea
            value={form.brandDescription}
            onChange={(e) => set('brandDescription', e.target.value)}
            className={`${INPUT} resize-none`}
            rows={3}
            maxLength={500}
            placeholder="Describe the concept, cuisine, and customer experience…"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-[var(--tx-2)]">Cuisine tags</span>
          <input
            value={form.cuisineTags}
            onChange={(e) => set('cuisineTags', e.target.value)}
            className={INPUT}
            placeholder="North Indian, Chinese (comma-separated)"
            maxLength={200}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-[var(--tx-2)]">Service radius (km)</span>
          <input
            type="number" min={0.1} max={500} step={0.1}
            value={form.serviceRadiusKm}
            onChange={(e) => set('serviceRadiusKm', e.target.value)}
            className={INPUT}
            placeholder="e.g. 5"
          />
        </label>
      </div>

      {/* Compliance */}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-[var(--tx-2)]">GSTIN</span>
          <input
            value={form.gstNumber}
            onChange={(e) => set('gstNumber', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15))}
            className={INPUT} maxLength={15} placeholder="22AAAAA0000A1Z5"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-[var(--tx-2)]">FSSAI number</span>
          <input
            value={form.fssaiNumber}
            onChange={(e) => set('fssaiNumber', e.target.value.replace(/\D/g, '').slice(0, 14))}
            className={INPUT} maxLength={14} placeholder="14-digit FSSAI"
          />
        </label>
      </div>

      {/* Banking */}
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="text-sm font-medium text-[var(--tx-2)]">Bank name</span>
          <input value={form.bankName} onChange={(e) => set('bankName', e.target.value)} className={INPUT} maxLength={100} />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-[var(--tx-2)]">Account number</span>
          <input
            value={form.bankAccountNumber}
            onChange={(e) => set('bankAccountNumber', e.target.value.replace(/\D/g, '').slice(0, 18))}
            className={INPUT} maxLength={18}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-[var(--tx-2)]">IFSC code</span>
          <input
            value={form.ifscCode}
            onChange={(e) => set('ifscCode', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11))}
            className={INPUT} maxLength={11} placeholder="SBIN0001234"
          />
        </label>
      </div>

      {/* Toggles */}
      <div>
        <p className="mb-3 text-sm font-medium text-[var(--tx-2)]">Operational status</p>
        <div className="flex flex-wrap gap-3">
          <button type="button"
            onClick={() => set('temporaryClosure', !form.temporaryClosure)}
            className={`rounded-2xl px-4 py-2.5 text-sm transition ${form.temporaryClosure ? 'bg-[#B88A2E] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
            {form.temporaryClosure ? 'Temporary closure: ON' : 'Temporary closure: OFF'}
          </button>
          <button type="button"
            onClick={() => set('holidayMode', !form.holidayMode)}
            className={`rounded-2xl px-4 py-2.5 text-sm transition ${form.holidayMode ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
            {form.holidayMode ? 'Holiday mode: ON' : 'Holiday mode: OFF'}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-2xl bg-[var(--accent)] px-4 py-3 text-white transition hover:bg-[var(--accent-2)] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RestaurantDetailPage() {
  const router = useRouter();
  const params = useParams();
  const restaurantId = params.id as string;
  const [restaurant, setRestaurant] = useState<RestaurantDetail | null>(null);
  const [defaultBranchId, setDefaultBranchId] = useState<string | null>(null);
  const [showMenuSetup, setShowMenuSetup] = useState(false);
  const [menuSetupName, setMenuSetupName] = useState('');
  const [creatingBranch, setCreatingBranch] = useState(false);
  const [menuSetupError, setMenuSetupError] = useState('');
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    setUserRole(getUserRole());
    Promise.all([
      api.get(`/restaurants/${restaurantId}`),
      api.get(`/restaurants/${restaurantId}/branches`).catch(() => ({ data: [] })),
    ])
      .then(([rRes, bRes]) => {
        setRestaurant(rRes.data);
        const branches: { id: string }[] = bRes.data;
        if (branches.length > 0) setDefaultBranchId(branches[0].id);
      })
      .catch(() => setError('Unable to load restaurant data.'));
  }, [restaurantId]);

  const handleViewMenu = () => {
    if (defaultBranchId) {
      router.push(`/restaurants/${restaurantId}/branches/${defaultBranchId}/menu`);
      return;
    }
    setMenuSetupName(restaurant?.name ?? '');
    setMenuSetupError('');
    setShowMenuSetup(true);
  };

  const handleMenuSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant || !menuSetupName.trim()) return;
    setCreatingBranch(true);
    setMenuSetupError('');
    try {
      const res = await api.post(`/restaurants/${restaurantId}/branches`, {
        name: menuSetupName.trim(),
        address: restaurant.address,
        city: restaurant.city,
        state: restaurant.state,
        zipCode: restaurant.zipCode,
        isOnline: false,
        openingTime: '09:00',
        closingTime: '22:00',
        latitude:  0,
        longitude: 0,
      });
      const branchId: string = res.data.id;
      setDefaultBranchId(branchId);
      setShowMenuSetup(false);
      router.push(`/restaurants/${restaurantId}/branches/${branchId}/menu`);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setMenuSetupError(Array.isArray(msg) ? msg.join(' ') : (msg ?? 'Unable to set up menu. Please try again.'));
    } finally {
      setCreatingBranch(false);
    }
  };

  const canEdit = userRole === 'restaurant_admin' || userRole === 'super_admin';
  const statusCls = restaurant ? (STATUS_COLORS[restaurant.status] ?? 'bg-slate-100 text-slate-600') : '';

  return (
    <AuthGuard requiredRoles={['super_admin', 'sales_operator', 'restaurant_owner', 'restaurant_admin', 'restaurant_manager']}>
      <div className="space-y-6">

          {/* Header */}
          <div className="rounded-3xl bg-[var(--surface)] p-8 shadow-lg">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-semibold">{restaurant?.name ?? 'Restaurant details'}</h1>
                <p className="mt-1 text-slate-500">Partner profile and management hub.</p>
              </div>
              <button onClick={() => router.back()}
                className="rounded-2xl border border-[var(--border)] px-4 py-2 text-sm text-[var(--tx-2)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition">
                ← Back
              </button>
            </div>
          </div>

          {error && <div className="rounded-2xl bg-rose-50 p-4 text-rose-700">{error}</div>}
          {!restaurant && !error && <div className="rounded-2xl bg-white p-8 text-slate-500 shadow-sm">Loading…</div>}

          {restaurant && (
            <div className="grid gap-6 xl:grid-cols-[1fr_340px]">

              {/* Left column */}
              <div className="space-y-6">

                {/* Overview card */}
                <div className="rounded-3xl bg-[var(--surface)] p-8 shadow-sm border border-[var(--border)]">
                  <div className="flex flex-wrap items-center gap-3 mb-6">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusCls}`}>
                      {restaurant.status}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                      Onboarding {restaurant.onboardingStep}/5
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 capitalize">
                      {restaurant.leadStatus?.toLowerCase()}
                    </span>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-slate-400">Owner</p>
                      <p className="mt-1 font-semibold">{restaurant.ownerName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Email</p>
                      <p className="mt-1 font-semibold">{restaurant.email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Phone</p>
                      <p className="mt-1 font-semibold">{restaurant.phone}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Risk score</p>
                      <p className="mt-1 font-semibold">{(restaurant.riskScore * 100).toFixed(0)}%</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-xs text-slate-400">Address</p>
                      <p className="mt-1 font-semibold">
                        {restaurant.address}, {restaurant.city}, {restaurant.state} – {restaurant.zipCode}
                      </p>
                    </div>
                  </div>

                  {restaurant.brandDescription && (
                    <div className="mt-6 rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-400">Brand description</p>
                      <p className="mt-2 text-sm text-slate-700">{restaurant.brandDescription}</p>
                    </div>
                  )}

                  {!!restaurant.cuisineTags?.length && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {restaurant.cuisineTags.map((tag) => (
                        <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Review / Edit panel — restaurant_admin & super_admin */}
                {canEdit && (
                  <ReviewPanel
                    restaurantId={restaurantId}
                    restaurant={restaurant}
                    onSaved={(updated) => setRestaurant(updated)}
                  />
                )}
              </div>

              {/* Right column — actions */}
              <div className="space-y-4">
                <div className="rounded-3xl bg-[var(--surface)] p-6 shadow-sm border border-[var(--border)]">
                  <h2 className="text-lg font-semibold">Menu</h2>
                  <p className="mt-1 text-sm text-slate-500">Manage categories and items.</p>

                  {!showMenuSetup ? (
                    <button
                      onClick={handleViewMenu}
                      className="mt-4 block w-full rounded-2xl border border-[var(--border)] px-4 py-3 text-center text-sm font-medium text-[var(--tx)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition"
                    >
                      View menu
                    </button>
                  ) : (
                    <form onSubmit={handleMenuSetupSubmit} className="mt-4 space-y-3">
                      <p className="text-xs text-[var(--tx-3)]">Give this branch a name to set up the menu.</p>

                      <label className="block">
                        <span className="text-xs font-medium text-slate-600">Branch / kitchen name <span className="text-rose-500">*</span></span>
                        <input
                          value={menuSetupName}
                          onChange={(e) => setMenuSetupName(e.target.value)}
                          placeholder="e.g. Main Kitchen"
                          required
                          className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5 text-sm text-[var(--tx)] outline-none focus:border-[var(--accent)]"
                        />
                      </label>

                      {menuSetupError && (
                        <p className="text-xs text-rose-600">{menuSetupError}</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={creatingBranch}
                          className="flex-1 rounded-2xl bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-2)] disabled:opacity-60 disabled:cursor-not-allowed transition"
                        >
                          {creatingBranch ? 'Setting up…' : 'Set up & view menu'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowMenuSetup(false)}
                          className="rounded-2xl border border-[var(--border)] px-4 py-2.5 text-sm text-[var(--tx-3)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                <div className="rounded-3xl bg-[var(--surface)] p-6 shadow-sm border border-[var(--border)]">
                  <h2 className="text-lg font-semibold">Team</h2>
                  <p className="mt-1 text-sm text-slate-500">Manage staff and role access.</p>
                  <Link href={`/restaurants/${restaurantId}/users`}
                    className="mt-4 block rounded-2xl bg-[var(--accent)] px-4 py-3 text-center text-sm font-medium text-white hover:bg-[var(--accent-2)] transition">
                    Manage users
                  </Link>
                </div>

                <div className="rounded-3xl bg-[var(--surface)] p-6 shadow-sm border border-[var(--border)]">
                  <h2 className="text-lg font-semibold">Documents</h2>
                  <p className="mt-1 text-sm text-slate-500">FSSAI, GST, and bank certificates.</p>
                  <Link href={`/restaurants/${restaurantId}/documents`}
                    className="mt-4 block rounded-2xl border border-[var(--border)] px-4 py-3 text-center text-sm font-medium text-[var(--tx)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition">
                    View documents
                  </Link>
                </div>

                <div className="rounded-3xl bg-[var(--surface)] p-6 shadow-sm border border-[var(--border)]">
                  <h2 className="text-lg font-semibold">Branches</h2>
                  <p className="mt-1 text-sm text-slate-500">Manage locations and add new branches.</p>
                  <Link href={`/restaurants/${restaurantId}/branches`}
                    className="mt-4 block rounded-2xl border border-[var(--border)] px-4 py-3 text-center text-sm font-medium text-[var(--tx)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition">
                    Manage branches
                  </Link>
                </div>
              </div>
            </div>
          )}
      </div>
    </AuthGuard>
  );
}
