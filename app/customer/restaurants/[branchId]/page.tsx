'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { customerDiscoveryApi, customerCartApi, customerOrdersApi, AddToCartPayload } from '../../../../lib/api';
import { getCustomerToken, clearCustomerTokens, isCustomerTokenValid } from '../../../../lib/customer-auth';
import { useCartContext } from '../../cart-context';

type Addon = { id: string; name: string; price: number; isRequired: boolean };
type PricingRule = {
  id: string;
  ruleType: 'DISCOUNT' | 'PRICE_OVERRIDE' | 'TIME_BASED';
  valueType: 'PERCENTAGE' | 'FLAT';
  value: number;
  title?: string;
  startsAt?: string;
  endsAt?: string;
};

type MenuItem = {
  id: string;
  name: string;
  description?: string;
  price: number;
  isVeg?: boolean;
  imageUrl?: string;
  addons?: Addon[];
  pricingRules?: PricingRule[];
  pricingRule?: PricingRule;
  pricing_rules?: PricingRule[];
  pricing_rule?: PricingRule;
  discount?: {
    valueType: 'PERCENTAGE' | 'FLAT';
    value: number;
    title?: string;
    startsAt?: string;
    endsAt?: string;
  };
};
type Category = { id: string; name: string; displayName: string; items: MenuItem[] };
type RestaurantInfo = { name: string; cuisine?: string; rating?: number; deliveryTime?: number; deliveryFee?: number; imageUrl?: string };

export default function RestaurantMenuPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const router = useRouter();
  const [info, setInfo] = useState<RestaurantInfo | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addingItem, setAddingItem] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [cartMap, setCartMap] = useState<Record<string, number>>({});
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [cartTotal, setCartTotal] = useState<number>(0);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [orderedMap, setOrderedMap] = useState<Record<string, number>>({});
  const { setCartCount } = useCartContext();

  const updateCartState = (items: any[]) => {
    const map: Record<string, number> = {};
    let total = 0;
    let count = 0;
    items.forEach((ci) => {
      const id = String(ci.menuItemId ?? ci.id ?? '');
      if (!id) return;
      const qty = Number(ci.quantity) || 1;
      map[id] = (map[id] || 0) + qty;
      const price = Number(ci.price ?? ci.unitPrice ?? ci.totalPrice ?? 0);
      total += price * qty;
      count += qty;
    });
    setCartMap(map);
    setCartItems(items);
    setCartTotal(total);
    setCartCount(count);
  };

  const fetchCart = async () => {
    if (!getCustomerToken() || !isCustomerTokenValid()) {
      clearCustomerTokens();
      setCartCount(0);
      return;
    }

    try {
      const cartRes = await customerCartApi.get();
      const citems: any[] = cartRes.data?.items ?? cartRes.data ?? [];
      updateCartState(Array.isArray(citems) ? citems : []);
    } catch (e: any) {
      if (e?.response?.status === 401) {
        clearCustomerTokens();
        setCartCount(0);
      }
    }
  };

  useEffect(() => {
    // Only validate if branchId is available (not during initial render)
    if (!branchId) {
      setLoading(false);
      return;
    }

    // If branchId is 'undefined' string, show error
    if (branchId === 'undefined') {
      setError('Invalid restaurant ID. Please select a restaurant from the discovery page.');
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const [detailRes, menuRes] = await Promise.all([
          customerDiscoveryApi.restaurantDetails(branchId),
          customerDiscoveryApi.menu(branchId),
        ]);
        
        // Normalize the response
        const restaurantInfo = detailRes.data;
        const menuData = menuRes.data;
        const rawCategories = Array.isArray(menuData?.categories) ? menuData.categories : Array.isArray(menuData) ? menuData : [];
        const normalizedCategories = rawCategories.map((cat: any) => ({
          ...cat,
          items: (Array.isArray(cat.items) ? cat.items : []).map((item: any) => ({
            ...item,
            pricingRules: item.pricingRules ?? item.pricing_rules ?? [],
            pricing_rules: item.pricingRules ?? item.pricing_rules ?? [],
            discount: item.discount,
            price: Number(item.price),
          })),
        }));
        setInfo(restaurantInfo);
        setCategories(normalizedCategories);
        setError('');
      } catch (err: any) {
        const errorMsg = err?.response?.data?.message || 'Failed to load restaurant details. Please try again.';
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };
    load();
    // load cart quantities and recent orders count (read-only)
    if (getCustomerToken() && isCustomerTokenValid()) {
      (async () => {
        await fetchCart();

        try {
          const ordersRes = await customerOrdersApi.history(1, 10);
          const raw = Array.isArray(ordersRes.data) ? ordersRes.data : (ordersRes.data?.orders ?? ordersRes.data?.data ?? []);
          const recent = raw.slice(0, 10);
          const oMap: Record<string, number> = {};
          await Promise.all(recent.map(async (o: any) => {
            try {
              const det = await customerOrdersApi.get(o.id ?? o.orderId ?? o.id);
              const items: any[] = det.data?.items ?? det.data ?? [];
              items.forEach((it) => {
                const keyById = String(it.menuItemId ?? it.id ?? '');
                const keyByName = String(it.name ?? '');
                const key = keyById || keyByName;
                if (!key) return;
                oMap[key] = (oMap[key] || 0) + (it.quantity ?? 1);
              });
            } catch { /* ignore per-order fetch errors */ }
          }));
          setOrderedMap(oMap);
        } catch (e) {
          // ignore orders fetch errors (non-invasive)
        }
      })();
    } else {
      clearCustomerTokens();
    }
  }, [branchId]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const normalizeDiscountRule = (raw: any): PricingRule => ({
    id: raw.id ?? raw.ruleId ?? raw.rule_id ?? `${raw.value}-${raw.valueType}`,
    ruleType: (String(raw.ruleType ?? raw.rule_type ?? raw.type ?? 'DISCOUNT')).toUpperCase() as PricingRule['ruleType'],
    valueType: (String(raw.valueType ?? raw.value_type ?? raw.valueType ?? 'PERCENTAGE')).toUpperCase() as PricingRule['valueType'],
    value: Number(raw.value ?? raw.amount ?? 0),
    title: raw.title ?? raw.name,
    startsAt: raw.startsAt ?? raw.starts_at,
    endsAt: raw.endsAt ?? raw.ends_at,
  });

  const getItemPricingRules = (item: MenuItem) => {
    const rules = [] as any[];
    if (item.pricingRules) rules.push(...(Array.isArray(item.pricingRules) ? item.pricingRules : [item.pricingRules]));
    if (item.pricing_rules) rules.push(...(Array.isArray(item.pricing_rules) ? item.pricing_rules : [item.pricing_rules]));
    if (item.pricingRule) rules.push(item.pricingRule);
    if (item.pricing_rule) rules.push(item.pricing_rule);
    if (item.discount && Number(item.discount.value) > 0) {
      rules.push({
        ruleType: 'DISCOUNT',
        valueType: item.discount.valueType,
        value: item.discount.value,
        title: item.discount.title,
        startsAt: item.discount.startsAt,
        endsAt: item.discount.endsAt,
      });
    }
    return rules.map(normalizeDiscountRule);
  };

  const isRuleActive = (rule: PricingRule) => {
    const now = new Date();
    if (rule.startsAt && new Date(rule.startsAt) > now) return false;
    if (rule.endsAt && new Date(rule.endsAt) < now) return false;
    return true;
  };

  const getActiveDiscountRule = (item: MenuItem) => {
    return getItemPricingRules(item)
      .filter((rule) => rule.ruleType === 'DISCOUNT' && isRuleActive(rule))
      .sort((a, b) => {
        const discountA = a.valueType === 'PERCENTAGE' ? a.value : Math.min(a.value, item.price);
        const discountB = b.valueType === 'PERCENTAGE' ? b.value : Math.min(b.value, item.price);
        return discountB - discountA;
      })[0];
  };

  const getDiscountedPrice = (item: MenuItem) => {
    const rule = getActiveDiscountRule(item);
    if (!rule) return item.price;
    if (rule.valueType === 'PERCENTAGE') {
      return Math.max(0, Number((item.price * (1 - rule.value / 100)).toFixed(2)));
    }
    return Math.max(0, Number((item.price - rule.value).toFixed(2)));
  };

  const getDiscountLabel = (item: MenuItem) => {
    const rule = getActiveDiscountRule(item);
    if (!rule) return null;
    if (rule.valueType === 'PERCENTAGE') {
      return `${rule.value}% OFF`;
    }
    return `₹${rule.value} OFF`;
  };

  const handleAddToCart = async (item: MenuItem) => {
    if (!getCustomerToken() || !isCustomerTokenValid()) {
      clearCustomerTokens();
      router.push('/customer/auth/login');
      return;
    }

    setAddingItem(item.id);
    const payload: AddToCartPayload = {
      menuItemId: String(item.id),
      branchId: branchId ? String(branchId) : undefined,
      quantity: 1,
    };
    try {
      await customerCartApi.addItem(payload);
      await fetchCart();
      showToast(`${item.name} added to cart`);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        clearCustomerTokens();
        router.push('/customer/auth/login');
        return;
      }
      const msg = err?.response?.data?.message ?? 'Failed to add item';
      showToast(msg);
    } finally {
      setAddingItem(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-40 animate-pulse rounded-[2rem] bg-slate-200" />
        {[...Array(3)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-200" />)}
      </div>
    );
  }

  if (error) {
    return <p className="py-16 text-center text-sm text-red-500">{error}</p>;
  }

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-xl">
          {toast}
        </div>
      )}

      {/* Restaurant hero */}
      {info && (
        <div className="mb-6 overflow-hidden rounded-[2rem] border border-slate-200/60 bg-white shadow-sm">
          {info.imageUrl && (
            <img src={info.imageUrl} alt={info.name} className="h-44 w-full object-cover" />
          )}
          <div className="p-5">
            <h1 className="text-2xl font-bold text-slate-950">{info.name}</h1>
            {info.cuisine && <p className="mt-1 text-sm text-slate-500">{info.cuisine}</p>}
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
              {info.rating != null && (
                <span className="flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 font-semibold text-green-700">
                  ★ {info.rating.toFixed(1)}
                </span>
              )}
              {info.deliveryTime != null && <span className="rounded-full bg-slate-100 px-3 py-1">{info.deliveryTime} min</span>}
              {info.deliveryFee != null && (
                <span className="rounded-full bg-slate-100 px-3 py-1">
                  {info.deliveryFee === 0 ? 'Free delivery' : `₹${info.deliveryFee} delivery`}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Menu */}
      {categories.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-400">Menu not available.</p>
      ) : (
        <div className="space-y-8">
          {categories.map((cat) => (
            <section key={cat.id}>
              <h2 className="mb-3 text-base font-bold uppercase tracking-wide text-slate-700">{cat.displayName || cat.name}</h2>
              <div className="space-y-3">
                {cat.items.map((item) => (
                  <div key={item.id}
                    className="flex items-center gap-4 rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm">
                    {item.imageUrl && (
                      <img src={item.imageUrl} alt={item.name} className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {item.isVeg != null && (
                          <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 text-[8px] ${item.isVeg ? 'border-green-600 text-green-600' : 'border-red-600 text-red-600'}`}>
                            {item.isVeg ? '●' : '●'}
                          </span>
                        )}
                        <p className="font-semibold text-slate-900">{item.name}</p>
                      </div>
                      {item.description && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{item.description}</p>
                      )}
                      <div className="mt-2 flex items-center gap-3">
                        <p className="font-bold text-[#B88A2E]">₹{getDiscountedPrice(item)}</p>
                        {getActiveDiscountRule(item) && (
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                            {getDiscountLabel(item)}
                          </span>
                        )}
                        {/* Read-only badges: cart quantity and recent ordered count */}
                        {(() => {
                          const cartQty = cartMap[String(item.id)] || 0;
                          const orderedQty = orderedMap[String(item.id)] || orderedMap[String(item.name)] || 0;
                          return (
                            <div className="ml-2 flex items-center gap-2">
                              {cartQty > 0 && (
                                <span className="rounded-full bg-[#B88A2E]/10 px-2 py-0.5 text-xs font-semibold text-[#B88A2E]">In cart: {cartQty}</span>
                              )}
                              {orderedQty > 0 && (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Ordered: {orderedQty}</span>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                      {getActiveDiscountRule(item) && (
                        <p className="mt-1 text-xs text-slate-400 line-through">₹{item.price}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleAddToCart(item)}
                      disabled={addingItem === item.id}
                      className="shrink-0 rounded-xl bg-[#B88A2E] px-4 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:opacity-60"
                    >
                      {addingItem === item.id ? '…' : '+ Add'}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {cartItems.length > 0 && (
        <>
          <div className="fixed bottom-6 right-6 z-40 hidden items-center gap-3 rounded-full bg-white/95 px-4 py-3 shadow-2xl shadow-slate-800/10 backdrop-blur-sm sm:flex">
            <button
              type="button"
              onClick={() => setCartDrawerOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-[#B88A2E] px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:brightness-110"
            >
              <span className="text-lg">🛒</span>
              Open Cart
            </button>
            <span className="rounded-full bg-[#B88A2E]/10 px-3 py-1 text-sm font-semibold text-[#B88A2E]">
              {cartItems.reduce((sum, ci) => sum + (Number(ci.quantity) || 1), 0)} items
            </span>
            <span className="text-sm font-semibold">₹{cartTotal.toFixed(2)}</span>
          </div>

          <div className={`fixed inset-0 z-50 ${cartDrawerOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
            <div
              className={`absolute inset-0 bg-slate-950/40 transition-opacity ${cartDrawerOpen ? 'opacity-100' : 'opacity-0'}`}
              onClick={() => setCartDrawerOpen(false)}
            />
            <div
              className={`absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl transition-transform duration-300 ${cartDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Your Cart</p>
                  <p className="text-xs text-slate-500">{cartItems.length} item{cartItems.length === 1 ? '' : 's'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCartDrawerOpen(false)}
                  className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-3 px-5 py-4">
                {cartItems.map((ci, index) => {
                  const quantity = Number(ci.quantity) || 1;
                  const itemPrice = Number(ci.price ?? ci.unitPrice ?? ci.totalPrice ?? 0);
                  return (
                    <div key={index} className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-3">
                      {ci.imageUrl ? (
                        <img src={ci.imageUrl} alt={ci.name ?? 'cart item'} className="h-16 w-16 rounded-2xl object-cover" />
                      ) : (
                        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-slate-200 text-xl">🍽️</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-900">{ci.name ?? ci.title ?? 'Item'}</p>
                        <p className="mt-1 text-sm text-slate-500">₹{itemPrice.toFixed(2)} × {quantity}</p>
                      </div>
                      <p className="text-sm font-semibold text-slate-900">₹{(itemPrice * quantity).toFixed(2)}</p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-auto border-t border-slate-200 px-5 py-4">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Item total</span>
                  <span className="font-semibold text-slate-900">₹{cartTotal.toFixed(2)}</span>
                </div>
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setCartDrawerOpen(false)}
                    className="flex-1 rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCartDrawerOpen(false);
                      router.push('/customer/cart');
                    }}
                    className="flex-1 rounded-3xl bg-[#B88A2E] px-4 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110"
                  >
                    View Cart
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}