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

const ACTIVE_STATUSES = ['PLACED','CONFIRMED','PREPARING','READY','PICKED_UP','ON_THE_WAY'];

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  PLACED:     { label: 'Order Placed',    color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  emoji: '📝' },
  CONFIRMED:  { label: 'Confirmed',       color: '#818cf8', bg: 'rgba(129,140,248,0.12)', emoji: '✅' },
  PREPARING:  { label: 'Preparing',       color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  emoji: '👨‍🍳' },
  READY:      { label: 'Ready',           color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  emoji: '🛍️' },
  PICKED_UP:  { label: 'Picked Up',       color: '#f97316', bg: 'rgba(249,115,22,0.12)',  emoji: '🏍️' },
  ON_THE_WAY: { label: 'On the Way',      color: '#fb923c', bg: 'rgba(251,146,60,0.12)',  emoji: '🚀' },
  DELIVERED:  { label: 'Delivered',       color: '#4ade80', bg: 'rgba(74,222,128,0.12)',  emoji: '🎉' },
  CANCELLED:  { label: 'Cancelled',       color: '#f87171', bg: 'rgba(248,113,113,0.12)', emoji: '❌' },
};

// ── Active order progress bar ──────────────────────────────────────────────

const STEPS = ['PLACED','CONFIRMED','PREPARING','READY','PICKED_UP','ON_THE_WAY','DELIVERED'];
const STEP_LABELS = ['Placed','Confirmed','Preparing','Ready','Picked up','On the way','Delivered'];

function ActiveProgressBar({ status }: { status: string }) {
  const idx = STEPS.indexOf(status);
  const pct = idx < 0 ? 0 : Math.round((idx / (STEPS.length - 1)) * 100);
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between text-[10px] mb-1.5"
        style={{ color: 'rgba(255,255,255,0.45)' }}>
        <span>Placed</span>
        <span>On the way</span>
        <span>Delivered</span>
      </div>
      <div className="relative h-1.5 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
        <motion.div
          className="absolute left-0 top-0 h-full rounded-full"
          style={{ background: 'linear-gradient(90deg,var(--accent) 0%,var(--accent-bright) 100%)' }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: [0.34, 1.56, 0.64, 1] }}
        />
        {/* Moving dot */}
        <motion.div
          className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2"
          style={{
            background: 'var(--accent-bright)',
            borderColor: '#0D0906',
            left: `calc(${pct}% - 6px)`,
          }}
          initial={{ left: 0 }}
          animate={{ left: `calc(${pct}% - 6px)` }}
          transition={{ duration: 1.2, ease: [0.34, 1.56, 0.64, 1] }}
        />
      </div>
      <p className="mt-1.5 text-xs font-semibold" style={{ color: 'var(--accent-bright)' }}>
        {STATUS_CFG[status]?.emoji} {STATUS_CFG[status]?.label ?? status.replace(/_/g,' ')}
      </p>
    </div>
  );
}

// ── Order card ─────────────────────────────────────────────────────────────

function OrderCard({ order, index }: { order: Order; index: number }) {
  const cfg     = STATUS_CFG[order.status] ?? { label: order.status, color: 'var(--tx-2)', bg: 'var(--surface-2)', emoji: '📦' };
  const isActive = ACTIVE_STATUSES.includes(order.status);

  if (isActive) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.06 }}
        whileHover={{ y: -3 }}
      >
        <Link
          href={`/customer/orders/${order.id}`}
          className="block overflow-hidden rounded-3xl"
          style={{ background: 'linear-gradient(135deg,#1A0800 0%,#3A1200 80%,#2A0E00 100%)', border: '1px solid rgba(212,175,55,0.22)' }}
        >
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest"
                  style={{ background: 'rgba(212,175,55,0.18)', color: 'var(--accent)' }}>
                  🔴 LIVE
                </span>
                <p className="mt-2 font-bold text-white">
                  {order.restaurantName ?? `Order #${order.orderNumber}`}
                </p>
                <p className="text-xs text-white/45">#{order.orderNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-black" style={{ color: 'var(--accent-bright)' }}>₹{order.grandTotal}</p>
                {order.itemCount != null && (
                  <p className="text-xs text-white/40">{order.itemCount} items</p>
                )}
              </div>
            </div>
            <ActiveProgressBar status={order.status} />
          </div>
          <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-[10px] text-white/35">{new Date(order.createdAt).toLocaleString()}</p>
            <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>Track order →</span>
          </div>
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -2 }}
    >
      <Link
        href={`/customer/orders/${order.id}`}
        className="block overflow-hidden rounded-2xl transition-shadow hover:shadow-lg"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-4 p-4">
          {/* Status icon */}
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl"
            style={{ background: cfg.bg }}>
            {cfg.emoji}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate font-bold" style={{ color: 'var(--tx)', fontSize: 14 }}>
                {order.restaurantName ?? `Order #${order.orderNumber}`}
              </p>
              <p className="shrink-0 font-black" style={{ color: 'var(--accent)', fontSize: 14 }}>₹{order.grandTotal}</p>
            </div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <p className="text-[10px]" style={{ color: 'var(--tx-3)' }}>
                #{order.orderNumber} · {new Date(order.createdAt).toLocaleDateString()}
              </p>
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                style={{ background: cfg.bg, color: cfg.color }}
              >
                {cfg.label}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const [orders, setOrders]   = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [page, setPage]       = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [tab, setTab]         = useState<FilterTab>('all');

  const normalizeOrders = (raw: any): Order[] => {
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.orders)) return raw.orders;
    if (Array.isArray(raw?.data?.orders)) return raw.data.orders;
    if (Array.isArray(raw?.data)) return raw.data;
    return [];
  };

  const fetchOrders = async (p: number) => {
    setLoading(true);
    try {
      const res = await customerOrdersApi.history(p, 15);
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
    { key: 'all',    label: 'All'       },
    { key: 'active', label: `Live${activeCount > 0 ? ` (${activeCount})` : ''}` },
    { key: 'past',   label: 'Past'      },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 pb-8">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--tx)' }}>Your Orders</h1>
        <p className="mt-0.5 text-sm" style={{ color: 'var(--tx-3)' }}>
          {orders.length > 0 ? `${orders.length} total orders` : 'All your deliveries, in one place'}
        </p>
      </motion.div>

      {/* Filter tabs */}
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
            style={{ color: tab === t.key ? (t.key === 'active' ? '#fb923c' : 'var(--tx)') : 'var(--tx-3)' }}
          >
            {tab === t.key && (
              <motion.div
                layoutId="tab-bg"
                className="absolute inset-0 rounded-xl"
                style={{ background: 'var(--surface-2)' }}
              />
            )}
            <span className="relative z-10">{t.label}</span>
          </button>
        ))}
      </motion.div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-2xl border px-4 py-3 text-sm"
          style={{ background: 'var(--danger-bg)', borderColor: 'var(--danger-border)', color: 'var(--danger-text)' }}>
          {error}
        </div>
      )}

      {/* Content */}
      {loading && orders.length === 0 ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl" style={{ background: 'var(--surface)' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-24 text-center"
        >
          <p className="text-5xl">{tab === 'active' ? '🛵' : '📦'}</p>
          <p className="mt-4 font-bold" style={{ color: 'var(--tx-2)' }}>
            {tab === 'active' ? 'No active orders right now' : 'No orders yet'}
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--tx-3)' }}>
            {tab === 'active' ? 'Place an order to track it here' : 'Your order history will appear here'}
          </p>
          <Link
            href="/customer/discovery"
            className="mt-5 inline-block rounded-full px-6 py-2.5 text-sm font-bold transition hover:opacity-80"
            style={{ background: 'var(--accent)', color: '#0D0906' }}
          >
            Order now
          </Link>
        </motion.div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="space-y-3"
          >
            {filtered.map((order, i) => (
              <OrderCard key={order.id} order={order} index={i} />
            ))}
            {hasMore && tab === 'all' && (
              <button
                onClick={loadMore}
                disabled={loading}
                className="w-full rounded-2xl py-3 text-sm font-semibold transition hover:opacity-80 disabled:opacity-50"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--tx-2)' }}
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
