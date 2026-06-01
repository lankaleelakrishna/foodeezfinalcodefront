'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '../../../../lib/api';
import { getUserRole } from '../../../../lib/auth';
import AuthGuard from '../../../components/AuthGuard';

type Branch = {
  id: string; name: string; address: string; city: string;
  isOnline: boolean; busyMode: boolean; temporaryClosure: boolean;
};

function SkeletonCard() {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-5 w-40 rounded-full bg-slate-200" />
          <div className="h-4 w-56 rounded-full bg-slate-100" />
        </div>
        <div className="h-8 w-20 rounded-2xl bg-slate-200" />
      </div>
    </div>
  );
}

export default function BranchesPage() {
  const router = useRouter();
  const params = useParams();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingBranchId, setSavingBranchId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    setUserRole(getUserRole());
    api.get(`/restaurants/${params.id}/branches`)
      .then((r) => setBranches(r.data))
      .catch(() => setError('Unable to load branches.'))
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleToggleOnline = async (branchId: string, currentOnline: boolean) => {
    if (!canWrite) return;
    setError('');
    setSavingBranchId(branchId);

    try {
      const response = await api.patch(`/restaurants/${params.id}/branches/${branchId}`, {
        isOnline: !currentOnline,
      });
      const updatedBranch = response.data;

      setBranches((prev) => prev.map((branch) => (
        branch.id === branchId ? { ...branch, isOnline: updatedBranch?.isOnline ?? !currentOnline } : branch
      )));
    } catch {
      setError('Unable to update branch status.');
    } finally {
      setSavingBranchId(null);
    }
  };

  const canWrite = userRole === 'restaurant_admin' || userRole === 'restaurant_owner' ||
    userRole === 'restaurant_manager' || userRole === 'sales_operator' || userRole === 'super_admin';

  return (
    <AuthGuard requiredRoles={['super_admin', 'sales_operator', 'restaurant_owner', 'restaurant_admin', 'restaurant_manager']}>
      <div className="space-y-6">

          <div className="rounded-3xl bg-[var(--surface)] p-8 shadow-lg">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-semibold">Branches</h1>
                <p className="mt-2 text-slate-600">Manage outlets for this restaurant.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => router.back()}
                  className="rounded-2xl border border-[var(--border)] px-4 py-2 text-sm text-[var(--tx-2)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition">
                  Back
                </button>
                {canWrite && (
                  <button
                    onClick={() => router.push(`/restaurants/${params.id}/branches/new`)}
                    className="rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white hover:bg-[var(--accent-2)] transition">
                    Add branch
                  </button>
                )}
              </div>
            </div>
          </div>

          {error && <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

          <div className="grid gap-4">
            {loading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : branches.length === 0 ? (
              <div className="rounded-3xl bg-[var(--surface)] p-10 text-center shadow-sm">
                <p className="text-slate-500">No branches configured yet.</p>
                {canWrite && (
                  <button
                    onClick={() => router.push(`/restaurants/${params.id}/branches/new`)}
                    className="mt-4 rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white hover:bg-[var(--accent-2)] transition">
                    Add first branch
                  </button>
                )}
              </div>
            ) : (
              branches.map((branch) => (
                <div key={branch.id} className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold">{branch.name}</h2>
                      <p className="mt-1 text-sm text-slate-500">{branch.address}, {branch.city}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${branch.isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                          {branch.isOnline ? 'Online' : 'Offline'}
                        </span>
                        {branch.busyMode && (
                          <span className="rounded-full bg-[#B88A2E]/10 px-3 py-0.5 text-xs font-medium text-[#B88A2E]">Busy mode</span>
                        )}
                        {branch.temporaryClosure && (
                          <span className="rounded-full bg-rose-100 px-3 py-0.5 text-xs font-medium text-rose-700">Temporarily closed</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      {canWrite && (
                        <button
                          onClick={() => handleToggleOnline(branch.id, branch.isOnline)}
                          disabled={savingBranchId === branch.id}
                          className={`rounded-2xl px-4 py-2.5 text-sm font-medium transition ${branch.isOnline ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                        >
                          {savingBranchId === branch.id
                            ? 'Updating…'
                            : branch.isOnline ? 'Go offline' : 'Go online'}
                        </button>
                      )}
                      <button
                        onClick={() => router.push(`/restaurants/${params.id}/branches/${branch.id}/menu`)}
                        className="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
                        Manage menu
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

      </div>
    </AuthGuard>
  );
}
