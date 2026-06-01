'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGuard from '../../../components/AuthGuard';
import { restaurantOrdersApi } from '../../../../lib/api';

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
  orderNumber?: string;
  subtotal?: number;
  deliveryFee?: number;
  discount?: number;
  specialInstructions?: string;
  paymentMethod?: string;
  restaurant?: { name?: string; id?: string } | string;
  branch?: { name?: string } | string;
  customer?: { name?: string; email?: string; phone?: string; id?: string };
  deliveryAddress?: string | { addressLine1?: string; city?: string; state?: string; pincode?: string };
  items?: OrderItem[];
  history?: HistoryEntry[];
  createdAt: string;
  totalAmount?: number;
};

const STATUS_COLORS: Record<string, string> = {
  PLACED: 'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-sky-100 text-sky-700',
  PREPARING: 'bg-amber-100 text-amber-700',
  READY_FOR_PICKUP: 'bg-violet-100 text-violet-700',
  PICKED_UP: 'bg-orange-100 text-orange-700',
  ON_THE_WAY: 'bg-amber-200 text-amber-800',
  DELIVERED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-rose-100 text-rose-700',
  FAILED: 'bg-slate-100 text-slate-700',
};

function formatAddress(address: OrderDetail['deliveryAddress']) {
  if (!address) return '—';
  if (typeof address === 'string') return address;
  return `${address.addressLine1 ?? ''}${address.city ? `, ${address.city}` : ''}${address.state ? `, ${address.state}` : ''}${address.pincode ? ` ${address.pincode}` : ''}`.trim();
}

export default function RestaurantOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const router = useRouter();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orderId) return;
    setLoading(true);
    restaurantOrdersApi.get(orderId)
      .then(({ data }) => setOrder(data))
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

  const restaurantName = typeof order.restaurant === 'string' ? order.restaurant : order.restaurant?.name ?? '—';
  const branchName = typeof order.branch === 'string' ? order.branch : order.branch?.name ?? '—';

  return (
    <AuthGuard requiredRoles={['restaurant_owner', 'restaurant_admin', 'restaurant_manager', 'restaurant_staff', 'super_admin', 'sales_operator']}>
      <div className="space-y-6">
        <div className="rounded-3xl bg-white p-8 shadow-lg">
          <button onClick={() => router.back()} className="mb-4 text-sm text-slate-400 hover:text-slate-600 transition">← Back to Orders</button>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold">Order Details</h1>
              <p className="mt-1 font-mono text-sm text-slate-400">{order.orderNumber || order.id}</p>
              <p className="mt-1 text-slate-500">{new Date(order.createdAt).toLocaleString()}</p>
            </div>
            <span className={`w-fit rounded-full px-4 py-1 text-sm font-medium ${STATUS_COLORS[order.status] ?? 'bg-slate-100 text-slate-600'}`}>
              {order.status}
            </span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Customer</h2>
            <p className="font-medium text-slate-900">{order.customer?.name ?? '—'}</p>
            <p className="text-sm text-slate-500">{order.customer?.email ?? '—'}</p>
            <p className="text-sm text-slate-500">{order.customer?.phone ?? '—'}</p>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Restaurant / Branch</h2>
            <p className="font-medium text-slate-900">{restaurantName}</p>
            <p className="text-sm text-slate-500">{branchName}</p>
            {order.paymentMethod && (
              <p className="mt-3 text-sm text-slate-600">Payment: <span className="font-semibold text-slate-900">{order.paymentMethod}</span></p>
            )}
            {order.specialInstructions && (
              <p className="mt-2 text-sm text-slate-600">Note: {order.specialInstructions}</p>
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">Items</h2>
          {order.items && order.items.length > 0 ? (
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-start justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium text-slate-900">{item.name}</p>
                    <p className="text-sm text-slate-500">Qty {item.quantity}</p>
                    {item.addons && item.addons.length > 0 && (
                      <p className="mt-1 text-xs text-slate-400">Add-ons: {item.addons.map((addon) => addon.name).join(', ')}</p>
                    )}
                  </div>
                  <div className="text-right text-sm text-slate-700">
                    ₹{(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500">No order items available.</p>
          )}

          <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-600">
            {order.subtotal != null && (
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{order.subtotal.toFixed(2)}</span>
              </div>
            )}
            {order.deliveryFee != null && (
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span>₹{order.deliveryFee.toFixed(2)}</span>
              </div>
            )}
            {order.discount != null && order.discount > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Discount</span>
                <span>−₹{order.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-100 pt-3 font-semibold text-slate-900">
              <span>Total</span>
              <span>₹{Number(order.totalAmount ?? 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {order.history && order.history.length > 0 && (
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold">Order Timeline</h2>
            <ol className="relative border-l border-slate-200 space-y-4 ml-3">
              {order.history.map((entry, index) => (
                <li key={index} className="ml-4">
                  <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-white bg-slate-400" />
                  <p className="text-sm font-semibold text-slate-900">{entry.status}</p>
                  {entry.note && <p className="text-sm text-slate-500">{entry.note}</p>}
                  <time className="text-xs text-slate-400">{new Date(entry.createdAt).toLocaleString()}</time>
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">Delivery Address</h2>
          <p className="text-sm text-slate-600">{formatAddress(order.deliveryAddress)}</p>
        </div>
      </div>
    </AuthGuard>
  );
}
