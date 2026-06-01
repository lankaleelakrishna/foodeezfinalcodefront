'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import AuthGuard from '../../components/AuthGuard';
import { deliveryTrackingApi } from '../../../lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

type ActiveRider = {
  id: string;
  name: string;
  phone: string;
  vehicleType: string;
  currentLatitude?: number;
  currentLongitude?: number;
  isOnline: boolean;
  isAvailable: boolean;
};

type LiveLocation = {
  partnerId: string;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
  assignmentId?: string;
  orderId?: string;
  timestamp?: string;
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DeliveryTrackingPage() {
  const [activeRiders, setActiveRiders] = useState<ActiveRider[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRider, setSelectedRider] = useState<ActiveRider | null>(null);
  const [liveLocations, setLiveLocations] = useState<Record<string, LiveLocation>>({});
  const [connected, setConnected] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderTracking, setOrderTracking] = useState<any>(null);
  const socketRef = useRef<Socket | null>(null);

  const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api/v1')
    .replace('/api/v1', '');

  useEffect(() => {
    loadActiveRiders();

    const socket = io(`${baseUrl}/delivery-tracking`, {
      transports: ['websocket'],
      auth: {
        token: typeof window !== 'undefined' ? localStorage.getItem('restaurant_onboarding_token') : '',
      },
    });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('rider-location-update', (data: LiveLocation) => {
      setLiveLocations((prev) => ({
        ...prev,
        [data.partnerId]: { ...data, timestamp: new Date().toISOString() },
      }));
    });

    socket.emit('join-admin-room');

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, []);

  const loadActiveRiders = () => {
    setLoading(true);
    deliveryTrackingApi.activeRiders()
      .then((r) => setActiveRiders(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const handleOrderSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderSearch.trim()) return;
    try {
      const r = await deliveryTrackingApi.byOrder(orderSearch.trim());
      setOrderTracking(r.data);
    } catch {
      setOrderTracking(null);
    }
  };

  const selectRider = (rider: ActiveRider) => {
    setSelectedRider(rider);
    if (socketRef.current) {
      socketRef.current.emit('join-rider-room', { riderId: rider.id });
    }
  };

  const liveLoc = selectedRider ? liveLocations[selectedRider.id] ?? null : null;
  const mapLat = Number(liveLoc?.latitude ?? selectedRider?.currentLatitude ?? 0);
  const mapLng = Number(liveLoc?.longitude ?? selectedRider?.currentLongitude ?? 0);

  return (
    <AuthGuard requiredRoles={['super_admin']}>
      <div className="space-y-6">

        {/* Header */}
        <div className="overflow-hidden rounded-[2rem] bg-white p-8 shadow-[0_24px_64px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-[#B88A2E]/90">Delivery</p>
              <h1 className="mt-4 text-4xl font-semibold text-slate-900">Live Tracking</h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">Real-time location of all active delivery riders.</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${connected ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
                <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-400'}`} />
                {connected ? 'Connected' : 'Disconnected'}
              </span>
              <button
                onClick={loadActiveRiders}
                className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Order search */}
        <div className="rounded-[2rem] bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Track by Order</h2>
          <form onSubmit={handleOrderSearch} className="flex gap-3">
            <input
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              placeholder="Enter Order ID…"
              className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#B88A2E]"
            />
            <button type="submit" className="rounded-full bg-[#B88A2E] px-6 py-3 text-sm font-semibold text-white hover:bg-[#a07828]">
              Track
            </button>
          </form>
          {orderTracking && (
            <>
              <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm space-y-1">
                <p><span className="font-medium text-slate-700">Partner ID:</span> <span className="text-slate-500">{orderTracking.partnerId ?? '—'}</span></p>
                <p><span className="font-medium text-slate-700">Latitude:</span> <span className="text-slate-500">{orderTracking.latitude ?? '—'}</span></p>
                <p><span className="font-medium text-slate-700">Longitude:</span> <span className="text-slate-500">{orderTracking.longitude ?? '—'}</span></p>
                <p><span className="font-medium text-slate-700">Speed:</span> <span className="text-slate-500">{orderTracking.speed != null ? `${orderTracking.speed} km/h` : '—'}</span></p>
                <p><span className="font-medium text-slate-700">Assignment ID:</span> <span className="text-slate-500">{orderTracking.assignmentId ?? '—'}</span></p>
              </div>

              {orderTracking.latitude != null && orderTracking.longitude != null && (
                <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200">
                  <div className="bg-slate-950 px-4 py-3 text-sm font-semibold text-white">Order Map</div>
                  <iframe
                    title="Order tracking map"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${orderTracking.longitude - 0.02}%2C${orderTracking.latitude - 0.01}%2C${orderTracking.longitude + 0.02}%2C${orderTracking.latitude + 0.01}&layer=mapnik&marker=${orderTracking.latitude}%2C${orderTracking.longitude}`}
                    className="h-64 w-full border-0"
                    loading="lazy"
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Active Riders grid + detail */}
        <div className="grid gap-6 lg:grid-cols-3">

          {/* Riders list */}
          <div className="rounded-[2rem] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
              Active Riders ({activeRiders.length})
            </h2>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
                ))}
              </div>
            ) : activeRiders.length === 0 ? (
              <p className="text-sm text-slate-400">No active riders online.</p>
            ) : (
              <div className="space-y-2">
                {activeRiders.map((r) => {
                  const live = liveLocations[r.id];
                  const isSelected = selectedRider?.id === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => selectRider(r)}
                      className={`w-full rounded-2xl border p-3 text-left transition ${
                        isSelected
                          ? 'border-[#B88A2E]/40 bg-[#B88A2E]/5'
                          : 'border-slate-100 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-800">{r.name}</p>
                          <p className="text-xs text-slate-400">{r.phone} · {r.vehicleType}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${live ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                          <span className="text-xs text-slate-500">{live ? 'Live' : 'Static'}</span>
                        </div>
                      </div>
                      {live && (
                        <p className="mt-1 text-xs text-slate-400">
                          {live.latitude.toFixed(5)}, {live.longitude.toFixed(5)}
                          {live.speed != null ? ` · ${live.speed} km/h` : ''}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Rider detail panel */}
          <div className="lg:col-span-2 rounded-[2rem] bg-white p-6 shadow-sm">
            {!selectedRider ? (
              <div className="flex h-full min-h-[300px] items-center justify-center">
                <p className="text-sm text-slate-400">Select a rider to view live location details.</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">{selectedRider.name}</h2>
                    <p className="text-sm text-slate-400">{selectedRider.phone} · {selectedRider.vehicleType}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${selectedRider.isAvailable ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {selectedRider.isAvailable ? 'Available' : 'Busy'}
                  </span>
                </div>

                {liveLoc ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {[
                      { label: 'Latitude',  value: liveLoc.latitude.toFixed(6) },
                      { label: 'Longitude', value: liveLoc.longitude.toFixed(6) },
                      { label: 'Speed',     value: liveLoc.speed != null ? `${liveLoc.speed} km/h` : '—' },
                      { label: 'Heading',   value: liveLoc.heading != null ? `${liveLoc.heading}°` : '—' },
                      { label: 'Accuracy',  value: liveLoc.accuracy != null ? `${liveLoc.accuracy} m` : '—' },
                      { label: 'Updated',   value: liveLoc.timestamp ? new Date(liveLoc.timestamp).toLocaleTimeString('en-IN') : '—' },
                    ].map((s) => (
                      <div key={s.label} className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{s.label}</p>
                        <p className="mt-1 text-base font-semibold text-slate-900">{s.value}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-slate-50 p-6 text-center">
                    <p className="text-sm text-slate-400">Waiting for live location update…</p>
                    <p className="mt-1 text-xs text-slate-300">Updates stream in via WebSocket when the rider moves.</p>
                  </div>
                )}

                {(selectedRider?.currentLatitude && selectedRider?.currentLongitude) || (liveLoc && liveLoc.latitude && liveLoc.longitude) ? (
                  <div className="overflow-hidden rounded-3xl border border-slate-200 p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Map Preview</p>
                    <iframe
                      title="Rider live location map"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${mapLng - 0.02}%2C${mapLat - 0.01}%2C${mapLng + 0.02}%2C${mapLat + 0.01}&layer=mapnik&marker=${mapLat}%2C${mapLng}`}
                      className="h-72 w-full border-0 rounded-2xl"
                      loading="lazy"
                    />
                  </div>
                ) : null}

                {selectedRider.currentLatitude && selectedRider.currentLongitude && (
                  <div className="rounded-2xl border border-slate-100 p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Last Known Position</p>
                    <p className="text-sm text-slate-600">
                      {selectedRider.currentLatitude}, {selectedRider.currentLongitude}
                    </p>
                    <a
                      href={`https://www.google.com/maps?q=${selectedRider.currentLatitude},${selectedRider.currentLongitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-xs text-[#B88A2E] hover:underline"
                    >
                      Open in Google Maps →
                    </a>
                  </div>
                )}

                {liveLoc && (
                  <div className="rounded-2xl border border-slate-100 p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Live Position</p>
                    <a
                      href={`https://www.google.com/maps?q=${liveLoc.latitude},${liveLoc.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#B88A2E] hover:underline"
                    >
                      Open live location in Google Maps →
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}