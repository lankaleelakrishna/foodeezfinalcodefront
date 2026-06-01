'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { customerCartApi, customerProfileApi } from '../../../lib/api';

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
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'WALLET'>('COD');
  const [couponCode, setCouponCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [couponMsg, setCouponMsg] = useState('');

  const fetchCart = async () => {
    try {
      const res = await customerCartApi.get();
      setCart(res.data);
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
    if (!selectedAddressId) { setError('Please select a delivery address.'); return; }
    setPlacing(true);
    setError('');
    try {
      const { customerOrdersApi } = await import('../../../lib/api');
      const res = await customerOrdersApi.place({
        deliveryAddressId: selectedAddressId,
        paymentMethod,
      });
      const orderId = res.data?.orderId ?? res.data?.id;
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
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* Items */}
      <div>
        <h1 className="mb-4 text-2xl font-bold text-slate-950">Your cart</h1>
        <div className="space-y-3">
          {cart.items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 rounded-2xl border border-slate-200/60 bg-white p-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">{item.menuItemName}</p>
                {item.specialNote && <p className="mt-0.5 text-xs text-slate-400">{item.specialNote}</p>}
                <p className="mt-1 font-bold text-[#B88A2E]">₹{item.itemTotal}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-lg font-bold text-slate-700 transition hover:bg-slate-100">
                  −
                </button>
                <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[#B88A2E] text-lg font-bold text-slate-950 transition hover:brightness-110">
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Coupon */}
        <div className="mt-6 rounded-2xl border border-slate-200/60 bg-white p-4">
          <p className="mb-3 font-semibold text-slate-800">Coupon code</p>
          {cart.appliedCouponCode ? (
            <div className="flex items-center justify-between">
              <span className="rounded-xl bg-green-50 px-3 py-1.5 text-sm font-semibold text-green-700">
                {cart.appliedCouponCode} applied
              </span>
              <button onClick={handleRemoveCoupon}
                className="text-sm text-red-500 hover:underline">Remove</button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input type="text" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="Enter code"
                className="flex-1 rounded-2xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200" />
              <button onClick={handleApplyCoupon}
                className="rounded-2xl bg-[#B88A2E] px-4 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110">
                Apply
              </button>
            </div>
          )}
          {couponMsg && <p className={`mt-2 text-xs ${couponMsg.includes('!') ? 'text-green-600' : 'text-red-500'}`}>{couponMsg}</p>}
        </div>
      </div>

      {/* Summary + checkout */}
      <div className="space-y-4">
        {/* Price breakdown */}
        <div className="rounded-[1.5rem] border border-slate-200/60 bg-white p-5">
          <p className="mb-3 font-bold text-slate-900">Bill summary</p>
          <div className="space-y-2 text-sm text-slate-600">
            <div className="flex justify-between"><span>Subtotal</span><span>₹{cart.subtotal}</span></div>
            <div className="flex justify-between"><span>Delivery fee</span><span>{cart.deliveryFee === 0 ? 'Free' : `₹${cart.deliveryFee}`}</span></div>
            <div className="flex justify-between"><span>Packaging</span><span>₹{cart.packagingFee}</span></div>
            <div className="flex justify-between"><span>Taxes</span><span>₹{cart.taxAmount}</span></div>
            {cart.surgeFee > 0 && <div className="flex justify-between"><span>Surge fee</span><span>₹{cart.surgeFee}</span></div>}
            {cart.couponDiscount > 0 && (
              <div className="flex justify-between text-green-600"><span>Coupon discount</span><span>−₹{cart.couponDiscount}</span></div>
            )}
          </div>
          <div className="mt-3 flex justify-between border-t border-slate-100 pt-3 font-bold text-slate-900">
            <span>Grand total</span><span>₹{cart.grandTotal}</span>
          </div>
        </div>

        {/* Address */}
        <div className="rounded-[1.5rem] border border-slate-200/60 bg-white p-5">
          <p className="mb-3 font-bold text-slate-900">Delivery address</p>
          {addresses.length === 0 ? (
            <p className="text-sm text-slate-500">
              No addresses saved.{' '}
              <a href="/customer/profile" className="text-[#B88A2E] hover:underline">Add one</a>
            </p>
          ) : (
            <div className="space-y-2">
              {addresses.map((addr) => (
                <label key={addr.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${selectedAddressId === addr.id ? 'border-[#B88A2E] bg-amber-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <input type="radio" name="address" value={addr.id} checked={selectedAddressId === addr.id}
                    onChange={() => setSelectedAddressId(addr.id)} className="mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-800">{addr.label}</p>
                    <p className="text-xs text-slate-500">{addr.addressLine1}, {addr.city}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Payment method */}
        <div className="rounded-[1.5rem] border border-slate-200/60 bg-white p-5">
          <p className="mb-3 font-bold text-slate-900">Payment method</p>
          <div className="flex gap-3">
            {(['COD', 'WALLET'] as const).map((m) => (
              <label key={m}
                className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${paymentMethod === m ? 'border-[#B88A2E] bg-amber-50 text-slate-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                <input type="radio" name="payment" value={m} checked={paymentMethod === m}
                  onChange={() => setPaymentMethod(m)} className="sr-only" />
                {m === 'COD' ? 'Cash on delivery' : 'Wallet'}
              </label>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button onClick={handlePlaceOrder} disabled={placing}
          className="w-full rounded-2xl bg-[#B88A2E] py-4 text-base font-bold text-slate-950 shadow-lg transition hover:brightness-110 disabled:opacity-60">
          {placing ? 'Placing order…' : `Place order · ₹${cart.grandTotal}`}
        </button>
      </div>
    </div>
  );
}