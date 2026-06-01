'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '../../../../../lib/api';
import AuthGuard from '../../../../components/AuthGuard';

const INPUT = 'mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--tx)] outline-none transition focus:border-[var(--accent)] placeholder:text-[var(--tx-3)]';

export default function CreateBranchPage() {
  const router = useRouter();
  const params = useParams();

  const [form, setForm] = useState({
    name: '', address: '', city: '', state: '', zipCode: '',
    openingTime: '09:00', closingTime: '22:00',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim())    e.name    = 'Required.';
    if (!form.address.trim()) e.address = 'Required.';
    if (!form.city.trim())    e.city    = 'Required.';
    if (!form.state.trim())   e.state   = 'Required.';
    if (!form.zipCode.trim()) e.zipCode = 'Required.';
    if (!form.openingTime) e.openingTime = 'Required.';
    if (!form.closingTime) e.closingTime = 'Required.';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      await api.post(`/restaurants/${params.id}/branches`, {
        name:        form.name.trim(),
        address:     form.address.trim(),
        city:        form.city.trim(),
        state:       form.state.trim(),
        zipCode:     form.zipCode.trim(),
        latitude:    0,
        longitude:   0,
        openingTime: form.openingTime,
        closingTime: form.closingTime,
        isOnline:    false,
      });
      router.push(`/restaurants/${params.id}/branches`);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setServerError(Array.isArray(msg) ? msg.join(' ') : (msg ?? 'Unable to create branch. Please check your inputs.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthGuard requiredRoles={['super_admin', 'sales_operator', 'restaurant_owner', 'restaurant_admin', 'restaurant_manager']}>
      <div className="mx-auto max-w-2xl space-y-6">

        <div className="rounded-3xl bg-[var(--surface)] p-8 shadow-lg">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-[var(--tx)]">Add Branch</h1>
              <p className="mt-1 text-sm text-[var(--tx-3)]">Create a new outlet for this restaurant.</p>
            </div>
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-2xl border border-[var(--border)] px-4 py-2 text-sm text-[var(--tx-2)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              ← Back
            </button>
          </div>
        </div>

        {serverError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{serverError}</div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-5">

          {/* ── Basic info ── */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--tx-3)]">Branch Details</p>

            <label className="block">
              <span className="text-sm font-medium text-[var(--tx)]">Branch name <span className="text-rose-500">*</span></span>
              <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Main Kitchen" className={INPUT} />
              {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name}</p>}
            </label>

            <label className="block">
              <span className="text-sm font-medium text-[var(--tx)]">Address <span className="text-rose-500">*</span></span>
              <input value={form.address} onChange={(e) => set('address', e.target.value)} className={INPUT} />
              {errors.address && <p className="mt-1 text-xs text-rose-600">{errors.address}</p>}
            </label>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className="text-sm font-medium text-[var(--tx)]">City <span className="text-rose-500">*</span></span>
                <input value={form.city} onChange={(e) => set('city', e.target.value)} className={INPUT} />
                {errors.city && <p className="mt-1 text-xs text-rose-600">{errors.city}</p>}
              </label>
              <label className="block">
                <span className="text-sm font-medium text-[var(--tx)]">State <span className="text-rose-500">*</span></span>
                <input value={form.state} onChange={(e) => set('state', e.target.value)} className={INPUT} />
                {errors.state && <p className="mt-1 text-xs text-rose-600">{errors.state}</p>}
              </label>
              <label className="block">
                <span className="text-sm font-medium text-[var(--tx)]">ZIP / PIN <span className="text-rose-500">*</span></span>
                <input value={form.zipCode} onChange={(e) => set('zipCode', e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" maxLength={6} className={INPUT} />
                {errors.zipCode && <p className="mt-1 text-xs text-rose-600">{errors.zipCode}</p>}
              </label>
            </div>
          </div>

          {/* ── Operating hours ── */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--tx-3)]">Operating Hours</p>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-[var(--tx)]">Opening time <span className="text-rose-500">*</span></span>
                <input
                  type="time"
                  value={form.openingTime}
                  onChange={(e) => set('openingTime', e.target.value)}
                  className={INPUT}
                />
                {errors.openingTime && <p className="mt-1 text-xs text-rose-600">{errors.openingTime}</p>}
              </label>
              <label className="block">
                <span className="text-sm font-medium text-[var(--tx)]">Closing time <span className="text-rose-500">*</span></span>
                <input
                  type="time"
                  value={form.closingTime}
                  onChange={(e) => set('closingTime', e.target.value)}
                  className={INPUT}
                />
                {errors.closingTime && <p className="mt-1 text-xs text-rose-600">{errors.closingTime}</p>}
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-2xl bg-[var(--accent)] px-4 py-3 text-white font-medium transition hover:bg-[var(--accent-2)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Creating branch…' : 'Create branch'}
          </button>
        </form>
      </div>
    </AuthGuard>
  );
}
