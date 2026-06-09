'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGuard from '../../../components/AuthGuard';
import { restaurantOrdersApi } from '../../../../lib/api';

type OrderItem = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  itemTotal?: number;
  selectedAddons?: { name: string; price: number }[];
  specialNote?: string;
};

type HistoryEntry = {
  status: string;
  createdAt: string;
  note?: string;
};

type AddressSnapshot = {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  landmark?: string;
};

type OrderDetail = {
  id: string;
  status: string;
  orderNumber?: string;
  subtotal?: number;
  deliveryFee?: number;
  packagingFee?: number;
  taxAmount?: number;
  couponDiscount?: number;
  grandTotal?: number;
  specialInstructions?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  couponCode?: string;
  restaurant?: { name?: string; id?: string } | string;
  branch?: { name?: string; id?: string } | string;
  customer?: { name?: string; email?: string; phone?: string; id?: string };
  deliveryAddressSnapshot?: AddressSnapshot | string;
  items?: OrderItem[];
  statusHistory?: HistoryEntry[];
  createdAt: string | Date;
};

// ── Status config ──────────────────────────────────────────────────────────────

const STATUS_PILL: Record<string, string> = {
  PLACED:           'bg-amber-100 text-amber-700 border-amber-200',
  CONFIRMED:        'bg-sky-100 text-sky-700 border-sky-200',
  PREPARING:        'bg-violet-100 text-violet-700 border-violet-200',
  READY_FOR_PICKUP: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  PICKED_UP:        'bg-orange-100 text-orange-700 border-orange-200',
  ON_THE_WAY:       'bg-amber-100 text-amber-800 border-amber-200',
  DELIVERED:        'bg-emerald-100 text-emerald-800 border-emerald-200',
  CANCELLED:        'bg-rose-100 text-rose-700 border-rose-200',
  FAILED:           'bg-slate-100 text-slate-600 border-slate-200',
};

// Next action(s) the restaurant can take from each status
type ActionDef = {
  label: string;
  nextStatus: string;
  style: 'primary' | 'danger' | 'secondary';
  icon: string;
};

const STATUS_ACTIONS: Record<string, ActionDef[]> = {
  PLACED: [
    { label: 'Accept Order',       nextStatus: 'CONFIRMED', style: 'primary', icon: '✓' },
    { label: 'Reject Order',       nextStatus: 'CANCELLED', style: 'danger',  icon: '✕' },
  ],
  CONFIRMED: [
    { label: 'Start Preparing',    nextStatus: 'PREPARING',        style: 'primary',   icon: '🍳' },
    { label: 'Cancel Order',       nextStatus: 'CANCELLED',        style: 'danger',    icon: '✕' },
  ],
  PREPARING: [
    { label: 'Mark Ready for Pickup', nextStatus: 'READY_FOR_PICKUP', style: 'primary', icon: '✓' },
  ],
};

const ACTION_BANNER: Record<string, { bg: string; border: string; text: string; sub: string }> = {
  PLACED: {
    bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.35)',
    text: 'New order awaiting your confirmation',
    sub: 'Accept to start preparation or reject if you cannot fulfill it.',
  },
  CONFIRMED: {
    bg: 'rgba(56,189,248,0.08)', border: 'rgba(56,189,248,0.30)',
    text: 'Order confirmed — ready to start cooking?',
    sub: 'Tap "Start Preparing" when the kitchen begins work.',
  },
  PREPARING: {
    bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.30)',
    text: 'Kitchen is preparing this order',
    sub: 'Tap "Mark Ready" once the food is packed and ready for pickup.',
  },
  READY_FOR_PICKUP: {
    bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.30)',
    text: 'Food is ready — waiting for delivery partner',
    sub: 'A delivery partner will pick up the order shortly.',
  },
};

function formatAddress(address: AddressSnapshot | string | undefined | null) {
  if (!address) return '—';
  if (typeof address === 'string') return address;
  const parts = [
    address.addressLine1,
    address.addressLine2,
    address.city,
    address.state,
    address.pincode,
    address.landmark ? `(${address.landmark})` : undefined,
  ].filter(Boolean);
  return parts.join(', ') || '—';
}

// ── Action panel ───────────────────────────────────────────────────────────────

function ActionPanel({ order, onUpdated }: { order: OrderDetail; onUpdated: (o: OrderDetail) => void }) {
  const actions = STATUS_ACTIONS[order.status];
  const banner  = ACTION_BANNER[order.status];
  const [busy, setBusy] = useState<string | null>(null);
  const [err,  setErr]  = useState('');

  if (!actions && !banner) return null;

  const handleAction = async (action: ActionDef) => {
    setBusy(action.nextStatus);
    setErr('');
    try {
      const res = await restaurantOrdersApi.updateStatus(order.id, action.nextStatus);
      onUpdated(res.data);
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      setErr(Array.isArray(msg) ? msg.join(' ') : (msg ?? 'Failed to update order status.'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      className="rounded-2xl border p-5 space-y-4"
      style={{ background: banner?.bg ?? 'var(--surface-2)', borderColor: banner?.border ?? 'var(--border)' }}
    >
      {banner && (
        <div>
          <p className="font-semibold text-slate-900">{banner.text}</p>
          <p className="mt-0.5 text-sm text-slate-500">{banner.sub}</p>
        </div>
      )}

      {err && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{err}</div>
      )}

      {actions && (
        <div className="flex flex-wrap gap-3">
          {actions.map((action) => (
            <button
              key={action.nextStatus}
              disabled={!!busy}
              onClick={() => handleAction(action)}
              className={[
                'inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed',
                action.style === 'primary'   ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm' : '',
                action.style === 'danger'    ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-sm'       : '',
                action.style === 'secondary' ? 'border border-slate-200 text-slate-700 hover:bg-slate-50' : '',
              ].filter(Boolean).join(' ')}
            >
              <span>{action.icon}</span>
              {busy === action.nextStatus ? 'Updating…' : action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Timeline dot ───────────────────────────────────────────────────────────────

function TimelineDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PLACED: '#f59e0b', CONFIRMED: '#0ea5e9', PREPARING: '#8b5cf6',
    READY_FOR_PICKUP: '#10b981', PICKED_UP: '#f97316', ON_THE_WAY: '#f59e0b',
    DELIVERED: '#10b981', CANCELLED: '#f43f5e', FAILED: '#94a3b8',
  };
  return (
    <div
      className="absolute -left-[7px] mt-1 h-3.5 w-3.5 rounded-full border-2 border-white"
      style={{ background: colors[status] ?? '#94a3b8' }}
    />
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RestaurantOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const router = useRouter();

  const [order,   setOrder]   = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!orderId) return;
    setLoading(true);
    restaurantOrdersApi.get(orderId)
      .then(({ data }) => {
        const raw = data?.order ?? data?.data ?? data;
        setOrder(raw);
      })
      .catch(() => setError('Failed to load order details.'))
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) {
    return (
      <AuthGuard requiredRoles={['restaurant_owner', 'restaurant_admin', 'restaurant_manager', 'restaurant_staff', 'super_admin', 'sales_operator']}>
        <div className="rounded-2xl bg-white p-8 text-slate-500 shadow-sm">Loading order…</div>
      </AuthGuard>
    );
  }

  if (error || !order) {
    return (
      <AuthGuard requiredRoles={['restaurant_owner', 'restaurant_admin', 'restaurant_manager', 'restaurant_staff', 'super_admin', 'sales_operator']}>
        <div className="rounded-2xl bg-rose-50 p-6 text-rose-700">{error || 'Order not found.'}</div>
      </AuthGuard>
    );
  }

  const raw = order as any;

  // Restaurant name — backend may use nested object or flat string fields
  const restaurantName =
    (typeof order.restaurant === 'string' ? order.restaurant : order.restaurant?.name) ||
    raw.restaurantName || raw.restaurantLabel || raw.restaurant_name || '—';

  // Branch name
  const branchName =
    (typeof order.branch === 'string' ? order.branch : order.branch?.name) ||
    raw.branchName || raw.branchLabel || raw.branch_name || '—';

  // Customer fields
  const customerName  = order.customer?.name  || raw.customerName  || raw.customer_name  || '—';
  const customerPhone = order.customer?.phone || raw.customerPhone || raw.customer_phone || '';
  const customerEmail = order.customer?.email || raw.customerEmail || raw.customer_email || '';
  const customerContact = customerPhone || customerEmail || '—';

  // Items — backend may use orderItems, order_items, or items
  const orderItems: OrderItem[] = order.items ?? raw.orderItems ?? raw.order_items ?? [];

  // Total
  const totalAmount = order.grandTotal ?? raw.grandTotal ?? raw.totalAmount ?? raw.amount ?? 0;

  // Subtotal / fees / discount
  const subtotal    = order.subtotal    ?? raw.sub_total    ?? 0;
  const deliveryFee = order.deliveryFee ?? raw.delivery_fee ?? 0;
  const discount    = order.couponDiscount ?? raw.couponDiscount ?? raw.discount ?? raw.discount_amount ?? 0;

  // Delivery address — backend stores it as deliveryAddressSnapshot
  const deliveryAddr: AddressSnapshot | string | undefined =
    order.deliveryAddressSnapshot ?? raw.deliveryAddress ?? raw.address ?? raw.delivery_address;

  const pillCls = STATUS_PILL[order.status] ?? 'bg-slate-100 text-slate-600 border-slate-200';

  return (
    <AuthGuard requiredRoles={['restaurant_owner', 'restaurant_admin', 'restaurant_manager', 'restaurant_staff', 'super_admin', 'sales_operator']}>
      <div className="space-y-5">

        {/* ── Header ── */}
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <button onClick={() => router.back()} className="mb-4 flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back to Orders
          </button>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                {order.orderNumber ?? `#${order.id.slice(-8).toUpperCase()}`}
              </h1>
              <p className="mt-1 text-sm text-slate-400">{new Date(order.createdAt).toLocaleString()}</p>
            </div>
            <span className={`w-fit rounded-full border px-4 py-1 text-sm font-semibold ${pillCls}`}>
              {order.status.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {/* ── Action panel — most prominent element ── */}
        <ActionPanel order={order} onUpdated={setOrder} />

        {/* ── Customer + Restaurant ── */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Customer</p>
            <p className="font-semibold text-slate-900">{customerName}</p>
            <p className="mt-0.5 text-sm text-slate-500">{customerContact}</p>
            {customerEmail && customerPhone && (
              <p className="text-sm text-slate-400">{customerEmail}</p>
            )}
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Branch</p>
            <p className="font-semibold text-slate-900">{restaurantName}</p>
            <p className="mt-0.5 text-sm text-slate-500">{branchName}</p>
            {order.paymentMethod && (
              <p className="mt-2.5 text-sm text-slate-600">
                Payment: <span className="font-semibold text-slate-900">{order.paymentMethod}</span>
              </p>
            )}
            {order.specialInstructions && (
              <div className="mt-2.5 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2">
                <p className="text-xs font-semibold text-amber-700">Customer note</p>
                <p className="mt-0.5 text-sm text-amber-800">{order.specialInstructions}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Items ── */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">Order Items</p>
          {orderItems.length > 0 ? (
            <div className="space-y-3">
              {orderItems.map((item, idx) => (
                <div key={item.id ?? idx} className="flex items-start justify-between gap-3 border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                        {item.quantity}
                      </span>
                      <p className="font-medium text-slate-900">{item.name}</p>
                    </div>
                    {item.selectedAddons && item.selectedAddons.length > 0 && (
                      <p className="ml-8 mt-0.5 text-xs text-slate-400">
                        + {item.selectedAddons.map((a) => a.name).join(', ')}
                      </p>
                    )}
                    {item.specialNote && (
                      <p className="ml-8 mt-0.5 text-xs text-amber-600">Note: {item.specialNote}</p>
                    )}
                  </div>
                  <p className="shrink-0 font-medium text-slate-700">
                    ₹{Number(item.itemTotal ?? item.unitPrice * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No items available.</p>
          )}

          <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
            {subtotal > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span><span>₹{Number(subtotal).toFixed(2)}</span>
              </div>
            )}
            {deliveryFee > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Delivery Fee</span><span>₹{Number(deliveryFee).toFixed(2)}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Discount</span><span>−₹{Number(discount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-100 pt-3 font-semibold text-slate-900">
              <span>Total</span><span>₹{Number(totalAmount).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* ── Delivery address ── */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Delivery Address</p>
          <p className="text-sm text-slate-700">{formatAddress(deliveryAddr)}</p>
        </div>

        {/* ── Timeline ── */}
        {order.statusHistory && order.statusHistory.length > 0 && (
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">Order Timeline</p>
            <ol className="relative ml-3 space-y-5 border-l border-slate-200">
              {order.statusHistory.map((entry, i) => (
                <li key={i} className="relative ml-5 pl-2">
                  <TimelineDot status={entry.status} />
                  <p className="text-sm font-semibold text-slate-900">{entry.status.replace(/_/g, ' ')}</p>
                  {entry.note && <p className="text-sm text-slate-500">{entry.note}</p>}
                  <time className="text-xs text-slate-400">{new Date(entry.createdAt).toLocaleString()}</time>
                </li>
              ))}
            </ol>
          </div>
        )}

      </div>
    </AuthGuard>
  );
}
