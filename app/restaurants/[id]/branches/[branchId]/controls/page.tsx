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
      await api.patch(`/restaurants/${restaurantId}/branches/${branchId}`, {
        openingTime,
        closingTime,
      });
      setBranch({ ...branch, openingTime, closingTime });
      setMessage('Opening hours updated successfully.');
    } catch (err) {
      setError('Unable to update opening hours.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div>
          <div className="rounded-3xl bg-white p-8 shadow-lg">
            <h1 className="text-3xl font-semibold">Branch Controls</h1>
            <p className="mt-2 text-slate-600">Loading branch details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!branch) {
    return (
      <div>
        <div>
          <div className="rounded-3xl bg-white p-8 shadow-lg">
            <h1 className="text-3xl font-semibold">Branch Controls</h1>
            <p className="mt-2 text-slate-600">Branch not found.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <div className="rounded-3xl bg-white p-8 shadow-lg">
          <h1 className="text-3xl font-semibold">Branch Controls</h1>
          <p className="mt-2 text-slate-600">Manage {branch.name} store status and operating hours.</p>
        </div>

        {(error || message) && (
          <div className={`rounded-3xl p-4 ${error ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
            {error || message}
          </div>
        )}

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Store Status</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-medium">Currently {branch.isOnline ? 'Online' : 'Offline'}</p>
              <p className="text-slate-500">Toggle to open or close this branch for orders.</p>
            </div>
            <button
              onClick={handleToggleOnline}
              disabled={saving}
              className={`rounded-2xl px-6 py-3 text-white ${
                branch.isOnline
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {saving ? 'Updating...' : branch.isOnline ? 'Close Store' : 'Open Store'}
            </button>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Operating Hours</h2>
          <form onSubmit={handleUpdateHours} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Opening Time</span>
                <input
                  type="time"
                  name="openingTime"
                  defaultValue={branch.openingTime || ''}
                  className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  required
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Closing Time</span>
                <input
                  type="time"
                  name="closingTime"
                  defaultValue={branch.closingTime || ''}
                  className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  required
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-slate-900 px-5 py-3 text-white hover:bg-slate-700"
            >
              {saving ? 'Saving...' : 'Update Hours'}
            </button>
          </form>
        </div>
    </div>
  );
}