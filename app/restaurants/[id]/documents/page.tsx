'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { documentsApi, restaurantsApi, api } from '../../../../lib/api';
import { getUserRole } from '../../../../lib/auth';

type Document = {
  id: string;
  type: string;
  filename: string;
  status: string;
  uploadedAt: string;
  s3Key?: string;
  downloadUrl?: string;
  previewUrl?: string;
};

export default function RestaurantDocumentsPage() {
  const router = useRouter();
  const routeParams = useParams();
  const id = routeParams.id as string;
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [restaurantStatus, setRestaurantStatus] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState<string | null>(null);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [selectedAction, setSelectedAction] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchDocuments = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await documentsApi.list(id);
      const data = response.data;
      const documentsData = Array.isArray(data)
        ? data
        : Array.isArray(data?.documents)
        ? data.documents
        : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.items)
        ? data.items
        : [];

      setDocuments(documentsData);
      setError('');
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Unable to load documents.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
    setUserRole(getUserRole());
    // fetch restaurant details (status) for admin badge
    const fetchRestaurant = async () => {
      if (!id) return;
      try {
        const res = await restaurantsApi.get(id);
        const data = res.data;
        setRestaurantStatus(data?.status ?? null);
        setRestaurantName(data?.name ?? null);
      } catch (e) {
        // ignore errors for badge
      }
    };
    fetchRestaurant();
  }, [id]);

  const openDocument = (document: Document) => {
    if (document.downloadUrl) {
      window.open(document.downloadUrl, '_blank');
      return;
    }

    // Prefer previewUrl returned by the API
    if (document.previewUrl) {
      let url = document.previewUrl;

      if (!/^https?:\/\//i.test(url)) {
        // Normalize relative preview URLs, especially if the API returns
        // a document route without the /preview suffix.
        const normalizedUrl = url.replace(/\/+$/, '');
        if (/\/restaurants\/[^/]+\/documents\/[^/]+$/i.test(normalizedUrl)) {
          url = `${normalizedUrl}/preview`;
        }

        const rawBase = api.defaults.baseURL ?? '';
        const baseUrl = rawBase.replace(/\/$/, '').replace(/\/api\/v[0-9]+$/i, '');
        url = url.startsWith('/') ? `${baseUrl}${url}` : `${baseUrl}/${url}`;
      }

      window.open(url, '_blank');
      return;
    }

    // Fallback: open preview by document id (server exposes /restaurants/:id/documents/:documentId/preview)
    if (document.id) {
      const rawBase = api.defaults.baseURL ?? '';
      const baseUrl = rawBase.replace(/\/$/, '').replace(/\/api\/v[0-9]+$/i, '');
      const url = `${baseUrl}/restaurants/${id}/documents/${document.id}/preview`;
      window.open(url, '_blank');
      return;
    }

    // Last-resort fallback to type+filename route
    const rawBase = api.defaults.baseURL ?? '';
    const baseUrl = rawBase.replace(/\/$/, '').replace(/\/api\/v[0-9]+$/i, '');
    const type = encodeURIComponent(document.type);
    const filename = encodeURIComponent(document.filename);
    const url = `${baseUrl}/restaurants/${id}/documents/${type}/${filename}`;
    window.open(url, '_blank');
  };

  const handleVerify = async () => {
    if (!selectedDocument || !selectedAction) return;
    if (selectedAction === 'reject' && !rejectionReason.trim()) {
      setError('A rejection reason is required.');
      return;
    }
    setVerifyLoading(true);
    setError('');
    setMessage('');
    try {
      await documentsApi.updateStatus(
        id,
        selectedDocument.id,
        selectedAction === 'approve' ? 'verified' : 'rejected',
        selectedAction === 'reject' ? rejectionReason.trim() : undefined,
      );
      setMessage(`${selectedDocument.type} document ${selectedAction === 'approve' ? 'verified' : 'rejected'} successfully.`);
      setVerifyModalOpen(false);
      setSelectedAction(null);
      setRejectionReason('');
      fetchDocuments();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Unable to update document verification status.';
      setError(Array.isArray(msg) ? msg.join(' ') : msg);
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-8 shadow-lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Restaurant Documents</h1>
            <p className="mt-2 text-slate-600">Viewing uploaded documents for restaurant {id}.</p>
            <p className="mt-1 text-sm text-slate-500">Document uploads are handled during registration (step 2).</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => router.back()} className="rounded-2xl border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50">
              Back
            </button>
            <button onClick={() => router.push(`/restaurants/${id}`)} className="rounded-2xl bg-slate-900 px-4 py-2 text-white hover:bg-slate-700">
              Restaurant
            </button>
            {userRole === 'super_admin' && restaurantStatus && (restaurantStatus === 'pending' || restaurantStatus === 'review') && (
              <button
                type="button"
                disabled
                title="Restaurant is pending review"
                className="rounded-2xl bg-amber-100 px-3 py-2 text-amber-800 font-semibold"
              >
                Pending
              </button>
            )}
          </div>
        </div>
      </div>

      {(message || error) && (
        <div className={`rounded-3xl p-4 ${error ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
          {error || message}
        </div>
      )}

      {verifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-6">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-semibold">
              {selectedAction === 'approve' ? 'Verify' : 'Reject'} {selectedDocument?.type}
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              Confirm {selectedAction === 'approve' ? 'verification' : 'rejection'} for{' '}
              <span className="font-semibold">{selectedDocument?.filename}</span>.
            </p>
            {selectedAction === 'reject' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Rejection reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  placeholder="Explain why this document is being rejected…"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none resize-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                />
              </div>
            )}
            <div className="mt-5 grid gap-3">
              <button
                type="button"
                onClick={handleVerify}
                disabled={verifyLoading || (selectedAction === 'reject' && !rejectionReason.trim())}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-60 transition ${
                  selectedAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {verifyLoading
                  ? selectedAction === 'approve' ? 'Verifying…' : 'Rejecting…'
                  : selectedAction === 'approve' ? 'Verify' : 'Reject'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setVerifyModalOpen(false);
                  setSelectedDocument(null);
                  setSelectedAction(null);
                  setRejectionReason('');
                }}
                disabled={verifyLoading}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Uploaded documents</h2>
        {loading ? (
          <p className="mt-4 text-slate-500">Loading documents...</p>
        ) : documents.length === 0 ? (
          <p className="mt-4 text-slate-500">No documents uploaded yet.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {documents.map((document) => (
              <div key={document.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{document.type}</p>
                    <p className="text-sm text-slate-500 truncate">{document.filename}</p>
                    <p className="text-sm text-slate-500">Uploaded: {new Date(document.uploadedAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex flex-col gap-2 sm:items-end">
                    <button
                      type="button"
                      onClick={() => openDocument(document)}
                      className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Open document
                    </button>
                    {document.status === 'verified' && (
                      <button
                        type="button"
                        disabled
                        className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                      >
                        ✓ Verified
                      </button>
                    )}
                    {document.status === 'rejected' && (
                      <button
                        type="button"
                        disabled
                        className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
                      >
                        ✗ Rejected
                      </button>
                    )}
                    {userRole === 'super_admin' && document.status === 'uploaded' && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDocument(document);
                            setSelectedAction('approve');
                            setVerifyModalOpen(true);
                          }}
                          className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                        >
                          Verify
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDocument(document);
                            setSelectedAction('reject');
                            setVerifyModalOpen(true);
                          }}
                          className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
