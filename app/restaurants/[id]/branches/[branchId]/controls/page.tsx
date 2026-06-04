'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../../../../lib/api';

type Branch = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  openingTime: string | null;
  closingTime: string | null;
  isOnline: boolean;
  latitude: number | null;
  longitude: number | null;
};

import { useParams } from 'next/navigation';

export default function BranchControlsPage() {
  const params = useParams();
  const restaurantId = params.id as string;
  const branchId = params.branchId as string;
  const [branch, setBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchBranch = async () => {
      try {
        const response = await api.get(`/restaurants/${restaurantId}/branches/${branchId}`);
        setBranch(response.data);
      } catch (err) {
        setError('Unable to load branch details.');
      } finally {
        setLoading(false);
      }
    };
    fetchBranch();
  }, [restaurantId, branchId]);

  const handleToggleOnline = async () => {
    if (!branch) return;
    setSaving(true);
    try {
      await api.patch(`/restaurants/${restaurantId}/branches/${branchId}`, {
        isOnline: !branch.isOnline,
      });
      setBranch({ ...branch, isOnline: !branch.isOnline });
      setMessage(`Branch ${!branch.isOnline ? 'opened' : 'closed'} successfully.`);
    } catch (err) {
      setError('Unable to update branch status.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateHours = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!branch) return;
    const formData = new FormData(event.currentTarget);
    const openingTime = formData.get('openingTime') as string;
    const closingTime = formData.get('closingTime') as string;
    setSaving(true);
    try {
      await api.patch(`/restaurants/${restaurantId}/branches/${branchId}`, { openingTime, closingTime });
      setBranch({ ...branch, openingTime, closingTime });
      setMessage('Opening hours updated successfully.');
    } catch {
      setError('Unable to update opening hours.');
    } finally { setSaving(false); }
  };

  const handleUpdateLocation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!branch) return;
    const formData = new FormData(event.currentTarget);
    const latitude  = parseFloat(formData.get('latitude')  as string);
    const longitude = parseFloat(formData.get('longitude') as string);
    if (isNaN(latitude) || isNaN(longitude)) { setError('Enter valid numeric coordinates.'); return; }
    setSaving(true);
    try {
      await api.patch(`/restaurants/${restaurantId}/branches/${branchId}`, { latitude, longitude });
      setBranch({ ...branch, latitude, longitude });
      setMessage('Location saved. Your branch will now appear in customer discovery.');
    } catch {
      setError('Unable to update location.');
    } finally { setSaving(false); }
  };

  const hasValidCoords = branch !== null &&
    typeof branch.latitude  === 'number' && branch.latitude  !== 0 &&
    typeof branch.longitude === 'number' && branch.longitude !== 0;

  if (loading) return (
    <div className="rounded-3xl bg-[var(--surface)] p-8 shadow-lg">
      <p className="text-[var(--tx-3)]">Loading branch details…</p>
    </div>
  );

  if (!branch) return (
    <div className="rounded-3xl bg-[var(--surface)] p-8 shadow-lg">
      <p className="text-[var(--tx-3)]">Branch not found.</p>
    </div>
  );

  return (
    <div className="space-y-6 p-4 sm:p-6">

      {/* Header */}
      <div className="rounded-3xl bg-[var(--surface)] p-8 shadow-lg border border-[var(--border)]">
        <h1 className="text-3xl font-semibold text-[var(--tx)]">Branch Controls</h1>
        <p className="mt-2 text-[var(--tx-3)]">Manage {branch.name} — status, hours, and location.</p>
      </div>

      {(error || message) && (
        <div className={`rounded-3xl px-5 py-4 text-sm font-medium ${error ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
          {error || message}
        </div>
      )}

      {/* ── Location warning banner ── */}
      {!hasValidCoords && (
        <div className="rounded-3xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          <p className="font-semibold">⚠️ Location not set — branch won't appear in customer search</p>
          <p className="mt-1 text-amber-700">
            Set your latitude and longitude below. Open{' '}
            <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer"
              className="underline font-semibold">Google Maps</a>,
            right-click your restaurant location and copy the coordinates.
          </p>
        </div>
      )}

      {/* ── Store Status ── */}
      <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[var(--tx)] mb-4">Store Status</h2>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-base font-medium text-[var(--tx)] flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${branch.isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              Currently {branch.isOnline ? 'Online' : 'Offline'}
            </p>
            <p className="mt-1 text-sm text-[var(--tx-3)]">Toggle to open or close this branch for orders.</p>
          </div>
          <button
            onClick={handleToggleOnline}
            disabled={saving}
            className={`rounded-2xl px-6 py-3 text-sm font-semibold text-white transition disabled:opacity-60 ${
              branch.isOnline ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {saving ? 'Updating…' : branch.isOnline ? 'Close Store' : 'Open Store'}
          </button>
        </div>
      </div>

      {/* ── Operating Hours ── */}
      <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[var(--tx)] mb-4">Operating Hours</h2>
        <form onSubmit={handleUpdateHours} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-[var(--tx-2)]">Opening Time</span>
              <input type="time" name="openingTime" defaultValue={branch.openingTime || ''}
                className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--tx)] outline-none focus:border-[var(--accent)]"
                required />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-[var(--tx-2)]">Closing Time</span>
              <input type="time" name="closingTime" defaultValue={branch.closingTime || ''}
                className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--tx)] outline-none focus:border-[var(--accent)]"
                required />
            </label>
          </div>
          <button type="submit" disabled={saving}
            className="rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white hover:brightness-105 disabled:opacity-60">
            {saving ? 'Saving…' : 'Update Hours'}
          </button>
        </form>
      </div>

      {/* ── Location (Latitude / Longitude) ── */}
      <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[var(--tx)] mb-1">Branch Location</h2>
        <p className="mb-5 text-sm text-[var(--tx-3)]">
          Required for the restaurant to appear in the customer discovery map.{' '}
          <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer"
            className="font-semibold text-[var(--accent)] underline">
            Find coordinates on Google Maps
          </a>{' '}
          (right-click your location → copy lat/lng).
        </p>
        <form onSubmit={handleUpdateLocation} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-[var(--tx-2)]">Latitude</span>
              <input
                type="number" name="latitude" step="any"
                defaultValue={branch.latitude && branch.latitude !== 0 ? branch.latitude : ''}
                placeholder="e.g. 17.3850"
                className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--tx)] outline-none focus:border-[var(--accent)] placeholder:text-[var(--tx-3)]"
                required
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-[var(--tx-2)]">Longitude</span>
              <input
                type="number" name="longitude" step="any"
                defaultValue={branch.longitude && branch.longitude !== 0 ? branch.longitude : ''}
                placeholder="e.g. 78.4867"
                className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--tx)] outline-none focus:border-[var(--accent)] placeholder:text-[var(--tx-3)]"
                required
              />
            </label>
          </div>
          {hasValidCoords && (
            <p className="text-xs text-emerald-600 font-medium">
              ✓ Location set: {branch.latitude?.toFixed(4)}, {branch.longitude?.toFixed(4)}
            </p>
          )}
          <button type="submit" disabled={saving}
            className="rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white hover:brightness-105 disabled:opacity-60">
            {saving ? 'Saving…' : 'Save Location'}
          </button>
        </form>
      </div>

    </div>
  );
}