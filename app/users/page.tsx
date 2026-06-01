'use client';

import { useEffect, useState } from 'react';
import AuthGuard from '../components/AuthGuard';
import { api } from '../../lib/api';

type User = {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  restaurant: { id: string; name: string } | null;
};

type Restaurant = { id: string; name: string };

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  sales_operator: 'Sales Operator',
  restaurant_admin: 'Restaurant Admin',
  restaurant_owner: 'Restaurant Owner',
  restaurant_manager: 'Restaurant Manager',
  restaurant_staff: 'Restaurant Staff',
};

const ALL_ROLES = [
  'super_admin',
  'sales_operator',
  'restaurant_admin',
  'restaurant_owner',
  'restaurant_manager',
  'restaurant_staff',
];

const SYSTEM_ROLES = new Set(['super_admin', 'sales_operator']);

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-violet-100 text-violet-700',
  sales_operator: 'bg-blue-100 text-blue-700',
  restaurant_admin: 'bg-[#B88A2E]/10 text-[#B88A2E]',
  restaurant_owner: 'bg-[#B88A2E]/10 text-[#B88A2E]',
  restaurant_manager: 'bg-sky-100 text-sky-700',
  restaurant_staff: 'bg-slate-100 text-slate-600',
};

const INPUT =
  'w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ displayName: '', email: '', role: 'sales_operator', restaurantId: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [createdUser, setCreatedUser] = useState<{ email: string; temporaryPassword: string } | null>(null);

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);

  useEffect(() => {
    loadUsers();
    api
      .get('/restaurants')
      .then((r) => setRestaurants(r.data.map((res: any) => ({ id: res.id, name: res.name }))))
      .catch(() => {});
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const { data } = await api.get('/auth/users');
      setUsers(data);
    } catch {
      setError('Unable to load users.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      const payload: Record<string, string> = {
        displayName: form.displayName,
        email: form.email,
        role: form.role,
      };
      if (form.restaurantId) payload.restaurantId = form.restaurantId;

      const { data } = await api.post('/auth/users', payload);
      setCreatedUser({ email: data.email, temporaryPassword: data.temporaryPassword });
      setForm({ displayName: '', email: '', role: 'sales_operator', restaurantId: '' });
      loadUsers();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to create user.');
    } finally {
      setSubmitting(false);
    }
  }

  const isSystemRole = SYSTEM_ROLES.has(form.role);

  return (
    <AuthGuard requiredRoles={['super_admin']}>
      <div className="space-y-6">

          {/* Header */}
          <div className="rounded-3xl bg-white p-8 shadow-lg">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-semibold">User Management</h1>
                <p className="mt-2 text-slate-500">Create and manage all system users.</p>
              </div>
              <button
                onClick={() => {
                  setShowForm(!showForm);
                  setCreatedUser(null);
                  setFormError('');
                }}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-700 transition"
              >
                {showForm ? 'Cancel' : 'Create User'}
              </button>
            </div>
          </div>

          {/* Create User Form */}
          {showForm && (
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold">New User</h2>

              {createdUser && (
                <div className="mb-4 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-800">
                  <p className="font-medium">User created successfully!</p>
                  <p className="mt-1 text-sm">Email: <span className="font-mono">{createdUser.email}</span></p>
                  <p className="text-sm">
                    Temporary password:{' '}
                    <span className="font-mono font-semibold">{createdUser.temporaryPassword}</span>
                  </p>
                  <p className="mt-1 text-xs text-emerald-600">
                    Share these credentials securely. The user must change their password on first login.
                  </p>
                </div>
              )}

              {formError && (
                <div className="mb-4 rounded-2xl bg-rose-50 p-4 text-rose-700">{formError}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Display Name</label>
                    <input
                      required
                      value={form.displayName}
                      onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                      className={INPUT}
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      className={INPUT}
                      placeholder="user@example.com"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Role</label>
                    <select
                      value={form.role}
                      onChange={(e) => setForm((f) => ({ ...f, role: e.target.value, restaurantId: '' }))}
                      className={INPUT}
                    >
                      {ALL_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  </div>
                  {!isSystemRole && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Restaurant</label>
                      <select
                        value={form.restaurantId}
                        onChange={(e) => setForm((f) => ({ ...f, restaurantId: e.target.value }))}
                        className={INPUT}
                      >
                        <option value="">— Select restaurant —</option>
                        {restaurants.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-2xl bg-slate-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-slate-700 transition disabled:opacity-50"
                >
                  {submitting ? 'Creating…' : 'Create User'}
                </button>
              </form>
            </div>
          )}

          {/* Users List */}
          {error && <div className="rounded-2xl bg-rose-50 p-4 text-rose-700">{error}</div>}

          {loading ? (
            <div className="rounded-2xl bg-white p-8 text-slate-500 shadow-sm">Loading…</div>
          ) : (
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold">
                All Users{' '}
                <span className="text-sm font-normal text-slate-400">({users.length})</span>
              </h2>

              {users.length === 0 ? (
                <p className="text-slate-500">No users found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                        <th className="pb-3 pr-6">Name / Email</th>
                        <th className="pb-3 pr-6">Role</th>
                        <th className="pb-3 pr-6">Restaurant</th>
                        <th className="pb-3 pr-6">Status</th>
                        <th className="pb-3">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {users.map((u) => (
                        <tr key={u.id}>
                          <td className="py-3 pr-6">
                            <p className="font-medium text-slate-900">{u.displayName || '—'}</p>
                            <p className="text-slate-400">{u.email}</p>
                          </td>
                          <td className="py-3 pr-6">
                            <span
                              className={`rounded-full px-3 py-0.5 text-xs font-medium ${ROLE_COLORS[u.role] ?? 'bg-slate-100 text-slate-600'}`}
                            >
                              {ROLE_LABELS[u.role] ?? u.role}
                            </span>
                          </td>
                          <td className="py-3 pr-6 text-slate-500">{u.restaurant?.name ?? '—'}</td>
                          <td className="py-3 pr-6">
                            <span
                              className={`rounded-full px-3 py-0.5 text-xs font-medium ${u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}
                            >
                              {u.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-3 text-slate-400">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

      </div>
    </AuthGuard>
  );
}