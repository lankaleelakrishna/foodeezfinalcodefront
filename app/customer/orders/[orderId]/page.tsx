'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { customerOrdersApi } from '../../../../lib/api';

// ── Types ──────────────────────────────────────────────────────────────────

type OrderItem    = { name: string; quantity: number; price: number; subtotal: number };
type StatusEntry  = { status: string; timestamp: string };
type DeliveryAddr = { label: string; addressLine1: string; city: string };
type Order = {
  id: string; orderNumber: string; status: string; grandTotal: number;
  subtotal: number; deliveryFee: number; taxAmount: number;
  paymentMethod?: string;
  specialInstructions?: string; createdAt: string;
  items: OrderItem[]; statusHistory?: StatusEntry[];
  deliveryAddress?: DeliveryAddr; restaurantName?: string;
  deliveryPartner?: { name: string; rating?: number; bike?: string; phone?: string };
};

// ── Status steps config ────────────────────────────────────────────────────

const STEPS = [
  { key: 'PLACED',     label: 'Order Placed',    emoji: '📝', desc: 'We got your order!' },
  { key: 'CONFIRMED',  label: 'Confirmed',        emoji: '✅', desc: 'Restaurant confirmed your order' },
  { key: 'PREPARING',  label: 'Preparing',        emoji: '👨‍🍳', desc: 'Your food is being cooked' },
  { key: 'READY',      label: 'Ready',            emoji: '🛍️', desc: 'Food is packed and ready' },
  { key: 'PICKED_UP',  label: 'Picked Up',        emoji: '🏍️', desc: 'Rider has your order' },
  { key: 'ON_THE_WAY', label: 'On the Way',       emoji: '🚀', desc: "We're heading to you" },
  { key: 'DELIVERED',  label: 'Delivered',        emoji: '🎉', desc: 'Enjoy your meal!' },
];
const TRACKING_STEPS = [
  { key: 'CONFIRMED', title: 'Order Confirmed', subtitle: 'Your order has been placed', icon: '✅' },
  { key: 'PREPARING', title: 'Food Being Prepared', subtitle: 'Chef is preparing your order', icon: '👨‍🍳' },
  { key: 'READY', title: 'Delivery Partner Assigned', subtitle: 'Partner is on the way to restaurant', icon: '🚗' },
  { key: 'PICKED_UP', title: 'Picking Up Food', subtitle: 'Partner is collecting your order', icon: '📦' },
  { key: 'ON_THE_WAY', title: 'On The Way', subtitle: 'Heading to your delivery address', icon: '🛵' },
  { key: 'DELIVERED', title: 'Delivered', subtitle: 'Order delivered successfully', icon: '🏁' },
];

function getTrackingStepIndex(status: string) {
  if (status === 'PLACED') return 0;
  return TRACKING_STEPS.findIndex((step) => step.key === status);
}

function LiveTrackingCard() {
  return (
    <div className="rounded-[2rem] border border-slate-200/70 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-950">Live Delivery Tracking</h2>
          <p className="mt-1 text-sm text-slate-500">Track the latest location and ETA</p>
        </div>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">ETA 8 mins</span>
      </div>
      <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
        <div className="relative h-52">
          <svg className="h-full w-full" viewBox="0 0 300 180" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="trackGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#2DD06E" />
                <stop offset="100%" stopColor="#0F766E" />
              </linearGradient>
            </defs>
            <polyline points="30,150 90,120 160,80 240,40" stroke="url(#trackGrad)" strokeWidth="4" fill="none" strokeLinecap="round" />
            <circle cx="30" cy="150" r="10" fill="#22C55E" />
            <circle cx="240" cy="40" r="10" fill="#EF4444" />
            <line x1="30" y1="150" x2="30" y2="160" stroke="#94A3B8" strokeWidth="1" />
            <line x1="240" y1="40" x2="240" y2="30" stroke="#94A3B8" strokeWidth="1" />
          </svg>
          <div className="absolute left-3 bottom-2 text-xs text-slate-500">Your Address</div>
          <div className="absolute right-3 top-2 text-xs text-slate-500">Restaurant</div>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Progress</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">100% Complete</p>
        </div>
        <div className="rounded-2xl bg-green-50 p-3">
          <p className="text-[11px] uppercase tracking-[0.3em] text-emerald-700">Status</p>
          <p className="mt-2 text-sm font-semibold text-emerald-900">Delivered</p>
        </div>
      </div>
    </div>
  );
}
// ── ETA countdown ──────────────────────────────────────────────────────────

function ETACountdown({ createdAt, status }: { createdAt: string; status: string }) {
  const ETA_MINUTES: Record<string, number> = {
    PLACED: 45, CONFIRMED: 40, PREPARING: 30, READY: 15, PICKED_UP: 12, ON_THE_WAY: 8,
  };
  const etaMins = ETA_MINUTES[status];
  if (!etaMins) return null;

  const [secs, setSecs] = useState(() => {
    const elapsed = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
    return Math.max(0, etaMins * 60 - elapsed);
  });

  useEffect(() => {
    if (secs <= 0) return;
    const t = setInterval(() => setSecs((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [secs]);

  const m = Math.floor(secs / 60);
  const s = secs % 60;

  return (
    <div
      className="rounded-2xl p-4 text-center"
      style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}
    >
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>Estimated Arrival</p>
      <div className="mt-2 flex items-center justify-center gap-2">
        <div className="rounded-xl px-3 py-2 min-w-[52px] text-center"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <p className="text-2xl font-black tabular-nums" style={{ color: 'var(--tx)' }}>{String(m).padStart(2,'0')}</p>
          <p className="text-[9px] font-semibold" style={{ color: 'var(--tx-3)' }}>MIN</p>
        </div>
        <span className="text-2xl font-black" style={{ color: 'var(--tx-3)' }}>:</span>
        <div className="rounded-xl px-3 py-2 min-w-[52px] text-center"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <p className="text-2xl font-black tabular-nums" style={{ color: 'var(--tx)' }}>{String(s).padStart(2,'0')}</p>
          <p className="text-[9px] font-semibold" style={{ color: 'var(--tx-3)' }}>SEC</p>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const router = useRouter();
  const [order, setOrder]           = useState<Order | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const [reordering, setReordering] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await customerOrdersApi.get(orderId);
        setOrder(res.data);
      } catch { setError('Failed to load order details.'); }
      finally { setLoading(false); }
    };
    load();
  }, [orderId]);

  // Live polling for active orders
  useEffect(() => {
    const ACTIVE = ['PLACED','CONFIRMED','PREPARING','READY','PICKED_UP','ON_THE_WAY'];
    if (!order || !ACTIVE.includes(order.status)) return;
    const interval = setInterval(async () => {
      try {
        const res = await customerOrdersApi.get(orderId);
        setOrder(res.data);
      } catch { /* silent */ }
    }, 15_000);
    return () => clearInterval(interval);
  }, [order?.status, orderId]);

  const handleReorder = async () => {
    setReordering(true);
    try {
      await customerOrdersApi.reorder(orderId);
      router.push('/customer/cart');
    } catch { setError('Failed to reorder.'); setReordering(false); }
  };

  const handleCancel = async () => {
    if (cancelReason.trim().length < 5) { setError('Please provide a reason (min 5 chars).'); return; }
    setCancelling(true);
    try {
      await customerOrdersApi.cancel(orderId, { reason: cancelReason });
      const res = await customerOrdersApi.get(orderId);
      setOrder(res.data); setShowCancel(false);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Cannot cancel this order.');
    } finally { setCancelling(false); }
  };

  if (loading) return (
    <div className="mx-auto max-w-lg px-4 pt-8 space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-32 animate-pulse rounded-3xl" style={{ background: 'var(--surface)' }} />
      ))}
    </div>
  );

  if (error && !order) return (
    <div className="mx-auto max-w-lg px-4 pt-12 text-center">
      <p className="text-4xl">😕</p>
      <p className="mt-4 font-semibold" style={{ color: 'var(--tx-2)' }}>{error}</p>
      <button onClick={() => router.back()} className="mt-4 text-sm font-semibold" style={{ color: 'var(--accent)' }}>Go back</button>
    </div>
  );
  if (!order) return null;

  const currentStepIdx = STEPS.findIndex((s) => s.key === order.status);
  const trackingStepIdx = getTrackingStepIndex(order.status);
  const partner = order.deliveryPartner ?? { name: 'Rajesh Kumar', rating: 4.8, bike: 'KA01AB1234', phone: undefined };
  const isCancellable  = ['PLACED','CONFIRMED'].includes(order.status);
  const isDelivered    = order.status === 'DELIVERED';
  const isCancelled    = order.status === 'CANCELLED';
  const isActive       = ['PLACED','CONFIRMED','PREPARING','READY','PICKED_UP','ON_THE_WAY'].includes(order.status);

  return (
    <div className="mx-auto max-w-5xl px-4 pt-5 pb-10 space-y-6">
      <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} className="flex flex-col gap-4 rounded-[2rem] border border-emerald-200/70 bg-emerald-50 p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700">Order confirmed</p>
          <h1 className="mt-2 text-3xl font-extrabold text-slate-950">Order #{order.orderNumber}</h1>
          <p className="mt-2 text-sm text-slate-600">Payment Method: {order.paymentMethod ?? 'Cash on Delivery (COD)'}</p>
        </div>
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-emerald-700 shadow-sm">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
      </motion.div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          {!isCancelled && (
            <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }} className="rounded-[2rem] border border-slate-200/70 bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-lg font-bold text-slate-950">Delivery Status</h2>
              <div className="space-y-4">
                {TRACKING_STEPS.map((step, index) => {
                  const done = index < trackingStepIdx;
                  const active = index === trackingStepIdx;
                  return (
                    <div key={step.key} className={`grid gap-4 rounded-[1.75rem] border p-4 transition ${done || active ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
                      <div className="flex items-start gap-4">
                        <div className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl ${done || active ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-500'}`}>
                          {step.icon}
                        </div>
                        <div className="min-w-0">
                          <p className={`font-semibold ${done || active ? 'text-slate-950' : 'text-slate-500'}`}>{step.title}</p>
                          <p className="mt-1 text-sm text-slate-500">{step.subtitle}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className={`inline-flex h-2.5 w-2.5 rounded-full ${done ? 'bg-emerald-500' : active ? 'bg-emerald-300' : 'bg-slate-300'}`} />
                        <span>{done ? 'Completed' : active ? 'Current' : 'Upcoming'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          <LiveTrackingCard />

          <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.12 }} className="rounded-[2rem] border border-slate-200/70 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-lg font-bold text-slate-950">Order details</h2>
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex justify-between"><span>Subtotal</span><span>₹{order.subtotal}</span></div>
              <div className="flex justify-between"><span>Delivery fee</span><span>{order.deliveryFee === 0 ? 'Free' : `₹${order.deliveryFee}`}</span></div>
              <div className="flex justify-between"><span>GST & Others</span><span>₹{order.taxAmount}</span></div>
              <div className="flex justify-between border-t pt-3 text-base font-bold text-slate-950"><span>Total Amount</span><span>₹{order.grandTotal}</span></div>
            </div>
          </motion.div>
        </div>

        <div className="space-y-6">
          <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.14 }} className="rounded-[2rem] border border-slate-200/70 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-slate-100 text-lg font-bold text-slate-700">
                {partner.name.slice(0, 1)}
              </div>
              <div>
                <p className="text-base font-semibold text-slate-950">{partner.name}</p>
                <p className="mt-1 text-sm text-slate-500">Bike • {partner.bike}</p>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between rounded-3xl bg-slate-50 p-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Rating</p>
                <p className="mt-2 text-base font-semibold text-slate-950">{partner.rating?.toFixed(1) ?? '4.8'} ⭐</p>
              </div>
              <button
                type="button"
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                Call Partner
              </button>
            </div>
          </motion.div>

          <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.16 }} className="rounded-[2rem] border border-slate-200/70 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-slate-950">Delivery Address</h2>
            {order.deliveryAddress ? (
              <div className="space-y-2 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <p className="font-semibold text-slate-950">{order.deliveryAddress.label}</p>
                <p className="text-sm text-slate-600">{order.deliveryAddress.addressLine1}</p>
                <p className="text-sm text-slate-500">{order.deliveryAddress.city}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Delivery address not available.</p>
            )}
          </motion.div>
        </div>
      </div>

      {order.specialInstructions && (
        <div className="rounded-[2rem] border border-slate-200/70 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500">Special instructions</p>
          <p className="mt-3 text-sm text-slate-600">{order.specialInstructions}</p>
        </div>
      )}

      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.18 }} className="flex flex-wrap gap-3">
        {isDelivered && (
          <>
            <button
              onClick={handleReorder}
              disabled={reordering}
              className="flex-1 rounded-2xl py-3 text-sm font-bold transition hover:opacity-80 disabled:opacity-60"
              style={{ background: 'var(--accent)', color: '#0D0906' }}
            >
              {reordering ? 'Adding to cart…' : '↩ Reorder'}
            </button>
            <Link
              href={`/customer/reviews/new/${orderId}`}
              className="flex-1 rounded-2xl py-3 text-center text-sm font-bold transition hover:opacity-80"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--tx)' }}
            >
              ⭐ Leave review
            </Link>
          </>
        )}
        {isCancellable && !showCancel && (
          <button
            onClick={() => setShowCancel(true)}
            className="w-full rounded-2xl py-3 text-sm font-bold transition hover:opacity-80"
            style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)' }}
          >
            Cancel order
          </button>
        )}
      </motion.div>

      <AnimatePresence>
        {showCancel && (
          <motion.div
            initial={{ opacity:0, height:0 }}
            animate={{ opacity:1, height:'auto' }}
            exit={{ opacity:0, height:0 }}
            className="overflow-hidden"
          >
            <div className="rounded-3xl p-5 space-y-3"
              style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)' }}>
              <p className="font-bold text-sm" style={{ color: 'var(--danger-text)' }}>Cancel order</p>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason for cancellation (min 5 characters)…"
                rows={3}
                className="w-full rounded-2xl px-3 py-2 text-sm outline-none"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--tx)' }}
              />
              <div className="flex gap-3">
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="flex-1 rounded-2xl py-2.5 text-sm font-bold transition hover:opacity-80 disabled:opacity-60 text-white"
                  style={{ background: '#dc2626' }}
                >
                  {cancelling ? 'Cancelling…' : 'Confirm cancel'}
                </button>
                <button
                  onClick={() => setShowCancel(false)}
                  className="flex-1 rounded-2xl py-2.5 text-sm font-bold transition hover:opacity-75"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--tx)' }}
                >
                  Go back
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}