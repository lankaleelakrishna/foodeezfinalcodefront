'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '../../../../lib/api';

const roles = [
  { label: 'Owner', value: 'restaurant_owner' },
  { label: 'Manager', value: 'restaurant_manager' },
  { label: 'Staff', value: 'restaurant_staff' },
  { label: 'Sales', value: 'sales_operator' },
];

type RestaurantUser = {
  id: string;
  displayName?: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
};

export default function RestaurantUsersPage() {
  const router = useRouter();
  const params = useParams();
  const [users, setUsers] = useState<RestaurantUser[]>([]);
  const [form, setForm] = useState({ displayName: '', email: '', role: 'restaurant_manager' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const fetchUsers = async () => {
    try {
      const response = await api.get(`/restaurants/${params.id}/users`);
      setUsers(response.data);
      setError('');
    } catch (err) {
      setError('Unable to load restaurant users.');
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [params.id]);

  const handleChange = (field: string, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await api.post(`/restaurants/${params.id}/users`, {
        displayName: form.displayName,
        email: form.email,
        role: form.role,
      });
      setForm({ displayName: '', email: '', role: 'restaurant_manager' });
      setMessage('User invited successfully. Credentials will be sent.');
      fetchUsers();
    } catch (err) {
      setError('Unable to invite user. Check the email and role.');
    }
  };

  return (
    <div className="space-y-6">
        <div className="rounded-3xl bg-white p-8 shadow-lg">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold">Restaurant team</h1>
              <p className="mt-2 text-slate-600">Add and manage partner users for restaurant {params.id}.</p>
            </div>
            <button onClick={() => router.back()} className="rounded-2xl border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50">
              Back
            </button>
          </div>
        </div>

        {(message || error) && (
          <div className={`rounded-3xl p-4 ${error ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
            {error || message}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Invite a team member</h2>
            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Name</span>
                <input
                  value={form.displayName}
                  onChange={(event) => handleChange('displayName', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus:border-slate-400 focus:outline-none"
                  placeholder="Full name"
                  required
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => handleChange('email', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus:border-slate-400 focus:outline-none"
                  placeholder="user@example.com"
                  required
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Role</span>
                <select
                  value={form.role}
                  onChange={(event) => handleChange('role', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus:border-slate-400 focus:outline-none"
                >
                  {roles.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <button type="submit" className="rounded-2xl bg-primary-gold px-5 py-3 text-white hover:bg-primary-gold-dark">
                Invite user
              </button>
            </form>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Existing users</h2>
            {users.length === 0 ? (
              <p className="mt-4 text-slate-500">No users have been invited yet.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold">{user.displayName || user.email}</p>
                        <p className="text-sm text-slate-500">{user.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-500 capitalize">{user.role.replace('_', ' ')}</p>
                        <p className="text-sm text-slate-500">{new Date(user.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
    </div>
  );
}
