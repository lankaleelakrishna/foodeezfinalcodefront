'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGuard from '../../../components/AuthGuard';
import { adminOrdersApi } from '../../../../lib/api';

type OrderItem = {
  id: string;
  name: string;
  quantity: number;
  price: number;
  addons?: { name: string; price: number }[];
};

type HistoryEntry = {
  status: string;
  createdAt: string;
  note?: string;
};

type OrderDetail = {
  id: string;
  status: string;
  totalAmount: number;
  subtotal?: number;
  deliveryFee?: number;
  discount?: number;
  specialInstructions?: string;
  paymentMethod?: string;
  restaurant?: { name: string; id: string };
  customer?: { name: string; email: string; phone: string; id: string };
  deliveryAddress?: string | { addressLine1: string; city: string; state: string; pincode: string };
  items: OrderItem[];
  history?: HistoryEntry[];
  createdAt: string;
};

const STATUS_COLORS: Record<string, string> = {
  PLACED:     'bg-blue-100 text-blue-700',
  CONFIRMED:  'bg-sky-100 text-sky-700',
  PREPARING:  'bg-amber-100 text-amber-700',
  READY:      'bg-violet-100 text-violet-700',
  PICKED_UP:  'bg-orange-100 text-orange-700',
  DELIVERED:  'bg-emerald-100 text-emerald-700',
  CANCELLED:  'bg-rose-100 text-rose-700',
};

function formatAddress(addr: OrderDetail['deliveryAddress']): string {
  if (!addr) return '—';
  if (typeof addr === 'string') return addr;
  return `${addr.addressLine1}, ${addr.city}, ${addr.state} ${addr.pincode}`;
}

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const router = useRouter();

  const [order, setOrder]     = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    adminOrdersApi.get(orderId)
      .then(({ data }) => setOrder(data))
      .catch(() => setError('Failed to load order.'))
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) return (
    <AuthGuard requiredRoles={['super_admin']}>
      <div className="rounded-2xl bg-white p-8 text-slate-500 shadow-sm">Loading…</div>
    </AuthGuard>
  );

  if (error || !order) return (
    <AuthGuard requiredRoles={['super_admin']}>
      <div className="rounded-2xl bg-rose-50 p-6 text-rose-700">{error || 'Order not found.'}</div>
    </AuthGuard>
  );

  return (
    <AuthGuard requiredRoles={['super_admin']}>
      <div className="space-y-6">

        {/* Header */}
        <div className="rounded-3xl bg-white p-8 shadow-lg">
          <button onClick={() => router.back()} className="mb-4 text-sm text-slate-400 hover:text-slate-600 transition">
            ← Back to Orders
          </button>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold">Order</h1>
              <p className="mt-1 font-mono text-sm text-slate-400">{order.id}</p>
              <p className="mt-1 text-slate-500">{new Date(order.createdAt).toLocaleString()}</p>
            </div>
            <span className={`w-fit rounded-full px-4 py-1 text-sm font-medium ${STATUS_COLORS[order.status] ?? 'bg-slate-100 text-slate-600'}`}>
              {order.status}
            </span>
          </div>
        </div>

        {/* Customer + Restaurant */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Customer</h2>
            {order.customer ? (
              <>
                <p
                  className="font-medium text-slate-900 cursor-pointer hover:underline"
                  onClick={() => order.customer && router.push(`/admin/customers/${order.customer.id}`)}
                >
                  {order.customer.name || '—'}
                </p>
                <p className="text-sm text-slate-500">{order.customer.email}</p>
                <p className="text-sm text-slate-500">{order.customer.phone}</p>
              </>
            ) : <p className="text-slate-500">—</p>}
            {order.deliveryAddress && (
              <p className="mt-3 text-sm text-slate-600">{formatAddress(order.deliveryAddress)}</p>
            )}
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Restaurant</h2>
            <p className="font-medium text-slate-900">{order.restaurant?.name ?? '—'}</p>
            {order.paymentMethod && (
              <p className="mt-2 text-sm text-slate-500">Payment: <span className="font-medium text-slate-700">{order.paymentMethod}</span></p>
            )}
            {order.specialInstructions && (
              <p className="mt-2 text-sm text-slate-600">Note: {order.specialInstructions}</p>
            )}
          </div>
        </div>

        {/* Items */}
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">Items</h2>
          {order.items && order.items.length > 0 ? (
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-start justify-between border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium text-slate-900">{item.name}</p>
                    {item.addons && item.addons.length > 0 && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        + {item.addons.map((a) => a.name).join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-slate-500">×{item.quantity}</p>
                    <p className="font-medium text-slate-900">₹{(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500">No item details available.</p>
          )}

          {/* Totals */}
          <div className="mt-4 space-y-1 border-t border-slate-100 pt-4 text-sm">
            {order.subtotal != null && (
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span><span>₹{order.subtotal.toFixed(2)}</span>
              </div>
            )}
            {order.deliveryFee != null && (
              <div className="flex justify-between text-slate-600">
                <span>Delivery Fee</span><span>₹{order.deliveryFee.toFixed(2)}</span>
              </div>
            )}
            {order.discount != null && order.discount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount</span><span>−₹{order.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-100 pt-2 font-semibold text-slate-900">
              <span>Total</span><span>₹{(order.totalAmount ?? 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Timeline */}
        {order.history && order.history.length > 0 && (
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold">Order Timeline</h2>
            <ol className="relative border-l border-slate-200 space-y-4 ml-3">
              {order.history.map((h, i) => (
                <li key={i} className="ml-4">
                  <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-white bg-slate-400" />
                  <p className="text-sm font-medium text-slate-900">{h.status.replace(/_/g, ' ')}</p>
                  {h.note && <p className="text-xs text-slate-500">{h.note}</p>}
                  <time className="text-xs text-slate-400">{new Date(h.createdAt).toLocaleString()}</time>
                </li>
              ))}
            </ol>
          </div>
        )}

      </div>
    </AuthGuard>
  );
}
