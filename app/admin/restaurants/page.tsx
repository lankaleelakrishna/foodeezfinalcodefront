'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import AuthGuard from '../../components/AuthGuard';
import { restaurantsApi, api } from '../../../lib/api';

type MenuItem = { name: string; description?: string; price: string | number; currency: string };
type MenuCategory = { name: string; displayName: string; items: MenuItem[] };

type Restaurant = {
  id: string; name: string; ownerName: string; email: string; phone: string;
  address: string; city: string; state: string; zipCode: string;
  status: string; leadStatus: string; onboardingStep: number;
  leadSource?: string; brandDescription?: string; cuisineTags?: string[];
  serviceRadiusKm?: number; gstNumber?: string; gstExpiryDate?: string;
  fssaiNumber?: string; fssaiExpiryDate?: string; gstPresent?: boolean;
  bankName?: string; bankAccountNumber?: string; ifscCode?: string;
  temporaryClosure?: boolean; holidayMode?: boolean; riskScore: number;
  createdAt: string;
  extractedMenu?: any;
  menuExtracted?: MenuCategory[] | string;
  menuExtractedJson?: string;
};

type Document = { id: string; type: string; filename: string; status: string; uploadedAt: string };

type ChangeRequest = {
  id: string;
  item: { id: string; name: string; price: number; currency: string };
  restaurantId: string;
  requestedBy?: string;
  status: string;
  changeDescription: string;
  payload: Record<string, any>;
  reviewComment?: string;
  createdAt: string;
};

const STATUS_COLORS: Record<string, string> = {
  active:   'bg-emerald-100 text-emerald-700',
  pending:  'bg-amber-100 text-amber-700',
  review:   'bg-blue-100 text-blue-700',
  rejected: 'bg-rose-100 text-rose-700',
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function parseMenu(restaurant: Restaurant): MenuCategory[] | null {
  const raw = restaurant.extractedMenu ?? restaurant.menuExtracted ?? restaurant.menuExtractedJson;
  if (!raw) return null;
  if (typeof raw === 'string') {
    try { const p = JSON.parse(raw); return Array.isArray(p) ? p : (p?.categories ?? null); }
    catch { return null; }
  }
  if (Array.isArray(raw)) return raw as MenuCategory[];
  if (raw?.categories) return raw.categories as MenuCategory[];
  return null;
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function AdminRestaurantsPage() {
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get('status') || 'review';

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [action, setAction] = useState<'forward' | 'reject' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [forwardStatus, setForwardStatus] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'menu' | 'changes'>('details');
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [crLoading, setCrLoading] = useState(false);
  const [crAction, setCrAction] = useState<{ id: string; type: 'approve' | 'reject' } | null>(null);
  const [crComment, setCrComment] = useState('');
  const [crActionLoading, setCrActionLoading] = useState(false);

  const fetchRestaurants = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/restaurants', { params: { status: statusFilter || 'review' } });
      const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
      setRestaurants(data.filter((r: Restaurant) => r.status === (statusFilter || 'review')));
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to load restaurants.';
      setError(Array.isArray(msg) ? msg.join(' ') : msg);
    } finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { fetchRestaurants(); }, [fetchRestaurants]);

  const fetchChangeRequests = useCallback(async () => {
    setCrLoading(true);
    try {
      const res = await api.get('/menu-item-change-requests');
      const data = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setChangeRequests(data);
    } catch { setChangeRequests([]); }
    finally { setCrLoading(false); }
  }, []);

  useEffect(() => { fetchChangeRequests(); }, [fetchChangeRequests]);

  const fetchDocuments = useCallback(async (restaurantId: string) => {
    setDocsLoading(true);
    try {
      const response = await api.get(`/restaurants/${restaurantId}/documents`);
      const data = Array.isArray(response.data) ? response.data : response.data?.documents ?? response.data?.data ?? [];
      setDocuments(data);
    } catch { setDocuments([]); }
    finally { setDocsLoading(false); }
  }, []);

  const fetchRestaurantDetails = useCallback(async (restaurantId: string) => {
    setDetailsLoading(true);
    setError('');
    try {
      const response = await restaurantsApi.get(restaurantId);
      setSelectedRestaurant(response.data);
      await fetchDocuments(restaurantId);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to load restaurant details.';
      setError(Array.isArray(msg) ? msg.join(' ') : msg);
    } finally { setDetailsLoading(false); }
  }, [fetchDocuments]);

  const handleSelectRestaurant = (restaurant: Restaurant) => {
    setSelectedRestaurant(null);
    setActiveTab('details');
    fetchRestaurantDetails(restaurant.id);
  };

  const handleAction = async (restaurantId: string, newStatus: 'active' | 'rejected') => {
    setActionLoading(true);
    try {
      await api.patch(`/restaurants/${restaurantId}`, {
        status: newStatus,
        leadStatus: newStatus === 'active' ? 'ACTIVATED' : 'REJECTED',
      });
      setAction(null);
      setSelectedRestaurant(null);
      await fetchRestaurants();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to update restaurant status.';
      alert(Array.isArray(msg) ? msg.join(' ') : msg);
    } finally { setActionLoading(false); }
  };

  const handleForward = async (restaurantId: string) => {
    if (!selectedRestaurant) return;
    setActionLoading(true);
    const parsedMenu = parseMenu(selectedRestaurant);
    try {
      // 1. Use the proper approval endpoint
      setForwardStatus('Approving registration…');
      await api.post(`/restaurants/${restaurantId}/approve-registration`);

      // 2. Find or create a default branch
      setForwardStatus('Setting up branch…');
      let branchId: string | null = null;
      try {
        const brRes = await api.get(`/restaurants/${restaurantId}/branches`);
        const branches: { id: string }[] = Array.isArray(brRes.data) ? brRes.data : (brRes.data?.data ?? []);
        if (branches.length > 0) branchId = branches[0].id;
      } catch {}

      if (!branchId) {
        const brRes = await api.post(`/restaurants/${restaurantId}/branches`, {
          name: `${selectedRestaurant.name} – Main`,
          address: selectedRestaurant.address,
          city: selectedRestaurant.city,
          state: selectedRestaurant.state,
          zipCode: selectedRestaurant.zipCode,
          isOnline: false,
          openingTime: '09:00',
          closingTime: '22:00',
          latitude:  0,
          longitude: 0,
        });
        branchId = brRes.data.id as string;
      }

      // 3. Bulk-import extracted menu
      if (branchId && parsedMenu && parsedMenu.length > 0) {
        setForwardStatus('Importing menu to branch…');
        try {
          await api.post(`/branches/${branchId}/menu-bulk-upload`, {
            categories: parsedMenu.map((cat) => ({
              ...cat,
              items: cat.items.map((item) => ({
                ...item,
                price: parseFloat(parseFloat(String(item.price)).toFixed(2)),
              })),
            })),
          });
        } catch (menuErr) {
          console.warn('Menu bulk-upload failed (non-fatal):', menuErr);
        }
      }

      // 4. Finalize menu approval
      if (parsedMenu && parsedMenu.length > 0) {
        try { await api.post(`/restaurants/${restaurantId}/approve-finalize-menu`); } catch {}
      }

      setAction(null);
      setForwardStatus('');
      setSelectedRestaurant(null);
      await fetchRestaurants();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to forward restaurant.';
      alert(Array.isArray(msg) ? msg.join(' ') : msg);
      setForwardStatus('');
    } finally { setActionLoading(false); }
  };

  const handleCrAction = async () => {
    if (!crAction) return;
    setCrActionLoading(true);
    try {
      const endpoint = `/menu-item-change-requests/${crAction.id}/${crAction.type}`;
      await api.post(endpoint, crComment ? { reviewComment: crComment } : {});
      setCrAction(null);
      setCrComment('');
      await fetchChangeRequests();
    } catch (err: any) {
      const msg = err?.response?.data?.message || `Failed to ${crAction.type} request.`;
      alert(Array.isArray(msg) ? msg.join(' ') : msg);
    } finally { setCrActionLoading(false); }
  };

  const pendingCr = changeRequests.filter((r) => r.status === 'pending');

  return (
    <AuthGuard requiredRoles={['super_admin']}>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="rounded-3xl bg-[var(--surface)] p-8 shadow-lg">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-[var(--tx)]">Restaurant Reviews</h1>
              <p className="mt-2 text-[var(--tx-3)]">Manage restaurants pending review and validation.</p>
            </div>
            <div className="flex gap-2">
              <Link href="/admin/menu-change-requests"
                className="relative rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--tx-2)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition">
                Menu Change Requests
                {pendingCr.length > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-white">
                    {pendingCr.length}
                  </span>
                )}
              </Link>
              <Link href="/dashboard"
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--tx-2)] hover:bg-[var(--surface-2)] transition">
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>

        {error && <div className="rounded-3xl bg-[var(--danger-bg)] border border-[var(--danger-border)] p-4 text-[var(--danger-text)]">{error}</div>}

        {loading ? (
          <div className="rounded-3xl bg-[var(--surface)] p-8 text-center text-[var(--tx-3)]">Loading restaurants...</div>
        ) : restaurants.length === 0 ? (
          <div className="rounded-3xl bg-[var(--surface)] p-8 text-center text-[var(--tx-3)]">No restaurants in {statusFilter || 'review'} status.</div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3 items-start">
            {/* List */}
            <div className="rounded-3xl bg-[var(--surface)] shadow-sm lg:col-span-1">
              <div className="border-b border-[var(--border)] px-6 py-4">
                <h2 className="text-lg font-semibold text-[var(--tx)]">Restaurants ({restaurants.length})</h2>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {restaurants.map((restaurant) => (
                  <button key={restaurant.id} onClick={() => handleSelectRestaurant(restaurant)}
                    className={`w-full text-left px-6 py-4 transition ${
                      selectedRestaurant?.id === restaurant.id
                        ? 'bg-[var(--info-bg)] border-l-4 border-[var(--accent)]'
                        : 'hover:bg-[var(--surface-2)]'
                    }`}>
                    <p className="font-semibold text-[var(--tx)]">{restaurant.name}</p>
                    <p className="mt-1 text-sm text-[var(--tx-3)]">{restaurant.ownerName}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[restaurant.status] || 'bg-[var(--surface-2)]'}`}>
                        {restaurant.status}
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full bg-[var(--surface-2)] text-[var(--tx-3)]">
                        Step {restaurant.onboardingStep}/5
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Detail panel */}
            {detailsLoading ? (
              <div className="rounded-3xl bg-[var(--surface)] shadow-sm lg:col-span-2 p-8 text-center text-[var(--tx-3)]">
                Loading details…
              </div>
            ) : selectedRestaurant && (
              <div className="rounded-3xl bg-[var(--surface)] shadow-sm lg:col-span-2 space-y-0">
                {/* Tabs */}
                <div className="border-b border-[var(--border)] flex">
                  {(['details', 'menu', 'changes'] as const).map((tab) => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                      className={`px-5 py-3.5 text-sm font-medium transition border-b-2 ${
                        activeTab === tab
                          ? 'border-[var(--accent)] text-[var(--accent)]'
                          : 'border-transparent text-[var(--tx-3)] hover:text-[var(--tx)]'
                      }`}>
                      {tab === 'details' ? 'Details' : tab === 'menu' ? 'Extracted Menu' : 'Change Requests'}
                    </button>
                  ))}
                </div>

                <div className="p-6 space-y-6">
                  {/* ── DETAILS TAB ── */}
                  {activeTab === 'details' && (
                    <>
                      <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] pb-4">
                        <div>
                          <h2 className="text-2xl font-semibold text-[var(--tx)]">{selectedRestaurant.name}</h2>
                          <p className="mt-1 text-[var(--tx-3)]">{selectedRestaurant.email}</p>
                        </div>
                        <span className={`text-xs px-3 py-1 rounded-full font-semibold shrink-0 ${STATUS_COLORS[selectedRestaurant.status] || ''}`}>
                          {selectedRestaurant.status.toUpperCase()}
                        </span>
                      </div>

                      {/* Contact */}
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--tx-3)] mb-3">Contact</h3>
                        <div className="grid grid-cols-2 gap-3">
                          {[['Owner', selectedRestaurant.ownerName], ['Phone', selectedRestaurant.phone]].map(([k, v]) => (
                            <div key={k} className="rounded-2xl bg-[var(--surface-2)] p-3">
                              <p className="text-xs text-[var(--tx-3)]">{k}</p>
                              <p className="font-medium text-[var(--tx)]">{v}</p>
                            </div>
                          ))}
                          <div className="col-span-2 rounded-2xl bg-[var(--surface-2)] p-3">
                            <p className="text-xs text-[var(--tx-3)]">Address</p>
                            <p className="font-medium text-[var(--tx)]">
                              {selectedRestaurant.address}, {selectedRestaurant.city}, {selectedRestaurant.state} – {selectedRestaurant.zipCode}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Registration */}
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--tx-3)] mb-3">Registration</h3>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            ['Date', new Date(selectedRestaurant.createdAt).toLocaleDateString()],
                            ['Lead status', selectedRestaurant.leadStatus || '—'],
                            ['GST', selectedRestaurant.gstNumber || '—'],
                            ['FSSAI', selectedRestaurant.fssaiNumber || '—'],
                            ['GST expiry', selectedRestaurant.gstExpiryDate || '—'],
                            ['FSSAI expiry', selectedRestaurant.fssaiExpiryDate || '—'],
                            ['Risk score', `${((selectedRestaurant.riskScore || 0) * 100).toFixed(0)}%`],
                          ].map(([k, v]) => (
                            <div key={k} className="rounded-2xl bg-[var(--surface-2)] p-3">
                              <p className="text-xs text-[var(--tx-3)]">{k}</p>
                              <p className="font-medium text-[var(--tx)] font-mono text-sm">{v}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Bank */}
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--tx-3)] mb-3">Banking</h3>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            ['Bank', selectedRestaurant.bankName || '—'],
                            ['IFSC', selectedRestaurant.ifscCode || '—'],
                          ].map(([k, v]) => (
                            <div key={k} className="rounded-2xl bg-[var(--surface-2)] p-3">
                              <p className="text-xs text-[var(--tx-3)]">{k}</p>
                              <p className="font-medium text-[var(--tx)] font-mono text-sm">{v}</p>
                            </div>
                          ))}
                          <div className="col-span-2 rounded-2xl bg-[var(--surface-2)] p-3">
                            <p className="text-xs text-[var(--tx-3)]">Account Number</p>
                            <p className="font-medium text-[var(--tx)] font-mono text-sm">{selectedRestaurant.bankAccountNumber || '—'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Documents */}
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--tx-3)] mb-3">Uploaded Documents</h3>
                        {docsLoading ? (
                          <p className="text-sm text-[var(--tx-3)]">Loading documents...</p>
                        ) : documents.length === 0 ? (
                          <p className="text-sm text-[var(--tx-3)]">No documents uploaded.</p>
                        ) : (
                          <div className="space-y-2">
                            {documents.map((doc) => (
                              <div key={doc.id} className="flex items-center justify-between rounded-2xl bg-[var(--surface-2)] p-3">
                                <div>
                                  <p className="font-medium text-sm text-[var(--tx)]">{doc.type}</p>
                                  <p className="text-xs text-[var(--tx-3)]">{doc.filename}</p>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                  doc.status === 'verified' ? 'bg-emerald-100 text-emerald-700' :
                                  doc.status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                                  'bg-amber-100 text-amber-700'
                                }`}>{doc.status}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* ── MENU TAB ── */}
                  {activeTab === 'menu' && (() => {
                    const menu = parseMenu(selectedRestaurant);
                    return menu && menu.length > 0 ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-[var(--tx-3)]">
                            {menu.reduce((n, c) => n + c.items.length, 0)} items across {menu.length} {menu.length === 1 ? 'category' : 'categories'}
                          </p>
                          <span className="rounded-full bg-[var(--success-bg)] px-3 py-1 text-xs font-medium text-[var(--success-text)]">
                            Submitted by sales operator
                          </span>
                        </div>
                        {menu.map((category, ci) => (
                          <div key={ci} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                            <p className="text-sm font-semibold text-[var(--tx)]">{category.displayName || category.name}</p>
                            {category.items.length === 0 ? (
                              <p className="mt-2 text-sm text-[var(--tx-3)]">No items detected.</p>
                            ) : (
                              <div className="mt-3 space-y-2">
                                {category.items.map((item, ii) => (
                                  <div key={ii} className="rounded-xl bg-[var(--surface)] p-3 grid gap-1 sm:grid-cols-[1fr_auto]">
                                    <div>
                                      <p className="font-medium text-[var(--tx)] text-sm">{item.name}</p>
                                      {item.description && <p className="text-xs text-[var(--tx-3)]">{item.description}</p>}
                                    </div>
                                    <p className="text-sm font-semibold text-[var(--tx)] shrink-0">
                                      {item.price} {item.currency}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl bg-[var(--surface-2)] p-6 text-center">
                        <p className="text-[var(--tx-3)]">No extracted menu was submitted with this registration.</p>
                      </div>
                    );
                  })()}

                  {/* ── CHANGE REQUESTS TAB ── */}
                  {activeTab === 'changes' && (
                    crLoading ? (
                      <p className="text-sm text-[var(--tx-3)]">Loading change requests…</p>
                    ) : (
                      <div className="space-y-3">
                        {changeRequests.filter(cr =>
                          cr.restaurantId === selectedRestaurant.id || !selectedRestaurant.id
                        ).length === 0 ? (
                          <div className="rounded-2xl bg-[var(--surface-2)] p-6 text-center">
                            <p className="text-[var(--tx-3)]">No pending change requests for this restaurant.</p>
                          </div>
                        ) : changeRequests
                          .filter(cr => cr.restaurantId === selectedRestaurant.id)
                          .map((cr) => (
                          <div key={cr.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <p className="font-medium text-[var(--tx)]">{cr.item?.name || 'Unknown item'}</p>
                                <p className="mt-0.5 text-sm text-[var(--tx-3)]">{cr.changeDescription}</p>
                                {Object.keys(cr.payload).length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {cr.payload.price !== undefined && (
                                      <span className="rounded-lg bg-[var(--surface)] border border-[var(--border)] px-2 py-1 text-xs text-[var(--tx-2)]">
                                        Price: <strong>{cr.item?.price}</strong> → <strong>{cr.payload.price}</strong> {cr.item?.currency}
                                      </span>
                                    )}
                                    {cr.payload.name !== undefined && (
                                      <span className="rounded-lg bg-[var(--surface)] border border-[var(--border)] px-2 py-1 text-xs text-[var(--tx-2)]">
                                        Name: <strong>{cr.item?.name}</strong> → <strong>{cr.payload.name}</strong>
                                      </span>
                                    )}
                                  </div>
                                )}
                                <p className="mt-1 text-xs text-[var(--tx-3)]">{new Date(cr.createdAt).toLocaleString()}</p>
                              </div>
                              <span className={`shrink-0 text-xs px-2 py-1 rounded-full font-medium ${
                                cr.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                cr.status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                                'bg-amber-100 text-amber-700'
                              }`}>{cr.status}</span>
                            </div>
                            {cr.status === 'pending' && (
                              <div className="mt-3 flex gap-2">
                                <button onClick={() => setCrAction({ id: cr.id, type: 'approve' })}
                                  className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700">
                                  Approve
                                </button>
                                <button onClick={() => setCrAction({ id: cr.id, type: 'reject' })}
                                  className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100">
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )
                  )}

                  {/* Action Buttons */}
                  <div className="border-t border-[var(--border)] pt-4 space-y-2">
                    <button onClick={() => setAction('forward')} disabled={actionLoading}
                      className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2">
                      <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 10h14M11 4l6 6-6 6" />
                      </svg>
                      Forward to Restaurant Admin
                    </button>
                    <button onClick={() => setAction('reject')} disabled={actionLoading}
                      className="w-full rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 font-semibold hover:bg-rose-100 disabled:opacity-60">
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Forward / Reject confirmation dialog */}
        {action && selectedRestaurant && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="rounded-3xl bg-[var(--surface)] p-6 max-w-md w-full shadow-2xl">
              {action === 'forward' ? (
                <>
                  <h3 className="text-lg font-semibold text-[var(--tx)]">Forward to Restaurant Admin?</h3>
                  <p className="mt-2 text-[var(--tx-3)] text-sm">
                    This will activate <strong className="text-[var(--tx)]">{selectedRestaurant.name}</strong>, create a default branch, and import the extracted menu so the restaurant admin can start managing it immediately.
                  </p>
                  {(() => {
                    const menu = parseMenu(selectedRestaurant);
                    return menu && menu.length > 0 ? (
                      <div className="mt-3 rounded-2xl bg-[var(--success-bg)] border border-[var(--success-border)] p-3 text-sm text-[var(--success-text)]">
                        {menu.reduce((n, c) => n + c.items.length, 0)} menu items across {menu.length} {menu.length === 1 ? 'category' : 'categories'} will be imported.
                      </div>
                    ) : (
                      <div className="mt-3 rounded-2xl bg-[var(--warning-bg)] border border-[var(--warning-border)] p-3 text-sm text-[var(--warning-text)]">
                        No extracted menu found — only the restaurant will be activated.
                      </div>
                    );
                  })()}
                  {forwardStatus && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-[var(--tx-3)]">
                      <svg className="h-4 w-4 animate-spin text-emerald-600" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={3} strokeDasharray="31.4 31.4" strokeLinecap="round" />
                      </svg>
                      {forwardStatus}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold text-[var(--tx)]">Reject Restaurant?</h3>
                  <p className="mt-2 text-sm text-[var(--tx-3)]">
                    This will reject <strong className="text-[var(--tx)]">{selectedRestaurant.name}</strong> and the registration will be marked as rejected.
                  </p>
                </>
              )}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => { if (action === 'forward') handleForward(selectedRestaurant.id); else handleAction(selectedRestaurant.id, 'rejected'); }}
                  disabled={actionLoading}
                  className={`flex-1 rounded-2xl px-4 py-2 text-white font-semibold disabled:opacity-60 ${
                    action === 'forward' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}>
                  {actionLoading
                    ? (action === 'forward' ? 'Forwarding…' : 'Rejecting…')
                    : (action === 'forward' ? 'Confirm & Forward' : 'Confirm Rejection')}
                </button>
                <button onClick={() => { setAction(null); setForwardStatus(''); }} disabled={actionLoading}
                  className="flex-1 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-[var(--tx-2)] hover:bg-[var(--surface-2)] disabled:opacity-60">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Change request review dialog */}
        {crAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="rounded-3xl bg-[var(--surface)] p-6 max-w-sm w-full shadow-2xl">
              <h3 className="text-lg font-semibold text-[var(--tx)] capitalize">{crAction.type} Change Request?</h3>
              <p className="mt-2 text-sm text-[var(--tx-3)]">Add an optional comment for the restaurant:</p>
              <textarea
                value={crComment}
                onChange={(e) => setCrComment(e.target.value)}
                placeholder="Optional review comment…"
                className="mt-3 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--tx)] outline-none focus:border-[var(--accent)]"
                rows={3}
              />
              <div className="mt-4 flex gap-3">
                <button onClick={handleCrAction} disabled={crActionLoading}
                  className={`flex-1 rounded-2xl px-4 py-2 text-white font-semibold disabled:opacity-60 ${
                    crAction.type === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}>
                  {crActionLoading ? 'Processing…' : crAction.type === 'approve' ? 'Approve' : 'Reject'}
                </button>
                <button onClick={() => { setCrAction(null); setCrComment(''); }}
                  className="flex-1 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-[var(--tx-2)] hover:bg-[var(--surface-2)]">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
