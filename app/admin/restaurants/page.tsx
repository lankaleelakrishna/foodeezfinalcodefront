'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import AuthGuard from '../../components/AuthGuard';
import { restaurantsApi, documentsApi, api } from '../../../lib/api';

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

type Document = { id: string; type: string; filename: string; status: string; uploadedAt: string; previewUrl?: string; downloadUrl?: string; s3Key?: string };

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
  const [restaurantStatus, setRestaurantStatus] = useState<string>('review');
  const [restaurantLeadStatus, setRestaurantLeadStatus] = useState<string>('REVIEW');
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [crLoading, setCrLoading] = useState(false);
  const [crAction, setCrAction] = useState<{ id: string; type: 'approve' | 'reject' } | null>(null);
  const [crComment, setCrComment] = useState('');
  const [crActionLoading, setCrActionLoading] = useState(false);
  const [docVerifyLoading, setDocVerifyLoading] = useState<string | null>(null);
  const [docRejectModal, setDocRejectModal] = useState<Document | null>(null);
  const [docRejectReason, setDocRejectReason] = useState('');
  const [docRejectLoading, setDocRejectLoading] = useState(false);
  const [docPreview, setDocPreview] = useState<{ url: string; filename: string; isPdf: boolean } | null>(null);
  const [docPreviewLoading, setDocPreviewLoading] = useState<string | null>(null);
  const [docPreviewError, setDocPreviewError] = useState<string | null>(null);

  const openDocument = async (doc: Document) => {
    setDocPreviewLoading(doc.id);
    setDocPreviewError(null);
    setError('');
    try {
      // Uses GET /admin/documents/:documentId/preview (SuperAdmin, SalesOperator)
      const res = await documentsApi.adminPreview(doc.id);
      const blob: Blob = res.data;
      const isPdf = blob.type === 'application/pdf' || doc.filename.toLowerCase().endsWith('.pdf');

      // Backend may return JSON { url: "https://s3.signed..." } instead of raw bytes
      if (blob.type.includes('json') || blob.type.includes('text')) {
        const text = await blob.text();
        try {
          const json = JSON.parse(text);
          const signedUrl: string | undefined =
            json.url ?? json.signedUrl ?? json.previewUrl ?? json.downloadUrl;
          if (signedUrl) {
            setDocPreview({ url: signedUrl, filename: doc.filename, isPdf });
            return;
          }
        } catch { /* not JSON — fall through to blob */ }
      }

      const blobUrl = URL.createObjectURL(blob);
      setDocPreview({ url: blobUrl, filename: doc.filename, isPdf });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Could not load document preview.';
      setDocPreviewError(typeof msg === 'string' ? msg : 'Could not load document preview.');
    } finally {
      setDocPreviewLoading(null);
    }
  };

  const closeDocPreview = () => {
    if (docPreview) URL.revokeObjectURL(docPreview.url);
    setDocPreview(null);
  };

  const handleDocVerify = async (doc: Document) => {
    if (!selectedRestaurant) return;
    setDocVerifyLoading(doc.id);
    try {
      await documentsApi.updateStatus(selectedRestaurant.id, doc.id, 'verified');
      await fetchDocuments(selectedRestaurant.id);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to verify document.';
      alert(Array.isArray(msg) ? msg.join(' ') : msg);
    } finally {
      setDocVerifyLoading(null);
    }
  };

  const handleDocReject = async () => {
    if (!selectedRestaurant || !docRejectModal || !docRejectReason.trim()) return;
    setDocRejectLoading(true);
    try {
      await documentsApi.updateStatus(selectedRestaurant.id, docRejectModal.id, 'rejected', docRejectReason.trim());
      await fetchDocuments(selectedRestaurant.id);
      setDocRejectModal(null);
      setDocRejectReason('');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to reject document.';
      alert(Array.isArray(msg) ? msg.join(' ') : msg);
    } finally {
      setDocRejectLoading(false);
    }
  };

  const fetchRestaurants = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/restaurants', { params: { status: statusFilter || 'review' } });
      const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
      // When viewing the 'review' queue, include both 'review' and 'pending' restaurants
      if ((statusFilter || 'review') === 'review') {
        setRestaurants(data.filter((r: Restaurant) => r.status === 'review' || r.status === 'pending'));
      } else {
        setRestaurants(data.filter((r: Restaurant) => r.status === (statusFilter || 'review')));
      }
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
      setRestaurantStatus(response.data.status ?? 'review');
      setRestaurantLeadStatus(response.data.leadStatus ?? 'REVIEW');
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

  const handleAction = async (restaurantId: string, newStatus: 'active' | 'pending') => {
    setActionLoading(true);
    try {
      const payload: any = { status: newStatus };
      if (newStatus === 'active') {
        payload.leadStatus = 'ACTIVATED';
      }
      await api.patch(`/restaurants/${restaurantId}`, payload);
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

    // Approximate city → coordinates lookup so branches are discoverable on the map
    const CITY_COORDS: Record<string, [number, number]> = {
      'hyderabad': [17.3850, 78.4867], 'secunderabad': [17.4399, 78.4983],
      'bangalore': [12.9716, 77.5946], 'bengaluru': [12.9716, 77.5946],
      'mumbai': [19.0760, 72.8777], 'pune': [18.5204, 73.8567],
      'delhi': [28.6139, 77.2090], 'new delhi': [28.6139, 77.2090],
      'noida': [28.5355, 77.3910], 'gurgaon': [28.4595, 77.0266], 'gurugram': [28.4595, 77.0266],
      'chennai': [13.0827, 80.2707], 'kolkata': [22.5726, 88.3639],
      'ahmedabad': [23.0225, 72.5714], 'surat': [21.1702, 72.8311],
      'jaipur': [26.9124, 75.7873], 'lucknow': [26.8467, 80.9462],
      'kanpur': [26.4499, 80.3319], 'nagpur': [21.1458, 79.0882],
      'patna': [25.5941, 85.1376], 'indore': [22.7196, 75.8577],
      'bhopal': [23.2599, 77.4126], 'visakhapatnam': [17.6868, 83.2185],
      'vadodara': [22.3072, 73.1812], 'coimbatore': [11.0168, 76.9558],
      'kochi': [9.9312, 76.2673], 'thiruvananthapuram': [8.5241, 76.9366],
      'mysuru': [12.2958, 76.6394], 'mysore': [12.2958, 76.6394],
      'mangaluru': [12.9141, 74.8560], 'mangalore': [12.9141, 74.8560],
      'chandigarh': [30.7333, 76.7794], 'amritsar': [31.6340, 74.8723],
      'bhubaneswar': [20.2961, 85.8245], 'guwahati': [26.1445, 91.7362],
    };
    const cityKey = (selectedRestaurant.city ?? '').toLowerCase().trim();
    const [branchLat, branchLng] = CITY_COORDS[cityKey] ?? [17.3850, 78.4867];

    try {
      // 1. Use the proper approval endpoint
      if (restaurantStatus !== selectedRestaurant.status || restaurantLeadStatus !== selectedRestaurant.leadStatus) {
        setForwardStatus('Updating restaurant status…');
        try {
          await api.patch(`/restaurants/${restaurantId}`, {
            status: restaurantStatus,
            leadStatus: restaurantLeadStatus,
          });
        } catch (statusErr) {
          console.warn('Restaurant status update failed:', statusErr);
        }
      }

      if (restaurantStatus !== selectedRestaurant.status || restaurantLeadStatus !== selectedRestaurant.leadStatus) {
        setForwardStatus('Updating restaurant status…');
        try {
          await api.patch(`/restaurants/${restaurantId}`, {
            status: restaurantStatus,
            leadStatus: restaurantLeadStatus,
          });
        } catch (statusErr) {
          console.warn('Restaurant status update failed:', statusErr);
        }
      }

      setForwardStatus('Approving registration…');
      await api.post(`/restaurants/${restaurantId}/approve-registration`);

      // 2. Find or create a default branch; also fix existing branches with bad coords/status
      setForwardStatus('Setting up branch…');
      let branchId: string | null = null;
      try {
        const brRes = await api.get(`/restaurants/${restaurantId}/branches`);
        const branches: { id: string; latitude?: number; longitude?: number; isOnline?: boolean }[] =
          Array.isArray(brRes.data) ? brRes.data : (brRes.data?.data ?? []);
        if (branches.length > 0) {
          branchId = branches[0].id;
          // Patch the branch online and give it real coordinates if it has placeholder 0,0
          const b = branches[0];
          if (!b.isOnline || !b.latitude || !b.longitude) {
            try {
              await api.patch(`/restaurants/${restaurantId}/branches/${branchId}`, {
                isOnline: true,
                latitude:  b.latitude  || branchLat,
                longitude: b.longitude || branchLng,
              });
            } catch {}
          }
        }
      } catch {}

      if (!branchId) {
        const brRes = await api.post(`/restaurants/${restaurantId}/branches`, {
          name: `${selectedRestaurant.name} – Main`,
          address: selectedRestaurant.address,
          city: selectedRestaurant.city,
          state: selectedRestaurant.state,
          zipCode: selectedRestaurant.zipCode,
          isOnline: true,
          openingTime: '09:00',
          closingTime: '22:00',
          latitude:  branchLat,
          longitude: branchLng,
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

  // Split restaurants into review / pending columns for side-by-side display
  const reviewRestaurants = restaurants.filter((r) => r.status === 'review');
  const pendingRestaurants = restaurants.filter((r) => r.status === 'pending');

  return (
    <AuthGuard requiredRoles={['super_admin']}>
      {/* ── Document preview modal ── */}
      {docPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={closeDocPreview}>
          {/* Close button — top-right corner, always visible */}
          <button
            type="button"
            onClick={closeDocPreview}
            className="absolute top-4 right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white text-black shadow-xl hover:bg-gray-100 transition"
            title="Close"
          >
            <svg viewBox="0 0 16 16" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>

          {/* Image / PDF — stop click from bubbling to backdrop */}
          <div className="relative max-h-full max-w-4xl w-full flex flex-col items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs text-white/60 truncate max-w-full">{docPreview.filename}</p>
            {docPreview.isPdf ? (
              <iframe src={docPreview.url} className="h-[80vh] w-full rounded-xl border-0" title={docPreview.filename} />
            ) : (
              <img src={docPreview.url} alt={docPreview.filename} className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl" />
            )}
            <p className="text-xs text-white/40">Click outside the image to close</p>
          </div>
        </div>
      )}

      {/* ── Reject document modal ── */}
      {docRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-md rounded-3xl bg-[var(--surface)] p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-[var(--tx)]">Reject {docRejectModal.type}</h2>
            <p className="mt-2 text-sm text-[var(--tx-3)] truncate">{docRejectModal.filename}</p>
            <div className="mt-4">
              <label className="block text-sm font-medium text-[var(--tx-2)] mb-1">
                Rejection reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={docRejectReason}
                onChange={(e) => setDocRejectReason(e.target.value)}
                rows={3}
                placeholder="Explain why this document is being rejected…"
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5 text-sm text-[var(--tx)] outline-none resize-none focus:border-rose-500"
              />
            </div>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                disabled={docRejectLoading || !docRejectReason.trim()}
                onClick={handleDocReject}
                className="flex-1 rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60 transition"
              >
                {docRejectLoading ? 'Rejecting…' : 'Reject'}
              </button>
              <button
                type="button"
                disabled={docRejectLoading}
                onClick={() => { setDocRejectModal(null); setDocRejectReason(''); }}
                className="flex-1 rounded-2xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-[var(--tx-2)] hover:bg-[var(--surface-2)] transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
          <div className="grid gap-6 lg:grid-cols-4 items-start">
            {/* Review list */}
            <div className="rounded-3xl bg-[var(--surface)] shadow-sm lg:col-span-1">
              <div className="border-b border-[var(--border)] px-6 py-4">
                <h2 className="text-lg font-semibold text-[var(--tx)]">Review ({reviewRestaurants.length})</h2>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {reviewRestaurants.map((restaurant) => (
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

            {/* Pending list */}
            <div className="rounded-3xl bg-[var(--surface)] shadow-sm lg:col-span-1">
              <div className="border-b border-[var(--border)] px-6 py-4">
                <h2 className="text-lg font-semibold text-[var(--tx)]">Pending ({pendingRestaurants.length})</h2>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {pendingRestaurants.map((restaurant) => (
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
                      <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h2 className="text-2xl font-semibold text-[var(--tx)]">{selectedRestaurant.name}</h2>
                          <p className="mt-1 text-[var(--tx-3)]">{selectedRestaurant.email}</p>
                        </div>
                        <div className="space-y-3">
                          <span className={`inline-flex items-center gap-2 rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs font-semibold text-[var(--tx-3)] ${STATUS_COLORS[selectedRestaurant.status] || ''}`}>
                            Current: {selectedRestaurant.status.toUpperCase()}
                          </span>
                        </div>
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
                        {docPreviewError && (
                          <p className="mb-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600">{docPreviewError}</p>
                        )}
                        {docsLoading ? (
                          <p className="text-sm text-[var(--tx-3)]">Loading documents...</p>
                        ) : documents.length === 0 ? (
                          <p className="text-sm text-[var(--tx-3)]">No documents uploaded.</p>
                        ) : (
                          <div className="space-y-2">
                            {documents.map((doc) => (
                              <div key={doc.id} className="rounded-2xl bg-[var(--surface-2)] p-3 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="font-medium text-sm text-[var(--tx)]">{doc.type}</p>
                                    <p className="text-xs text-[var(--tx-3)] truncate">{doc.filename}</p>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                      doc.status === 'verified' ? 'bg-emerald-100 text-emerald-700' :
                                      doc.status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                                      'bg-amber-100 text-amber-700'
                                    }`}>{doc.status}</span>
                                    <button
                                      type="button"
                                      onClick={() => openDocument(doc)}
                                      disabled={docPreviewLoading === doc.id}
                                      title="View document"
                                      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 text-[var(--tx-3)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition disabled:opacity-50"
                                    >
                                      {docPreviewLoading === doc.id ? (
                                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                          <circle cx="12" cy="12" r="10" strokeOpacity={0.25} />
                                          <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                                        </svg>
                                      ) : (
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                        </svg>
                                      )}
                                    </button>
                                  </div>
                                </div>
                                {/* uploaded → Accept / Reject */}
                                {doc.status === 'uploaded' && (
                                  <div className="flex gap-2 pt-1">
                                    <button
                                      type="button"
                                      disabled={docVerifyLoading === doc.id}
                                      onClick={() => handleDocVerify(doc)}
                                      className="flex-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition"
                                    >
                                      {docVerifyLoading === doc.id ? 'Verifying…' : 'Accept'}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={docVerifyLoading === doc.id}
                                      onClick={() => setDocRejectModal(doc)}
                                      className="flex-1 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60 transition"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                )}
                                {/* rejected → Reset to Pending so owner can re-upload */}
                                {doc.status === 'rejected' && (
                                  <div className="flex gap-2 pt-1">
                                    <button
                                      type="button"
                                      disabled={docVerifyLoading === doc.id}
                                      onClick={async () => {
                                        if (!selectedRestaurant) return;
                                        setDocVerifyLoading(doc.id);
                                        try {
                                          await documentsApi.updateStatus(selectedRestaurant.id, doc.id, 'pending');
                                          await fetchDocuments(selectedRestaurant.id);
                                        } catch (err: any) {
                                          const msg = err?.response?.data?.message || 'Failed to reset document.';
                                          alert(Array.isArray(msg) ? msg.join(' ') : msg);
                                        } finally { setDocVerifyLoading(null); }
                                      }}
                                      className="flex-1 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-60 transition"
                                    >
                                      {docVerifyLoading === doc.id ? 'Resetting…' : 'Reset to Pending'}
                                    </button>
                                  </div>
                                )}
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

                  {activeTab === 'menu' && (
                    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
                      <h3 className="text-sm font-semibold text-[var(--tx)]">Review status before approval</h3>
                      <p className="mt-2 text-xs text-[var(--tx-3)]">Update the restaurant status and lead status below before forwarding this registration to the restaurant admin.</p>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <label className="block text-sm text-[var(--tx)]">
                          <span className="mb-1 block text-xs font-semibold uppercase tracking-widest text-[var(--tx-3)]">Status</span>
                          <select value={restaurantStatus} onChange={(e) => setRestaurantStatus(e.target.value)}
                            className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--tx)] outline-none focus:border-[var(--accent)]">
                            <option value="pending">Pending</option>
                            <option value="review">Review</option>
                            <option value="active">Active</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </label>
                        <label className="block text-sm text-[var(--tx)]">
                          <span className="mb-1 block text-xs font-semibold uppercase tracking-widest text-[var(--tx-3)]">Lead status</span>
                          <select value={restaurantLeadStatus} onChange={(e) => setRestaurantLeadStatus(e.target.value)}
                            className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--tx)] outline-none focus:border-[var(--accent)]">
                            <option value="INTERESTED">Interested</option>
                            <option value="REGISTERED">Registered</option>
                            <option value="ACTIVATED">Activated</option>
                            <option value="REVIEW">Review</option>
                            <option value="REJECTED">Rejected</option>
                          </select>
                        </label>
                      </div>
                    </div>
                  )}

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
                    {activeTab === 'details' ? (
                      <button onClick={() => setActiveTab('menu')} disabled={actionLoading}
                        className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2">
                        <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 10h14M11 4l6 6-6 6" />
                        </svg>
                        Next
                      </button>
                    ) : activeTab === 'menu' ? (
                      <div className="space-y-2">
                        <button onClick={() => setActiveTab('details')} disabled={actionLoading}
                          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[var(--tx)] font-semibold hover:bg-[var(--surface-2)] disabled:opacity-60 flex items-center justify-center gap-2">
                          <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 10H3m6 6l-6-6 6-6" />
                          </svg>
                          Back to Details
                        </button>
                        <button onClick={() => setAction('forward')} disabled={actionLoading}
                          className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2">
                          <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 10h14M11 4l6 6-6 6" />
                          </svg>
                          Forward to Restaurant Admin
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setAction('forward')} disabled={actionLoading}
                        className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2">
                        <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 10h14M11 4l6 6-6 6" />
                        </svg>
                        Forward to Restaurant Admin
                      </button>
                    )}
                    <button onClick={() => setAction('reject')} disabled={actionLoading}
                      className="w-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-700 font-semibold hover:bg-amber-100 disabled:opacity-60">
                      Move to Pending
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
                  <h3 className="text-lg font-semibold text-[var(--tx)]">Move Back to Pending?</h3>
                  <p className="mt-2 text-sm text-[var(--tx-3)]">
                    <strong className="text-[var(--tx)]">{selectedRestaurant.name}</strong> will be moved back to <span className="font-semibold text-amber-600">pending</span> status so the restaurant can make corrections and resubmit.
                  </p>
                </>
              )}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => { if (action === 'forward') handleForward(selectedRestaurant.id); else handleAction(selectedRestaurant.id, 'pending'); }}
                  disabled={actionLoading}
                  className={`flex-1 rounded-2xl px-4 py-2 text-white font-semibold disabled:opacity-60 ${
                    action === 'forward' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}>
                  {actionLoading
                    ? (action === 'forward' ? 'Forwarding…' : 'Moving to Pending…')
                    : (action === 'forward' ? 'Confirm & Forward' : 'Move to Pending')}
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