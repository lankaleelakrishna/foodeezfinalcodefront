'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { customerOrdersApi } from '../../../lib/api';
import { getCustomerToken } from '../../../lib/customer-auth';

// ── Types ──────────────────────────────────────────────────────────────────

type Order = {
  id: string; orderNumber: string; status: string;
  grandTotal: number; createdAt: string;
  itemCount?: number; restaurantName?: string;
};

type FilterTab = 'all' | 'active' | 'past';

// ── Status config ──────────────────────────────────────────────────────────

const ACTIVE_STATUSES = ['PLACED', 'CONFIRMED', 'PREPARING', 'READY', 'PICKED_UP', 'ON_THE_WAY'];

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  PLACED:     { label: 'Order Placed',  color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  emoji: '📝' },
  CONFIRMED:  { label: 'Confirmed',     color: '#818cf8', bg: 'rgba(129,140,248,0.12)', emoji: '✅' },
  PREPARING:  { label: 'Preparing',     color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  emoji: '👨‍🍳' },
  READY:      { label: 'Ready',         color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  emoji: '🛍️' },
  PICKED_UP:  { label: 'Picked Up',     color: '#f97316', bg: 'rgba(249,115,22,0.12)',  emoji: '🏍️' },
  ON_THE_WAY: { label: 'On the Way',    color: '#fb923c', bg: 'rgba(251,146,60,0.12)',  emoji: '🚀' },
  DELIVERED:  { label: 'Delivered',     color: '#4ade80', bg: 'rgba(74,222,128,0.12)',  emoji: '🎉' },
  CANCELLED:  { label: 'Cancelled',     color: '#f87171', bg: 'rgba(248,113,113,0.12)', emoji: '❌' },
};

// ── Progress steps ─────────────────────────────────────────────────────────

const STEPS = ['PLACED', 'CONFIRMED', 'PREPARING', 'READY', 'PICKED_UP', 'ON_THE_WAY', 'DELIVERED'];

function ActiveProgressBar({ status }: { status: string }) {
  const idx = STEPS.indexOf(status);
  const pct = idx < 0 ? 0 : Math.round((idx / (STEPS.length - 1)) * 100);
  const cfg = STATUS_CFG[status];

  return (
    <div className="mt-4">
      {/* Step labels */}
      <div className="flex items-center justify-between mb-2" style={{ color: 'rgba(255,255,255,0.38)', fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        <span>Placed</span>
        <span>On the way</span>
        <span>Delivered</span>
      </div>

      {/* Track */}
      <div className="relative h-1.5 overflow-visible rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
        <motion.div
          className="absolute left-0 top-0 h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, var(--accent) 0%, var(--accent-bright) 100%)' }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: [0.34, 1.56, 0.64, 1] }}
        />
        {/* Moving dot */}
        <motion.div
          className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2"
          style={{
            background: 'var(--accent-bright)',
            borderColor: 'rgba(0,0,0,0.4)',
            boxShadow: '0 0 8px var(--accent-glow)',
          }}
          initial={{ left: '0%' }}
          animate={{ left: `calc(${pct}% - 7px)` }}
          transition={{ duration: 1.2, ease: [0.34, 1.56, 0.64, 1] }}
        />
      </div>

      {/* Current status */}
      <div className="mt-2.5 flex items-center gap-2">
        <span className="text-sm">{cfg?.emoji}</span>
        <p className="text-xs font-bold" style={{ color: 'var(--accent-bright)' }}>
          {cfg?.label ?? status.replace(/_/g, ' ')}
        </p>
      </div>
    </div>
  );
}

// ── Active order card (live) ────────────────────────────────────────────────

function ActiveOrderCard({ order, index }: { order: Order; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      whileHover={{ y: -4 }}
    >
      <Link
        href={`/customer/orders/${order.id}`}
        className="block overflow-hidden rounded-2xl no-underline"
        style={{
          background: 'linear-gradient(135deg, var(--accent-2) 0%, var(--accent) 60%, color-mix(in srgb, var(--accent) 80%, #000) 100%)',
          border: '1px solid color-mix(in srgb, var(--accent) 40%, transparent)',
          boxShadow: '0 8px 32px var(--accent-muted)',
        }}
      >
        {/* Top section */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {/* LIVE badge */}
              <div className="mb-2 flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span
                    className="absolute inline-flex h-full w-full rounded-full opacity-75"
                    style={{ background: '#FCA5A5', animation: 'live-pulse 1.4s ease-out infinite' }}
                  />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: '#EF4444' }} />
                </span>
                <span
                  className="text-[9px] font-black uppercase tracking-widest"
                  style={{ color: 'rgba(255,255,255,0.7)' }}
                >
                  Live tracking
                </span>
              </div>

              <p className="truncate font-bold text-white" style={{ fontSize: 15 }}>
                {order.restaurantName ?? `Order #${order.orderNumber}`}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                #{order.orderNumber}
              </p>
            </div>

            <div className="text-right shrink-0">
              <p className="text-xl font-black text-white">₹{order.grandTotal}</p>
              {order.itemCount != null && (
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
                </p>
              )}
            </div>
          </div>

          <ActiveProgressBar status={order.status} />
        </div>

        {/* Bottom footer */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}
        >
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {new Date(order.createdAt).toLocaleString()}
          </p>
          <div className="flex items-center gap-1 text-xs font-bold text-white">
            Track order
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ── Past order card ─────────────────────────────────────────────────────────

function PastOrderCard({ order, index }: { order: Order; index: number }) {
  const cfg = STATUS_CFG[order.status] ?? {
    label: order.status.replace(/_/g, ' '),
    color: 'var(--tx-2)',
    bg: 'var(--surface-2)',
    emoji: '📦',
  };

  const formattedDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
  const formattedTime = new Date(order.createdAt).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -2 }}
    >
      <Link
        href={`/customer/orders/${order.id}`}
        className="block overflow-hidden rounded-2xl transition-shadow hover:shadow-lg no-underline"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-4 p-4">
          {/* Status icon */}
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl"
            style={{ background: cfg.bg, border: `1px solid ${cfg.color}30` }}
          >
            {cfg.emoji}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="truncate font-bold leading-snug" style={{ color: 'var(--tx)', fontSize: 14 }}>
                {order.restaurantName ?? `Order #${order.orderNumber}`}
              </p>
              <p className="shrink-0 font-black" style={{ color: 'var(--tx)', fontSize: 14 }}>
                ₹{order.grandTotal}
              </p>
            </div>

            <div className="mt-1.5 flex items-center justify-between gap-2">
              <p className="text-[10px]" style={{ color: 'var(--tx-3)' }}>
                #{order.orderNumber} · {formattedDate}, {formattedTime}
              </p>
              <span
                className="shrink-0 rounded-lg px-2 py-0.5 font-bold uppercase tracking-wider"
                style={{ background: cfg.bg, color: cfg.color, fontSize: 9 }}
              >
                {cfg.label}
              </span>
            </div>

            {order.itemCount != null && (
              <p className="mt-1 text-[10px]" style={{ color: 'var(--tx-3)' }}>
                {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
              </p>
            )}
          </div>

          {/* Chevron */}
          <svg
            className="shrink-0"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--tx-3)"
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </div>
      </Link>
    </motion.div>
  );
}

// ── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({ tab }: { tab: FilterTab }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="py-24 text-center"
    >
      <div
        className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full"
        style={{ background: 'var(--surface-2)' }}
      >
        <span className="text-5xl">{tab === 'active' ? '🛵' : '📦'}</span>
      </div>
      <p className="text-lg font-bold" style={{ color: 'var(--tx)' }}>
        {tab === 'active' ? 'No active orders' : 'No orders yet'}
      </p>
      <p className="mt-1 text-sm" style={{ color: 'var(--tx-3)' }}>
        {tab === 'active'
          ? 'Place an order to track it in real-time here'
          : 'Your order history will appear here'}
      </p>
      <Link
        href="/customer/discovery"
        className="mt-5 inline-block rounded-xl px-6 py-2.5 text-sm font-bold transition hover:opacity-80 no-underline"
        style={{
          background: 'var(--accent)',
          color: 'white',
          boxShadow: '0 4px 16px var(--accent-muted)',
        }}
      >
        Browse restaurants →
      </Link>
    </motion.div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const [orders, setOrders]   = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [page, setPage]       = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [tab, setTab]         = useState<FilterTab>('all');

  const normalizeOrders = (raw: any): Order[] => {
    if (Array.isArray(raw))             return raw;
    if (Array.isArray(raw?.orders))     return raw.orders;
    if (Array.isArray(raw?.data?.orders)) return raw.data.orders;
    if (Array.isArray(raw?.data))       return raw.data;
    return [];
  };

  const fetchOrders = async (p: number) => {
    setLoading(true);
    try {
      const res  = await customerOrdersApi.history(p, 15);
      const data = normalizeOrders(res.data);
      setOrders((prev) => (p === 1 ? data : [...prev, ...data]));
      setHasMore(data.length === 15);
    } catch { setError('Failed to load orders.'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!getCustomerToken()) { setLoading(false); setError('Sign in to view orders.'); return; }
    fetchOrders(1);
  }, []);

  const loadMore = () => { const next = page + 1; setPage(next); fetchOrders(next); };

  const filtered = tab === 'all'
    ? orders
    : tab === 'active'
      ? orders.filter((o) => ACTIVE_STATUSES.includes(o.status))
      : orders.filter((o) => !ACTIVE_STATUSES.includes(o.status));

  const activeCount = orders.filter((o) => ACTIVE_STATUSES.includes(o.status)).length;

  const TABS: { key: FilterTab; label: string }[] = [
    { key: 'all',    label: 'All orders' },
    { key: 'active', label: `Live${activeCount > 0 ? ` · ${activeCount}` : ''}` },
    { key: 'past',   label: 'Past' },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 pb-8 sm:px-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        {/* Accent bar + title */}
        <div className="flex items-center gap-3 mb-1">
          <div
            className="h-6 w-1 rounded-full shrink-0"
            style={{ background: 'linear-gradient(180deg, var(--accent-bright), var(--accent-2))' }}
          />
          <h1 className="text-2xl font-black" style={{ color: 'var(--tx)' }}>Your Orders</h1>
        </div>
        <p className="ml-4 text-sm" style={{ color: 'var(--tx-3)' }}>
          {orders.length > 0
            ? `${orders.length} total order${orders.length === 1 ? '' : 's'}`
            : 'All your deliveries, in one place'}
        </p>
      </motion.div>

      {/* ── Filter tabs ─────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-6 flex gap-1 rounded-2xl p-1"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="relative flex-1 rounded-xl py-2 text-xs font-bold transition-all duration-200"
            style={{ color: tab === t.key ? 'var(--accent)' : 'var(--tx-3)' }}
          >
            {tab === t.key && (
              <motion.div
                layoutId="tab-bg"
                className="absolute inset-0 rounded-xl"
                style={{
                  background: 'var(--accent-muted)',
                  border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
                }}
              />
            )}
            <span className="relative z-10">{t.label}</span>
          </button>
        ))}
      </motion.div>

      {/* ── Error ────────────────────────────────────────────────────────────── */}
      {error && (
        <div
          className="mb-4 rounded-xl border px-4 py-3 text-sm"
          style={{
            background: 'var(--danger-bg)',
            borderColor: 'var(--danger-border)',
            color: 'var(--danger-text)',
          }}
        >
          {error}
        </div>
      )}

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      {loading && orders.length === 0 ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-20 shimmer rounded-2xl"
              style={{ border: '1px solid var(--border)' }}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState tab={tab} />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            {filtered.map((order, i) =>
              ACTIVE_STATUSES.includes(order.status) ? (
                <ActiveOrderCard key={order.id} order={order} index={i} />
              ) : (
                <PastOrderCard key={order.id} order={order} index={i} />
              ),
            )}

            {hasMore && tab === 'all' && (
              <button
                onClick={loadMore}
                disabled={loading}
                className="w-full rounded-xl py-3 text-sm font-semibold transition hover:opacity-80 disabled:opacity-50"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--tx-2)',
                }}
              >
                {loading ? 'Loading…' : 'Load more orders'}
              </button>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
