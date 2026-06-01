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
  specialInstructions?: string; createdAt: string;
  items: OrderItem[]; statusHistory?: StatusEntry[];
  deliveryAddress?: DeliveryAddr; restaurantName?: string;
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
  const isCancellable  = ['PLACED','CONFIRMED'].includes(order.status);
  const isDelivered    = order.status === 'DELIVERED';
  const isCancelled    = order.status === 'CANCELLED';
  const isActive       = ['PLACED','CONFIRMED','PREPARING','READY','PICKED_UP','ON_THE_WAY'].includes(order.status);

  return (
    <div className="mx-auto max-w-lg px-4 pt-5 pb-10 space-y-4">

      {/* Back + title */}
      <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-full transition hover:opacity-70"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--tx-2)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div>
          <h1 className="font-extrabold" style={{ color: 'var(--tx)', fontSize: 17 }}>
            {order.restaurantName ?? `Order #${order.orderNumber}`}
          </h1>
          <p className="text-xs" style={{ color: 'var(--tx-3)' }}>#{order.orderNumber}</p>
        </div>
      </motion.div>

      {/* Error banner */}
      {error && (
        <div className="rounded-2xl border px-4 py-3 text-sm"
          style={{ background: 'var(--danger-bg)', borderColor: 'var(--danger-border)', color: 'var(--danger-text)' }}>
          {error}
        </div>
      )}

      {/* ETA countdown (active orders) */}
      {isActive && <motion.div initial={{ opacity:0, scale:0.96 }} animate={{ opacity:1, scale:1 }} transition={{ delay:0.1 }}>
        <ETACountdown createdAt={order.createdAt} status={order.status} />
      </motion.div>}

      {/* Status timeline ─────────────────────────────────────────── */}
      {!isCancelled && (
        <motion.div
          initial={{ opacity:0, y:16 }}
          animate={{ opacity:1, y:0 }}
          transition={{ delay:0.12 }}
          className="overflow-hidden rounded-3xl p-5"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <p className="mb-4 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--tx-3)' }}>Order Progress</p>

          <div className="space-y-0">
            {STEPS.map((step, i) => {
              const done    = i < currentStepIdx;
              const current = i === currentStepIdx;
              const future  = i > currentStepIdx;
              return (
                <div key={step.key} className="flex gap-4">
                  {/* Timeline line + dot */}
                  <div className="flex flex-col items-center">
                    <motion.div
                      initial={false}
                      animate={{
                        background: done || current
                          ? (current ? 'var(--accent)' : 'var(--accent-2)')
                          : 'var(--surface-2)',
                        borderColor: done || current ? 'var(--accent)' : 'var(--border)',
                      }}
                      className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm transition-all duration-500"
                    >
                      {done ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      ) : current ? (
                        <span>{step.emoji}</span>
                      ) : (
                        <span className="text-xs font-bold" style={{ color: 'var(--tx-3)' }}>{i + 1}</span>
                      )}
                      {current && (
                        <span
                          className="absolute inset-0 rounded-full animate-glow-ring"
                          style={{ border: '2px solid var(--accent)' }}
                        />
                      )}
                    </motion.div>
                    {i < STEPS.length - 1 && (
                      <div
                        className="my-1 w-0.5 flex-1 transition-all duration-700"
                        style={{
                          minHeight: 20,
                          background: done
                            ? 'var(--accent-2)'
                            : 'linear-gradient(to bottom, var(--border) 0%, var(--border-sub) 100%)',
                        }}
                      />
                    )}
                  </div>

                  {/* Label */}
                  <div className={`pb-4 pt-1.5 ${i === STEPS.length - 1 ? 'pb-0' : ''}`}>
                    <p
                      className="text-sm font-bold transition-colors"
                      style={{ color: done || current ? 'var(--tx)' : 'var(--tx-3)' }}
                    >
                      {step.label}
                    </p>
                    {current && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-xs"
                        style={{ color: 'var(--accent)' }}
                      >
                        {step.desc}
                      </motion.p>
                    )}
                    {/* Timestamp from history */}
                    {order.statusHistory?.find((h) => h.status === step.key) && (
                      <p className="text-[10px]" style={{ color: 'var(--tx-3)' }}>
                        {new Date(order.statusHistory.find((h) => h.status === step.key)!.timestamp).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Cancelled banner */}
      {isCancelled && (
        <motion.div
          initial={{ opacity:0 }} animate={{ opacity:1 }}
          className="flex items-center gap-3 rounded-2xl p-4"
          style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)' }}
        >
          <span className="text-2xl">❌</span>
          <div>
            <p className="font-bold" style={{ color: 'var(--danger-text)' }}>Order Cancelled</p>
            <p className="text-xs" style={{ color: 'var(--danger-text)', opacity: 0.75 }}>
              Ordered on {new Date(order.createdAt).toLocaleDateString()}
            </p>
          </div>
        </motion.div>
      )}

      {/* Items ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.15 }}
        className="overflow-hidden rounded-3xl p-5"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <p className="mb-4 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--tx-3)' }}>
          {order.restaurantName ?? 'Items ordered'}
        </p>
        <div className="space-y-2">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black shrink-0"
                  style={{ background: 'var(--surface-2)', color: 'var(--tx-2)' }}
                >
                  ×{item.quantity}
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--tx)' }}>{item.name}</p>
              </div>
              <p className="text-sm font-bold" style={{ color: 'var(--tx)' }}>₹{item.subtotal}</p>
            </div>
          ))}
        </div>

        {/* Price breakdown */}
        <div className="mt-4 space-y-1.5 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
          {[
            { label: 'Subtotal',  val: `₹${order.subtotal}` },
            { label: 'Delivery',  val: order.deliveryFee === 0 ? 'Free' : `₹${order.deliveryFee}` },
            { label: 'Tax',       val: `₹${order.taxAmount}` },
          ].map(({ label, val }) => (
            <div key={label} className="flex justify-between text-xs" style={{ color: 'var(--tx-2)' }}>
              <span>{label}</span><span>{val}</span>
            </div>
          ))}
          <div className="flex justify-between border-t pt-2 font-black" style={{ borderColor: 'var(--border)', color: 'var(--tx)', fontSize: 15 }}>
            <span>Total</span>
            <span style={{ color: 'var(--accent)' }}>₹{order.grandTotal}</span>
          </div>
        </div>
      </motion.div>

      {/* Delivery address */}
      {order.deliveryAddress && (
        <motion.div
          initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.18 }}
          className="flex items-start gap-3 rounded-2xl p-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base"
            style={{ background: 'var(--surface-2)' }}>
            📍
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--tx-3)' }}>Delivering to</p>
            <p className="mt-0.5 text-sm font-semibold" style={{ color: 'var(--tx)' }}>{order.deliveryAddress.label}</p>
            <p className="text-xs" style={{ color: 'var(--tx-3)' }}>
              {order.deliveryAddress.addressLine1}, {order.deliveryAddress.city}
            </p>
          </div>
        </motion.div>
      )}

      {/* Special instructions */}
      {order.specialInstructions && (
        <div className="rounded-2xl p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--tx-3)' }}>Note to restaurant</p>
          <p className="text-sm italic" style={{ color: 'var(--tx-2)' }}>"{order.specialInstructions}"</p>
        </div>
      )}

      {/* Actions */}
      <motion.div
        initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.22 }}
        className="flex flex-wrap gap-3"
      >
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

      {/* Cancel form */}
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
