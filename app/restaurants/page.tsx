'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '../../lib/api';
import { getUserRole } from '../../lib/auth';
import AuthGuard from '../components/AuthGuard';

type Restaurant = {
  id: string; name: string; ownerName: string; email: string; phone: string; status: string;
  cuisineTags?: string[];
  isMine?: boolean;
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-[#B88A2E]/10 text-[#B88A2E]',
  review: 'bg-blue-100 text-blue-700',
  rejected: 'bg-rose-100 text-rose-700',
};

function SkeletonCard() {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm animate-pulse">
      <div className="h-6 w-48 rounded-full bg-slate-200" />
      <div className="mt-3 h-4 w-72 rounded-full bg-slate-100" />
    </div>
  );
}

export default function RestaurantsPage() {
  const searchParams = useSearchParams();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cuisineFilter, setCuisineFilter] = useState('all');

  useEffect(() => {
    setUserRole(getUserRole());
    api.get('/restaurants')
      .then((r) => {
        // Sort so user's own restaurant appears first
        const sorted = [...r.data].sort((a, b) => {
          if (a.isMine === b.isMine) return 0;
          return a.isMine ? -1 : 1;
        });
        setRestaurants(sorted);
      })
      .catch(() => setError('Unable to load restaurant list.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const status = searchParams?.get('status') ?? 'all';
    setStatusFilter(status);
  }, [searchParams]);

  const cuisines = Array.from(new Set(restaurants.flatMap((r) => r.cuisineTags ?? []))).sort();
  const filteredRestaurants = restaurants.filter((restaurant) => {
    const lowerQuery = query.toLowerCase();
    const matchesQuery = restaurant.name.toLowerCase().includes(lowerQuery)
      || restaurant.ownerName.toLowerCase().includes(lowerQuery)
      || restaurant.email.toLowerCase().includes(lowerQuery);

    const matchesStatus = statusFilter === 'all'
      || (statusFilter === 'onboarding' && (restaurant.status === 'pending' || restaurant.status === 'review'))
      || restaurant.status === statusFilter;
    const matchesCuisine = cuisineFilter === 'all'
      || (restaurant.cuisineTags ?? []).includes(cuisineFilter);

    return matchesQuery && matchesStatus && matchesCuisine;
  });

  const canCreate = userRole === 'sales_operator' || userRole === 'super_admin';

  return (
    <AuthGuard requiredRoles={['super_admin', 'sales_operator', 'restaurant_owner', 'restaurant_admin', 'restaurant_manager']}>
      <div className="space-y-6">

          <div className="rounded-[2rem] bg-white p-8 shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-3xl font-semibold text-slate-900">Restaurants</h1>
                <p className="mt-2 text-slate-600">Manage all partner restaurants.</p>
              </div>
              {canCreate && (
                <Link href="/restaurants/register"
                  className="inline-flex items-center justify-center rounded-full bg-amber-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-amber-300/30 transition hover:bg-amber-700">
                  + Add restaurant
                </Link>
              )}
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-[1.8fr_1fr_1fr]">
              <label className="block w-full">
                <span className="sr-only">Search restaurants</span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search restaurants..."
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-700 outline-none transition focus:border-[#B88A2E] focus:bg-white"
                />
              </label>

              <label className="block w-full">
                <span className="sr-only">Filter by cuisine</span>
                <select
                  value={cuisineFilter}
                  onChange={(e) => setCuisineFilter(e.target.value)}
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-700 outline-none transition focus:border-[#B88A2E] focus:bg-white"
                >
                  <option value="all">All Cuisines</option>
                  {cuisines.map((cuisine) => (
                    <option key={cuisine} value={cuisine}>{cuisine}</option>
                  ))}
                </select>
              </label>

              <label className="block w-full">
                <span className="sr-only">Filter by status</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-700 outline-none transition focus:border-[#B88A2E] focus:bg-white"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="review">Review</option>
                  <option value="onboarding">In Onboarding</option>
                  <option value="rejected">Rejected</option>
                </select>
              </label>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {loading ? (
              Array.from({ length: 4 }, (_, index) => <SkeletonCard key={index} />)
            ) : filteredRestaurants.length === 0 ? (
              <div className="col-span-full rounded-[2rem] bg-white p-10 text-center shadow-sm">
                <p className="text-slate-500">No restaurants found with the selected filters.</p>
                {canCreate && (
                  <Link href="/restaurants/register"
                    className="mt-4 inline-flex items-center justify-center rounded-full bg-[#B88A2E] px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-amber-300/30 hover:bg-[#B88A2E] transition">
                    Register the first one
                  </Link>
                )}
              </div>
            ) : (
              filteredRestaurants.map((r) => (
                <div key={r.id}>
                        <Link href={`/restaurants/${r.id}`}
                      className="group block rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-amber-100 text-lg font-semibold text-amber-700">
                          {r.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex items-center gap-2">
                          {r.isMine && (
                            <span className="flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                              ★ My Restaurant
                            </span>
                          )}
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${STATUS_COLORS[r.status] ?? 'bg-slate-100 text-slate-600'}`}>
                            {r.status}
                          </span>
                        </div>
                      </div>
                      <div className="mt-6">
                        <h2 className="text-xl font-semibold text-slate-900">{r.name}</h2>
                        <p className="mt-2 text-sm text-slate-500">
                          {r.cuisineTags?.[0] ?? 'Partner restaurant'}
                        </p>
                        <p className="mt-3 text-sm text-slate-400">{r.ownerName}</p>
                      </div>
                      <div className="mt-6 flex flex-col gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                        <span className="inline-flex min-w-0 items-center gap-2 truncate">
                          <svg viewBox="0 0 20 20" className="h-4 w-4 flex-shrink-0 fill-[#B88A2E]" aria-hidden="true">
                            <path d="M10 1.5l2.98 6.04 6.67.97-4.82 4.7 1.14 6.63L10 15.77 4.03 13.9l1.14-6.63L.35 8.51l6.67-.97L10 1.5z" />
                          </svg>
                          <span className="truncate">{r.email}</span>
                        </span>
                        <span className="truncate">{r.phone}</span>
                      </div>
                    </Link>
                </div>
              ))
            )}
          </div>

      </div>
    </AuthGuard>
  );
}