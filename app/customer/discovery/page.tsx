'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { customerDiscoveryApi, NearbyParams, resolveMediaUrl } from '../../../lib/api';
import { getCustomerName } from '../../../lib/customer-auth';

// ── Types ──────────────────────────────────────────────────────────────────

type Restaurant = {
  id?: string; branchId?: string; name: string;
  cuisine?: string; rating?: number; deliveryTime?: number;
  deliveryFee?: number; imageUrl?: string; isVeg?: boolean; distance?: number;
};

// ── Static data ────────────────────────────────────────────────────────────

const CATEGORIES = [
  { emoji: '🍛', label: 'Biryani',   q: 'biryani', from: '#B45309', to: '#92400E' },
  { emoji: '🍕', label: 'Pizza',     q: 'pizza',   from: '#BE185D', to: '#9D174D' },
  { emoji: '🍔', label: 'Burgers',   q: 'burger',  from: '#D97706', to: '#B45309' },
  { emoji: '🌮', label: 'Wraps',     q: 'wrap',    from: '#059669', to: '#047857' },
  { emoji: '🥗', label: 'Healthy',   q: 'salad',   from: '#16A34A', to: '#15803D' },
  { emoji: '🍣', label: 'Sushi',     q: 'sushi',   from: '#0369A1', to: '#075985' },
  { emoji: '🍰', label: 'Desserts',  q: 'dessert', from: '#9333EA', to: '#7E22CE' },
  { emoji: '☕', label: 'Café',      q: 'coffee',  from: '#78350F', to: '#5C2D0E' },
  { emoji: '🍜', label: 'Noodles',   q: 'noodles', from: '#DC2626', to: '#B91C1C' },
  { emoji: '🥐', label: 'Bakery',    q: 'bakery',  from: '#D97706', to: '#92400E' },
  { emoji: '🍗', label: 'Chicken',   q: 'chicken', from: '#EA580C', to: '#C2410C' },
  { emoji: '🥘', label: 'Curries',   q: 'curry',   from: '#B45309', to: '#78350F' },
];

const OFFERS = [
  {
    title: '50% OFF', sub: 'On your first order', tag: 'NEW USER',
    gradient: 'linear-gradient(135deg, #92400E 0%, #7C2D12 100%)',
    glowColor: 'rgba(217,119,6,0.35)', emoji: '🎉',
  },
  {
    title: 'FREE Delivery', sub: 'Orders above ₹299', tag: 'LIMITED',
    gradient: 'linear-gradient(135deg, #3730A3 0%, #4C1D95 100%)',
    glowColor: 'rgba(99,102,241,0.35)', emoji: '🚀',
  },
  {
    title: '₹100 Cashback', sub: 'Apply code FEAST100', tag: 'HOT DEAL',
    gradient: 'linear-gradient(135deg, #991B1B 0%, #7F1D1D 100%)',
    glowColor: 'rgba(239,68,68,0.35)', emoji: '💰',
  },
  {
    title: '2× Points',  sub: 'On top restaurants', tag: 'WEEKEND',
    gradient: 'linear-gradient(135deg, #155E75 0%, #0E7490 100%)',
    glowColor: 'rgba(6,182,212,0.35)', emoji: '⭐',
  },
];

const TICKER = [
  '🔥 50% OFF on first order',
  '🚀 FREE delivery above ₹299',
  '💰 ₹100 cashback with FEAST100',
  '⭐ Double points this weekend',
  '🎁 Refer & earn ₹200',
  '🌟 New restaurants added daily',
];

const CARD_GRADIENTS = [
  'linear-gradient(135deg,#1C1200 0%,#3D2800 100%)',
  'linear-gradient(135deg,#001C0A 0%,#003520 100%)',
  'linear-gradient(135deg,#1C000A 0%,#360018 100%)',
  'linear-gradient(135deg,#001618 0%,#003040 100%)',
  'linear-gradient(135deg,#0E0020 0%,#1E0040 100%)',
  'linear-gradient(135deg,#1A0A00 0%,#3A1800 100%)',
];

const FLASH_SALES = [
  {
    title: '60% OFF Biryani', restaurant: 'Paradise Kitchen',
    originalPrice: 250, salePrice: 100, emoji: '🍛',
    endsIn: 45 * 60, badge: '🔥 HOT',
    gradient: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)',
    glow: 'rgba(124,58,237,0.38)',
  },
  {
    title: 'Buy 1 Get 1 Pizza', restaurant: 'Slice & Dice',
    originalPrice: 320, salePrice: 160, emoji: '🍕',
    endsIn: 23 * 60 + 18, badge: '⚡ LIMITED',
    gradient: 'linear-gradient(135deg, #BE185D 0%, #9D174D 100%)',
    glow: 'rgba(190,24,93,0.38)',
  },
  {
    title: '40% OFF Combos', restaurant: 'Meal Wala',
    originalPrice: 450, salePrice: 270, emoji: '🍱',
    endsIn: 2 * 3600 + 12 * 60, badge: '🎯 DEAL',
    gradient: 'linear-gradient(135deg, #0369A1 0%, #075985 100%)',
    glow: 'rgba(3,105,161,0.38)',
  },
  {
    title: 'Free Dessert + Meal', restaurant: 'Sweet Bites',
    originalPrice: 380, salePrice: 199, emoji: '🍰',
    endsIn: 58 * 60 + 40, badge: '🎂 SWEET',
    gradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    glow: 'rgba(5,150,105,0.38)',
  },
];

function formatFlashTime(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const AI_TAGS = [
  'Most Loved Near You', 'Perfect for Tonight', 'Trending Now',
  "Editor's Choice", 'Top Rated', 'New & Hot',
];

const DISCOUNT_BADGES = [20, 30, 25, 15, 35, 40];

// ── Helpers ────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Good morning',   emoji: '☀️',  tip: 'Start your day with something delicious' };
  if (h < 17) return { text: 'Good afternoon', emoji: '🌤️', tip: 'Fuel your afternoon with great food' };
  if (h < 21) return { text: 'Good evening',   emoji: '🌆', tip: 'Wind down with a perfect dinner tonight' };
  return        { text: 'Good night',           emoji: '🌙', tip: 'Late-night cravings? We got you covered' };
}

const stagger = { animate: { transition: { staggerChildren: 0.06 } } };
const fadeUp  = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.38 } },
};

// ── Shimmer skeleton ────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="h-48 shimmer" />
      <div className="space-y-2.5 p-4">
        <div className="h-4 w-3/4 shimmer rounded-full" />
        <div className="h-3 w-1/2 shimmer rounded-full" />
        <div className="flex gap-2 pt-1">
          <div className="h-5 w-14 shimmer rounded-full" />
          <div className="h-5 w-20 shimmer rounded-full" />
        </div>
      </div>
    </div>
  );
}

// ── Restaurant card ─────────────────────────────────────────────────────────

function RestaurantCard({ r, idx }: { r: Restaurant; idx: number }) {
  const id = r.branchId ?? r.id;
  const discount = DISCOUNT_BADGES[idx % DISCOUNT_BADGES.length];
  const showDiscount = idx % 3 === 0;

  return (
    <motion.div variants={fadeUp} whileHover={{ y: -5 }} transition={{ type: 'spring', stiffness: 280, damping: 22 }}>
      <Link
        href={`/customer/restaurants/${id}`}
        className="group block overflow-hidden rounded-2xl transition-shadow duration-300 hover:shadow-2xl no-underline"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        {/* Image */}
        <div className="relative h-48 overflow-hidden">
          {r.imageUrl ? (
            <img
              src={resolveMediaUrl(r.imageUrl)}
              alt={r.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-108"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center" style={{ background: CARD_GRADIENTS[idx % CARD_GRADIENTS.length] }}>
              <span className="text-6xl opacity-35">🍽️</span>
            </div>
          )}

          {/* Gradient overlay */}
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.08) 55%, transparent 100%)' }}
          />

          {/* AI quality tag — top left */}
          <div
            className="absolute left-3 top-3 flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold"
            style={{ background: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(8px)', color: 'var(--accent-bright)' }}
          >
            ✦ {AI_TAGS[idx % AI_TAGS.length]}
          </div>

          {/* Veg indicator — top right */}
          {r.isVeg != null && (
            <div
              className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded border-2"
              style={{
                background: 'rgba(0,0,0,0.5)',
                borderColor: r.isVeg ? '#22c55e' : '#ef4444',
                backdropFilter: 'blur(8px)',
              }}
            >
              <div
                className="h-2 w-2 rounded-full"
                style={{ background: r.isVeg ? '#22c55e' : '#ef4444' }}
              />
            </div>
          )}

          {/* Discount — bottom left */}
          {showDiscount && (
            <div
              className="absolute bottom-3 left-3 rounded-lg px-2 py-0.5 text-[10px] font-black"
              style={{ background: 'var(--accent)', color: 'white' }}
            >
              {discount}% OFF
            </div>
          )}

          {/* Delivery time — bottom right */}
          {r.deliveryTime != null && (
            <div
              className="absolute bottom-3 right-3 flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-white"
              style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
              </svg>
              {r.deliveryTime} min
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-bold leading-snug" style={{ color: 'var(--tx)', fontSize: 15 }}>
                {r.name}
              </p>
              {r.cuisine && (
                <p className="mt-0.5 truncate text-xs" style={{ color: 'var(--tx-3)' }}>{r.cuisine}</p>
              )}
            </div>
            {/* Favourite button */}
            <button
              className="shrink-0 transition-transform hover:scale-115"
              onClick={(e) => e.preventDefault()}
              aria-label="Add to favourites"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--tx-3)" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
            </button>
          </div>

          {/* Meta row */}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            {r.rating != null && (
              <span
                className="flex items-center gap-1 rounded-lg px-2 py-0.5 font-bold"
                style={{ background: 'rgba(34,197,94,0.12)', color: '#16a34a' }}
              >
                ★ {r.rating.toFixed(1)}
              </span>
            )}
            {r.distance != null && (
              <span style={{ color: 'var(--tx-3)' }}>{r.distance.toFixed(1)} km</span>
            )}
            {r.deliveryFee != null && (
              <span style={{ color: r.deliveryFee === 0 ? '#16a34a' : 'var(--tx-3)' }}>
                {r.deliveryFee === 0 ? '• Free delivery' : `• ₹${r.deliveryFee} delivery`}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ── Horizontal mood section ─────────────────────────────────────────────────

function MoodSection({
  title, desc, emoji, items,
}: {
  title: string; desc: string; emoji: string; items: Restaurant[];
}) {
  if (!items.length) return null;
  return (
    <section>
      <div className="mb-5 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-2xl"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
          >
            {emoji}
          </div>
          <div>
            <h2 className="text-base font-black" style={{ color: 'var(--tx)' }}>{title}</h2>
            <p className="text-xs" style={{ color: 'var(--tx-3)' }}>{desc}</p>
          </div>
        </div>
        <Link href="/customer/discovery" className="text-xs font-bold no-underline" style={{ color: 'var(--accent)' }}>
          See all →
        </Link>
      </div>

      <div className="flex gap-4 overflow-x-auto px-4 pb-3 scrollbar-hide scroll-touch sm:px-6">
        {items.map((r, i) => {
          const id = r.branchId ?? r.id;
          return (
            <Link
              key={id ?? i}
              href={`/customer/restaurants/${id}`}
              className="group shrink-0 w-52 overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl no-underline"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="relative h-36 overflow-hidden">
                {r.imageUrl ? (
                  <img
                    src={resolveMediaUrl(r.imageUrl)}
                    alt={r.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center"
                    style={{ background: CARD_GRADIENTS[i % CARD_GRADIENTS.length] }}
                  >
                    <span className="text-5xl opacity-30">🍽️</span>
                  </div>
                )}
                <div
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.05) 55%, transparent 100%)' }}
                />
                <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between">
                  {r.rating != null && (
                    <span
                      className="flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-bold"
                      style={{ background: 'rgba(34,197,94,0.25)', color: '#4ade80', backdropFilter: 'blur(4px)' }}
                    >
                      ★ {r.rating.toFixed(1)}
                    </span>
                  )}
                  {r.deliveryTime != null && (
                    <span
                      className="flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-semibold text-white"
                      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
                    >
                      ⏱ {r.deliveryTime}m
                    </span>
                  )}
                </div>
              </div>
              <div className="p-3">
                <p className="truncate text-xs font-bold leading-snug" style={{ color: 'var(--tx)' }}>{r.name}</p>
                {r.cuisine && (
                  <p className="mt-0.5 truncate text-[10px]" style={{ color: 'var(--tx-3)' }}>{r.cuisine}</p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({ query, onClear }: { query: string; onClear: () => void }) {
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
        <span className="text-5xl">🍽️</span>
      </div>
      <p className="text-lg font-bold" style={{ color: 'var(--tx)' }}>
        {query ? `No results for "${query}"` : 'No restaurants found'}
      </p>
      <p className="mt-1 text-sm" style={{ color: 'var(--tx-3)' }}>
        {query ? 'Try a different search or browse categories' : 'Allow location or search by city'}
      </p>
      {query && (
        <button
          onClick={onClear}
          className="mt-5 rounded-xl px-6 py-2.5 text-sm font-bold transition hover:opacity-80"
          style={{ background: 'var(--accent)', color: 'white', boxShadow: '0 4px 14px var(--accent-muted)' }}
        >
          Clear search
        </button>
      )}
    </motion.div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function DiscoveryPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [query, setQuery]             = useState('');
  const [searching, setSearching]     = useState(false);
  const [coords, setCoords]           = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [flashTimers, setFlashTimers] = useState<number[]>(FLASH_SALES.map((s) => s.endsIn));
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = window.setInterval(() => {
      setFlashTimers((prev) => prev.map((t) => Math.max(0, t - 1)));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const name      = getCustomerName();
  const firstName = name?.split(' ')[0] ?? '';
  const greeting  = getGreeting();

  // Geolocation
  useEffect(() => {
    if (!navigator.geolocation) { setLocationError('Geolocation not supported.'); return; }
    const timer = setTimeout(() => setLocationError('Location timed out.'), 8000);
    navigator.geolocation.getCurrentPosition(
      (p) => { clearTimeout(timer); setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }); },
      ()  => { clearTimeout(timer); setLocationError('Using default location.'); },
      { timeout: 8000, maximumAge: 60000 },
    );
    return () => clearTimeout(timer);
  }, []);

  const normalize = useCallback((item: any) => {
    const branchId = String(item.branchId ?? item.id ?? '').trim();
    const id       = String(item.id ?? item.branchId ?? '').trim();
    return {
      ...item,
      id,
      branchId,
      imageUrl: item.imageUrl ?? item.image_url,
    };
  }, []);

  const extractList = useCallback((res: any): Restaurant[] => {
    const d = res.data;
    const raw = Array.isArray(d)               ? d
              : Array.isArray(d?.data)         ? d.data
              : Array.isArray(d?.restaurants)  ? d.restaurants
              : Array.isArray(d?.branches)     ? d.branches
              : Array.isArray(d?.results)      ? d.results
              : Array.isArray(d?.items)        ? d.items
              : null;
    if (!raw) return [];
    return raw
      .map(normalize)
      .filter((r: any) => r.branchId && r.branchId !== 'undefined' && r.branchId !== '');
  }, [normalize]);

  const fetchNearby = useCallback(async (lat: number, lng: number, useExact = true) => {
    setLoading(true); setError('');
    try {
      // Use a city-wide radius so all activated restaurants appear regardless of exact GPS position
      const radius = useExact ? 50000 : 100000;
      const res = await customerDiscoveryApi.nearby({ lat, lng, radius, limit: 200 } as NearbyParams);
      let results = extractList(res);
      // Fallback: if backend returned nothing at all, widen to country-level
      if (results.length === 0) {
        try {
          const fb = await customerDiscoveryApi.nearby({ lat, lng, radius: 500000, limit: 200 } as NearbyParams);
          results = extractList(fb);
        } catch { /* non-fatal */ }
      }
      setRestaurants(results);
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? 'Failed to load restaurants.';
      setError(Array.isArray(msg) ? msg.join(' ') : msg);
    } finally { setLoading(false); }
  }, [extractList]);

  useEffect(() => {
    if (coords)          fetchNearby(coords.lat, coords.lng, true);
    else if (locationError) fetchNearby(20.5937, 78.9629, false);
  }, [coords, locationError, fetchNearby]);

  const runSearch = async (q: string) => {
    if (!q.trim() || q.trim().length < 2) return;
    setSearching(true); setError('');
    const { lat, lng } = coords ?? { lat: 17.385, lng: 78.4867 };
    try {
      const res = await customerDiscoveryApi.search(q, lat, lng);
      let data: any = res.data?.data ?? res.data?.restaurants ?? res.data;
      if (!Array.isArray(data) && data?.data) data = data.data;
      setRestaurants(
        Array.isArray(data)
          ? data.map(normalize).filter((r: any) => r.branchId && r.branchId !== 'undefined')
          : [],
      );
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Search failed.');
    } finally { setSearching(false); }
  };

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); runSearch(query); };

  const handleCategory = (cat: typeof CATEGORIES[number]) => {
    if (activeCategory === cat.q) {
      setActiveCategory(null); setQuery('');
      const { lat, lng } = coords ?? { lat: 20.5937, lng: 78.9629 };
      fetchNearby(lat, lng, !!coords);
    } else {
      setActiveCategory(cat.q); setQuery(cat.q);
      runSearch(cat.q);
    }
  };

  const clearSearch = () => {
    setQuery(''); setActiveCategory(null);
    const { lat, lng } = coords ?? { lat: 20.5937, lng: 78.9629 };
    fetchNearby(lat, lng, !!coords);
  };

  const lateNight = restaurants.slice(0, 6);
  const healthy   = [...restaurants].reverse().slice(0, 6);

  return (
    <div style={{ background: 'var(--bg)' }}>

      {/* ── OFFER TICKER ──────────────────────────────────────────────────── */}
      <div className="overflow-hidden py-2.5" style={{ background: 'var(--accent)' }}>
        <div
          className="ticker-content gap-0"
          style={{ color: 'white', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em' }}
        >
          {[...TICKER, ...TICKER, ...TICKER].map((item, i) => (
            <span key={i} className="mx-10">{item}</span>
          ))}
        </div>
      </div>

      {/* ── HERO SECTION — CINEMATIC VIDEO BG ────────────────────────────── */}
      <section
        className="relative overflow-hidden flex items-center"
        style={{ height: 'calc(100vh - 92px)', minHeight: 480 }}
      >

        {/* ── Full-bleed background video ── */}
        <video
          src="/herosection.mp4"
          autoPlay loop muted playsInline
          className="absolute inset-0 h-full w-full object-cover"
          style={{ zIndex: 0 }}
        />

        {/* ── Overlays ── */}
        {/* Solid dark panel on the left so text is always crisp */}
        <div className="pointer-events-none absolute inset-0" style={{ zIndex: 1, background: 'linear-gradient(to right, rgba(4,0,15,0.92) 0%, rgba(4,0,15,0.82) 35%, rgba(4,0,15,0.45) 58%, rgba(4,0,15,0.10) 75%, transparent 100%)' }} />
        {/* Top dark fade */}
        <div className="pointer-events-none absolute top-0 left-0 right-0 h-20" style={{ zIndex: 1, background: 'linear-gradient(to bottom, rgba(4,0,15,0.60) 0%, transparent 100%)' }} />
        {/* Bottom fade into page bg */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32" style={{ zIndex: 1, background: 'linear-gradient(to top, #0B0022 0%, transparent 100%)' }} />

        {/* ── HERO CONTENT — left aligned ──────────────────────────────────── */}
        <div className="relative mx-auto w-full max-w-7xl px-6 sm:px-10 lg:px-16" style={{ zIndex: 3 }}>
        <div className="py-8 sm:py-10" style={{ maxWidth: 620 }}>

          {/* Greeting pill */}
          <motion.div
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.45 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full px-4 py-2"
            style={{
              background: 'rgba(255,255,255,0.10)',
              border: '1px solid rgba(255,255,255,0.18)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            }}
          >
            <span className="text-sm leading-none">{greeting.emoji}</span>
            <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.90)' }}>
              {greeting.text}{firstName ? `, ${firstName}` : ''}
            </span>
            <span className="h-1 w-1 rounded-full" style={{ background: 'rgba(255,255,255,0.30)' }} />
            <span className="flex items-center gap-1 text-xs font-medium" style={{ color: 'rgba(196,181,253,0.85)' }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="rgba(167,139,250,1)">
                <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-2.013 3.5-4.619 3.5-7.327A8.25 8.25 0 006.75 11.999c0 2.708 1.556 5.314 3.5 7.327a19.58 19.58 0 002.683 2.282 16.975 16.975 0 001.144.742zM21.75 11.999a9.75 9.75 0 11-19.5 0 9.75 9.75 0 0119.5 0zM12 9.75a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z" clipRule="evenodd" />
              </svg>
              Hyderabad
            </span>
          </motion.div>

          {/* Headline — large, left-aligned */}
          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.10, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl font-black leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl"
            style={{ textShadow: '0 2px 12px rgba(0,0,0,0.90), 0 4px 32px rgba(0,0,0,0.70)' }}
          >
            What are you
            <br />
            <span style={{
              background: 'linear-gradient(90deg, #C4B5FD 0%, #A78BFA 40%, #DDD6FE 70%, #C4B5FD 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              backgroundSize: '200% auto',
              animation: 'gold-shimmer 5s linear infinite',
            }}>craving</span>
            {' '}today?
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.18 }}
            className="mt-3 text-base"
            style={{ color: 'rgba(255,255,255,0.75)', textShadow: '0 1px 8px rgba(0,0,0,0.80)' }}
          >
            {greeting.tip}
          </motion.p>

          {/* ── SEARCH BAR ─────────────────────────────────────────────────── */}
          <motion.form
            onSubmit={handleSearch}
            className="mt-7"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.20, duration: 0.5 }}
          >
            <div
              className="flex items-center overflow-hidden rounded-2xl p-1.5"
              style={{
                background: 'rgba(255,255,255,0.12)',
                border: '1.5px solid rgba(255,255,255,0.22)',
                backdropFilter: 'blur(28px)',
                WebkitBackdropFilter: 'blur(28px)',
                boxShadow: '0 8px 40px rgba(0,0,0,0.45)',
              }}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: 'rgba(255,255,255,0.09)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="2.3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Restaurants, dishes, cuisines…"
                className="hero-input flex-1 px-3 text-sm font-medium"
              />
              {query && (
                <button type="button" onClick={clearSearch} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>✕</button>
              )}
              <motion.button type="button" whileTap={{ scale: 0.88 }} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl mx-1" style={{ background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.75)' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                </svg>
              </motion.button>
              <motion.button
                type="submit"
                disabled={searching}
                whileTap={{ scale: 0.95 }}
                className="shrink-0 rounded-xl px-5 py-2.5 text-sm font-bold disabled:opacity-60"
                style={{
                  background: 'linear-gradient(135deg, #5B21B6 0%, #7C3AED 60%, #8B5CF6 100%)',
                  color: 'white',
                  boxShadow: '0 4px 20px rgba(91,33,182,0.60)',
                }}
              >
                {searching ? '…' : 'Search'}
              </motion.button>
            </div>
          </motion.form>

          {/* Trending chips */}
          <motion.div
            className="mt-4 flex flex-wrap items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.28 }}
          >
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.26)' }}>Trending:</span>
            {[
              { label: '🍛 Biryani', q: 'biryani' },
              { label: '🍕 Pizza',   q: 'pizza'   },
              { label: '🍔 Burger',  q: 'burger'  },
              { label: '🥗 Healthy', q: 'salad'   },
              { label: '🍰 Desserts',q: 'dessert' },
            ].map((tag) => (
              <button
                key={tag.q}
                onClick={() => { setQuery(tag.q); runSearch(tag.q); }}
                className="rounded-full px-3 py-1 text-xs font-semibold transition hover:bg-white/20"
                style={{
                  background: 'rgba(255,255,255,0.09)',
                  color: 'rgba(255,255,255,0.75)',
                  border: '1px solid rgba(255,255,255,0.14)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                {tag.label}
              </button>
            ))}
          </motion.div>

        </div>
        </div>

      </section>

      {/* ── PAGE BODY ─────────────────────────────────────────────────────── */}
      <div className="space-y-12 pb-16 pt-8">

        {/* ── CATEGORY PILLS ───────────────────────────────────────────────── */}
        <section className="px-4 sm:px-6">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide scroll-touch">
            {CATEGORIES.map((cat) => {
              const active = activeCategory === cat.q;
              return (
                <motion.button
                  key={cat.q}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => handleCategory(cat)}
                  className="shrink-0 flex items-center gap-2 rounded-full px-4 py-2.5 transition-all duration-200"
                  style={{
                    background: active ? `linear-gradient(135deg, ${cat.from}, ${cat.to})` : 'var(--surface)',
                    border: `1.5px solid ${active ? cat.from : 'var(--border)'}`,
                    boxShadow: active ? `0 4px 16px ${cat.from}66` : 'none',
                  }}
                >
                  <span className="text-lg leading-none">{cat.emoji}</span>
                  <span
                    className="text-[13px] font-bold whitespace-nowrap"
                    style={{ color: active ? 'white' : 'var(--tx-2)' }}
                  >
                    {cat.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* ── TODAY'S DEALS ─────────────────────────────────────────────────── */}
        <section className="px-4 sm:px-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black" style={{ color: 'var(--tx)' }}>Today's Deals</h2>
              <p className="mt-0.5 text-xs" style={{ color: 'var(--tx-3)' }}>Limited time — grab them fast 🔥</p>
            </div>
            <button
              className="rounded-xl px-3 py-1.5 text-xs font-bold transition hover:opacity-80"
              style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}
            >
              View all →
            </button>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide scroll-touch">
            {OFFERS.map((o, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ scale: 1.03, y: -5 }}
                className="relative shrink-0 w-64 sm:w-72 cursor-pointer overflow-hidden rounded-3xl"
                style={{
                  background: o.gradient,
                  boxShadow: `0 14px 36px ${o.glowColor}`,
                }}
              >
                {/* Dot texture overlay */}
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                    opacity: 0.25,
                  }}
                />
                <div className="relative p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <span
                        className="inline-block rounded-lg px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest"
                        style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
                      >
                        {o.tag}
                      </span>
                      <p className="mt-3 text-3xl font-black text-white leading-none">{o.title}</p>
                      <p className="mt-1.5 text-xs font-medium" style={{ color: 'rgba(255,255,255,0.72)' }}>{o.sub}</p>
                    </div>
                    <span className="text-5xl leading-none drop-shadow-md">{o.emoji}</span>
                  </div>
                  {/* Progress bar + CTA */}
                  <div className="mt-5 flex items-center justify-between gap-3">
                    <div className="flex flex-1 flex-col gap-1">
                      <div
                        className="h-1 w-full overflow-hidden rounded-full"
                        style={{ background: 'rgba(255,255,255,0.18)' }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${55 + i * 12}%`, background: 'rgba(255,255,255,0.65)' }}
                        />
                      </div>
                      <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        {55 + i * 12}% claimed
                      </span>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      className="shrink-0 rounded-xl px-3.5 py-1.5 text-[11px] font-black"
                      style={{
                        background: 'rgba(255,255,255,0.22)',
                        color: 'white',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255,255,255,0.3)',
                      }}
                    >
                      Apply →
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── NOTICES ────────────────────────────────────────────────────────── */}
        {(error || locationError) && (
          <div className="px-4 sm:px-6 space-y-2">
            {locationError && (
              <p className="text-xs" style={{ color: 'var(--tx-3)' }}>📍 {locationError}</p>
            )}
            {error && (
              <div
                className="rounded-xl border px-4 py-3 text-sm"
                style={{ background: 'var(--danger-bg)', borderColor: 'var(--danger-border)', color: 'var(--danger-text)' }}
              >
                {error}
              </div>
            )}
          </div>
        )}

        {/* ── TRENDING NEAR YOU ─────────────────────────────────────────────── */}
        <section className="px-4 sm:px-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-black" style={{ color: 'var(--tx)' }}>
                  {query ? `Results for "${query}"` : 'Trending Near You'}
                </h2>
                {!query && (
                  <span className="live-dot h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: '#EF4444' }} />
                )}
              </div>
              <p className="mt-0.5 text-xs" style={{ color: 'var(--tx-3)' }}>
                {!loading && restaurants.length > 0
                  ? `${restaurants.length} places nearby`
                  : 'Based on your location'}
              </p>
            </div>
            {!loading && restaurants.length > 0 && (
              <button className="text-xs font-bold" style={{ color: 'var(--accent)' }}>See all →</button>
            )}
          </div>

          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(8)].map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : restaurants.length === 0 ? (
            <EmptyState query={query} onClear={clearSearch} />
          ) : (
            <motion.div
              variants={stagger}
              initial="initial"
              animate="animate"
              className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              {restaurants.map((r, i) => (
                <RestaurantCard key={r.branchId ?? r.id ?? i} r={r} idx={i} />
              ))}
            </motion.div>
          )}
        </section>

        {/* ── EXTRA SECTIONS (after restaurants load) ───────────────────────── */}
        {!loading && restaurants.length > 0 && (
          <>
            {/* ── YOUR REGULARS ─────────────────────────────────────────────── */}
            <section className="px-4 sm:px-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p
                    className="text-[11px] font-black uppercase tracking-widest"
                    style={{ color: 'var(--accent)' }}
                  >
                    ⚡ Quick Reorder
                  </p>
                  <h3 className="mt-1 text-xl font-black" style={{ color: 'var(--tx)' }}>Your Regulars</h3>
                </div>
                <Link
                  href="/customer/orders"
                  className="text-xs font-bold no-underline"
                  style={{ color: 'var(--accent)' }}
                >
                  History →
                </Link>
              </div>

              <div className="flex gap-5 overflow-x-auto pb-2 scrollbar-hide scroll-touch">
                {restaurants.slice(0, 6).map((r, i) => {
                  const id = r.branchId ?? r.id;
                  return (
                    <Link
                      key={id ?? i}
                      href={`/customer/restaurants/${id}`}
                      className="group shrink-0 flex flex-col items-center gap-2.5 no-underline"
                      style={{ width: 84 }}
                    >
                      <div
                        className="relative h-20 w-20 overflow-hidden rounded-2xl transition-transform duration-300 group-hover:scale-105"
                        style={{
                          background: CARD_GRADIENTS[i % CARD_GRADIENTS.length],
                          border: '2px solid var(--border)',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                        }}
                      >
                        {r.imageUrl ? (
                          <img src={resolveMediaUrl(r.imageUrl)} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <span className="text-3xl opacity-40">🍽️</span>
                          </div>
                        )}
                        <div
                          className="absolute inset-0"
                          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 55%)' }}
                        />
                      </div>
                      <p
                        className="w-full truncate text-center text-[11px] font-bold"
                        style={{ color: 'var(--tx-2)' }}
                      >
                        {r.name}
                      </p>
                      <span
                        className="rounded-lg px-2.5 py-0.5 text-[10px] font-bold"
                        style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}
                      >
                        Reorder
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>

            {/* ── LATE NIGHT CRAVINGS ──────────────────────────────────────── */}
            <MoodSection
              title="Late Night Cravings"
              desc="Perfect for midnight hunger pangs"
              emoji="🌙"
              items={lateNight}
            />

            {/* ── HEALTHY & FRESH ───────────────────────────────────────────── */}
            <MoodSection
              title="Healthy & Fresh"
              desc="Good food that's good for you"
              emoji="🥗"
              items={healthy}
            />

            {/* ── FLASH SALES ───────────────────────────────────────────────── */}
            <section className="px-4 sm:px-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black" style={{ color: 'var(--tx)' }}>Flash Sales</h2>
                  <p className="mt-0.5 text-xs" style={{ color: 'var(--tx-3)' }}>⚡ Limited time — grab before they&apos;re gone!</p>
                </div>
                <div
                  className="flex items-center gap-2 rounded-2xl px-3 py-1.5"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}
                >
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-black" style={{ color: '#ef4444' }}>LIVE</span>
                </div>
              </div>

              <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide scroll-touch">
                {FLASH_SALES.map((sale, i) => {
                  const remaining = flashTimers[i] ?? sale.endsIn;
                  const urgent = remaining < 120;
                  return (
                    <motion.div
                      key={i}
                      whileHover={{ scale: 1.03, y: -5 }}
                      className="shrink-0 w-64 relative overflow-hidden rounded-3xl cursor-pointer"
                      style={{ background: sale.gradient, boxShadow: `0 8px 30px ${sale.glow}` }}
                    >
                      {/* Dot-grid texture */}
                      <div
                        className="pointer-events-none absolute inset-0 opacity-15"
                        style={{
                          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.14) 1px, transparent 1px)',
                          backgroundSize: '16px 16px',
                        }}
                      />
                      {/* Glow orb */}
                      <div
                        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-25 blur-2xl"
                        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.7) 0%, transparent 70%)' }}
                      />

                      <div className="relative p-5 space-y-3">
                        {/* Header row */}
                        <div className="flex items-center justify-between">
                          <span
                            className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider"
                            style={{ background: 'rgba(255,255,255,0.22)', color: 'white', backdropFilter: 'blur(8px)' }}
                          >
                            {sale.badge}
                          </span>
                          <span className="text-3xl">{sale.emoji}</span>
                        </div>

                        {/* Title + restaurant */}
                        <div>
                          <p className="text-lg font-black text-white leading-tight">{sale.title}</p>
                          <p className="mt-0.5 text-xs" style={{ color: 'rgba(255,255,255,0.62)' }}>{sale.restaurant}</p>
                        </div>

                        {/* Price row */}
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-black text-white">₹{sale.salePrice}</span>
                          <span className="text-sm line-through" style={{ color: 'rgba(255,255,255,0.48)' }}>₹{sale.originalPrice}</span>
                          <span
                            className="text-[10px] font-black rounded-full px-2 py-0.5 text-white"
                            style={{ background: 'rgba(255,255,255,0.22)' }}
                          >
                            {Math.round((1 - sale.salePrice / sale.originalPrice) * 100)}% off
                          </span>
                        </div>

                        {/* Countdown timer */}
                        <div
                          className="flex items-center gap-2 rounded-2xl px-3 py-2.5"
                          style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(8px)' }}
                        >
                          <span className="text-sm">⏱</span>
                          <span className="text-xs font-bold text-white">Ends in</span>
                          <span
                            className="text-sm font-black"
                            style={{
                              color: urgent ? '#fca5a5' : '#fde68a',
                              fontVariantNumeric: 'tabular-nums',
                              fontFamily: 'ui-monospace, monospace',
                              letterSpacing: '0.04em',
                            }}
                          >
                            {formatFlashTime(remaining)}
                          </span>
                        </div>

                        {/* CTA */}
                        <button
                          className="w-full rounded-2xl py-2.5 text-sm font-black text-white transition hover:opacity-90"
                          style={{
                            background: 'rgba(255,255,255,0.20)',
                            backdropFilter: 'blur(8px)',
                            border: '1px solid rgba(255,255,255,0.28)',
                          }}
                        >
                          Order Now →
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}