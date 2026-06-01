'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { customerCartApi, customerProfileApi } from '../../../lib/api';
import { useCartContext } from '../cart-context';

type CartItem = {
  id: string;
  menuItemId: string;
  menuItemName: string;
  unitPrice: number;
  quantity: number;
  specialNote?: string;
  itemTotal: number;
  selectedAddons?: { addonId: string; quantity: number }[];
};

type Cart = {
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  packagingFee: number;
  taxAmount: number;
  surgeFee: number;
  couponDiscount: number;
  grandTotal: number;
  appliedCouponCode?: string;
};

type Address = { id: string; label: string; addressLine1: string; city: string; isDefault?: boolean };

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'WALLET' | ''>('');
  const [couponCode, setCouponCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [couponMsg, setCouponMsg] = useState('');
  const { setCartCount } = useCartContext();

  const normalizeCartItems = (data: any): CartItem[] =>
    Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];

  const updateCartCount = (data: any) => {
    const items = normalizeCartItems(data);
    setCartCount(items.reduce((sum: number, item: CartItem) => sum + (Number(item?.quantity) || 1), 0));
  };

  const fetchCart = async () => {
    try {
      const res = await customerCartApi.get();
      setCart(res.data);
      updateCartCount(res.data);
    } catch {
      setError('Failed to load cart.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await fetchCart();
      try {
        const res = await customerProfileApi.getAddresses();
        const list: Address[] = res.data?.addresses ?? res.data ?? [];
        setAddresses(list);
        const def = list.find((a) => a.isDefault);
        if (def) setSelectedAddressId(def.id);
      } catch { /* ignore */ }
    };
    init();
  }, []);

  const updateQuantity = async (itemId: string, quantity: number) => {
    try {
      await customerCartApi.updateItem(itemId, quantity);
      await fetchCart();
    } catch { setError('Failed to update item.'); }
  };

  const removeItem = async (itemId: string) => {
    try {
      await customerCartApi.removeItem(itemId);
      await fetchCart();
    } catch { setError('Failed to remove item.'); }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponMsg('');
    try {
      await customerCartApi.applyCoupon(couponCode.toUpperCase());
      setCouponMsg('Coupon applied!');
      await fetchCart();
    } catch (err: any) {
      setCouponMsg(err?.response?.data?.message ?? 'Invalid coupon.');
    }
  };

  const handleRemoveCoupon = async () => {
    try {
      await customerCartApi.removeCoupon();
      setCouponCode('');
      setCouponMsg('');
      await fetchCart();
    } catch { /* ignore */ }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      setError('Please select a delivery address.');
      return;
    }
    if (!paymentMethod) {
      setError('Please select a payment method before placing your order.');
      return;
    }
    setPlacing(true);
    setError('');
    try {
      const { customerOrdersApi } = await import('../../../lib/api');
      const res = await customerOrdersApi.place({
        deliveryAddressId: selectedAddressId,
        paymentMethod,
      });
      const orderId = res.data?.orderId ?? res.data?.id;
      setCartCount(0);
      router.push(orderId ? `/customer/orders/${orderId}` : '/customer/orders');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to place order.');
    } finally {
      setPlacing(false);
    }
  };

  if (loading) return <div className="py-16 text-center text-sm text-slate-400">Loading cart…</div>;

  if (!cart || cart.items.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-5xl">🛒</p>
        <p className="mt-4 text-lg font-semibold text-slate-700">Your cart is empty</p>
        <button onClick={() => router.push('/customer/discovery')}
          className="mt-6 rounded-2xl bg-[#B88A2E] px-6 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110">
          Explore restaurants
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.8fr_390px]">
      <div className="space-y-6">
        <div className="rounded-[2rem] border border-slate-200/70 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4 pb-4 sm:pb-6">
            <div>
              <h1 className="text-xl font-bold text-slate-950">Order Summary</h1>
              <p className="mt-1 text-sm text-slate-500">Review your items before placing the order</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">{cart.items.length} item{cart.items.length === 1 ? '' : 's'}</span>
          </div>
          <div className="space-y-4">
            {cart.items.map((item) => (
              <div key={item.id} className="grid gap-4 rounded-[1.5rem] border border-slate-200/70 bg-slate-50 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-sm font-semibold text-slate-600 shadow-sm">
                    x{item.quantity}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-slate-950">{item.menuItemName}</p>
                    <p className="mt-1 text-sm text-slate-500">Qty: {item.quantity}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3 sm:flex-row sm:items-center">
                  <p className="text-lg font-bold text-slate-950">₹{item.itemTotal}</p>
                  <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 border border-slate-200 shadow-sm">
                    <button
                      onClick={() => item.quantity > 1 ? updateQuantity(item.id, item.quantity - 1) : removeItem(item.id)}
                      className="flex h-6 w-6 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 transition text-lg"
                    >
                      −
                    </button>
                    <span className="w-6 text-center font-semibold text-slate-900 text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="flex h-6 w-6 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 transition text-lg"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200/70 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-bold text-slate-950">Delivery Address</h2>
          {addresses.length === 0 ? (
            <div className="rounded-[1.5rem] bg-slate-50 p-5 text-sm text-slate-500">
              No addresses saved. <a href="/customer/profile" className="font-semibold text-[#B88A2E] hover:underline">Add one</a>
            </div>
          ) : (
            <div className="space-y-3">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  onClick={() => setSelectedAddressId(addr.id)}
                  className={`group flex flex-col gap-4 rounded-[1.5rem] border p-4 transition ${selectedAddressId === addr.id ? 'border-[#B88A2E] bg-amber-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{addr.label}</p>
                      <p className="mt-2 text-sm text-slate-500">{addr.addressLine1}</p>
                      <p className="mt-1 text-sm text-slate-500">{addr.city}</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); router.push('/customer/profile'); }}
                      className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[2rem] border border-slate-200/70 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-bold text-slate-950">Payment Method</h2>
          {!paymentMethod && (
            <p className="mb-4 text-sm text-slate-500">Please choose a payment option before placing your order.</p>
          )}
          <div className="space-y-3">
            <label className={`flex items-center justify-between gap-4 rounded-[1.5rem] border p-4 transition ${paymentMethod === 'WALLET' ? 'border-[#B88A2E] bg-amber-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}>
              <div>
                <p className="font-semibold text-slate-900">UPI Payment</p>
                <p className="mt-1 text-sm text-slate-500">Pay using Google Pay, PhonePe, or BHIM</p>
              </div>
              <input type="radio" name="payment" value="WALLET" checked={paymentMethod === 'WALLET'}
                onChange={() => setPaymentMethod('WALLET')} className="h-4 w-4 text-[#B88A2E]" />
            </label>
            <label className={`flex items-center justify-between gap-4 rounded-[1.5rem] border p-4 transition ${paymentMethod === 'COD' ? 'border-[#B88A2E] bg-amber-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}>
              <div>
                <p className="font-semibold text-slate-900">Cash on Delivery</p>
                <p className="mt-1 text-sm text-slate-500">Pay when your order arrives at your door</p>
              </div>
              <input type="radio" name="payment" value="COD" checked={paymentMethod === 'COD'}
                onChange={() => setPaymentMethod('COD')} className="h-4 w-4 text-[#B88A2E]" />
            </label>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-[2rem] border border-slate-200/70 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-slate-950">Price Details</h2>
          <div className="space-y-3 text-sm text-slate-600">
            <div className="flex justify-between"><span>Subtotal ({cart.items.length} item{cart.items.length === 1 ? '' : 's'})</span><span>₹{cart.subtotal}</span></div>
            <div className="flex justify-between"><span>Delivery Fee</span><span>{cart.deliveryFee === 0 ? '₹0' : `₹${cart.deliveryFee}`}</span></div>
            <div className="flex justify-between"><span>GST & Others</span><span>₹{cart.taxAmount}</span></div>
          </div>
          <div className="mt-6 rounded-[1.5rem] bg-slate-50 p-4">
            <div className="flex items-center justify-between text-base font-bold text-slate-950">
              <span>Total Amount</span>
              <span className="text-2xl text-[#B88A2E]">₹{cart.grandTotal}</span>
            </div>
          </div>
          <button
            onClick={handlePlaceOrder}
            disabled={placing || !paymentMethod}
            className="mt-6 flex w-full items-center justify-center rounded-3xl bg-[#B88A2E] px-5 py-4 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {placing
              ? 'Placing order…'
              : paymentMethod
                ? `Place Order (${paymentMethod === 'COD' ? 'Cash on Delivery' : 'UPI'})`
                : 'Select payment method'}
          </button>
          {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
        </div>
      </div>
    </div>
  );
}