'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { customerDiscoveryApi, NearbyParams } from '../../../lib/api';
import { getCustomerName } from '../../../lib/customer-auth';

// ── Types ──────────────────────────────────────────────────────────────────

type Restaurant = {
  id?: string; branchId?: string; name: string;
  cuisine?: string; rating?: number; deliveryTime?: number;
  deliveryFee?: number; imageUrl?: string; isVeg?: boolean; distance?: number;
};

// ── Static data ────────────────────────────────────────────────────────────

const CATEGORIES = [
  { emoji: '🍕', label: 'Pizza',    q: 'pizza'   },
  { emoji: '🍛', label: 'Biryani',  q: 'biryani' },
  { emoji: '🍔', label: 'Burgers',  q: 'burger'  },
  { emoji: '🌮', label: 'Wraps',    q: 'wrap'    },
  { emoji: '🥗', label: 'Healthy',  q: 'salad'   },
  { emoji: '🍣', label: 'Sushi',    q: 'sushi'   },
  { emoji: '🍰', label: 'Desserts', q: 'dessert' },
  { emoji: '☕', label: 'Café',     q: 'coffee'  },
  { emoji: '🍜', label: 'Noodles',  q: 'noodles' },
  { emoji: '🥐', label: 'Bakery',   q: 'bakery'  },
];

const OFFERS = [
  { title: '50% OFF', sub: 'Your first order',      tag: 'NEW USER',  from: '#92400E', to: '#78350F', emoji: '🎉' },
  { title: 'FREE Delivery', sub: 'Orders above ₹299', tag: 'LIMITED', from: '#4C1D95', to: '#3730A3', emoji: '🚀' },
  { title: '₹100 Cashback', sub: 'Code FEAST100',   tag: 'HOT DEAL',  from: '#991B1B', to: '#7F1D1D', emoji: '💰' },
  { title: '2× Points',     sub: 'On top restaurants', tag: 'WEEKEND', from: '#0E7490', to: '#155E75', emoji: '⭐' },
];

const AI_TAGS = [
  'Most Loved Near You', 'Perfect for Tonight', 'Trending Now', 'Staff Pick', 'Top Rated', 'New & Hot',
];

const CARD_BG = [
  'linear-gradient(135deg,#1C1200 0%,#3D2800 100%)',
  'linear-gradient(135deg,#001C0A 0%,#003520 100%)',
  'linear-gradient(135deg,#1C000A 0%,#360018 100%)',
  'linear-gradient(135deg,#001618 0%,#003040 100%)',
  'linear-gradient(135deg,#0E0020 0%,#1E0040 100%)',
  'linear-gradient(135deg,#1A0A00 0%,#3A1800 100%)',
];

// ── Helper: greeting ───────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Good morning',   emoji: '☀️',  tip: 'Start your day right — breakfast awaits' };
  if (h < 17) return { text: 'Good afternoon', emoji: '🌤️', tip: 'Fuel your afternoon with something great' };
  if (h < 21) return { text: 'Good evening',   emoji: '🌆', tip: 'Wind down with a delicious dinner' };
  return        { text: 'Good night',           emoji: '🌙', tip: 'Late-night cravings? We got you' };
}

// ── Stagger variants ───────────────────────────────────────────────────────

const stagger = { animate: { transition: { staggerChildren: 0.06 } } };
const fadeUp  = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0, transition: { duration: 0.45 } } };

// ── Restaurant card ────────────────────────────────────────────────────────

function RestaurantCard({ r, idx }: { r: Restaurant; idx: number }) {
  const id = r.branchId ?? r.id;
  return (
    <motion.div variants={fadeUp} whileHover={{ y: -5 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
      <Link
        href={`/customer/restaurants/${id}`}
        className="group block overflow-hidden rounded-3xl transition-shadow duration-300 hover:shadow-2xl"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        {/* Image area */}
        <div className="relative h-44 overflow-hidden">
          {r.imageUrl ? (
            <img
              src={r.imageUrl} alt={r.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center" style={{ background: CARD_BG[idx % CARD_BG.length] }}>
              <span className="text-6xl opacity-50">🍽️</span>
            </div>
          )}
          {/* Bottom gradient */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)' }} />

          {/* AI tag */}
          <div
            className="absolute left-3 top-3 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold"
            style={{ background: 'rgba(0,0,0,0.58)', backdropFilter: 'blur(10px)', color: 'var(--accent-bright)' }}
          >
            ✦ {AI_TAGS[idx % AI_TAGS.length]}
          </div>

          {/* Veg badge */}
          {r.isVeg && (
            <div
              className="absolute right-3 top-3 rounded border px-1.5 py-0.5 text-[9px] font-bold"
              style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', borderColor: '#4ade80', color: '#4ade80' }}
            >
              VEG
            </div>
          )}

          {/* Delivery time */}
          {r.deliveryTime != null && (
            <div
              className="absolute bottom-3 right-3 rounded-full px-2.5 py-1 text-[10px] font-semibold text-white"
              style={{ background: 'rgba(0,0,0,0.58)', backdropFilter: 'blur(8px)' }}
            >
              🕒 {r.deliveryTime} min
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <p className="truncate font-bold leading-snug" style={{ color: 'var(--tx)', fontSize: 15 }}>{r.name}</p>
          {r.cuisine && (
            <p className="mt-0.5 truncate text-xs" style={{ color: 'var(--tx-3)' }}>{r.cuisine}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs" style={{ color: 'var(--tx-2)' }}>
            {r.rating != null && (
              <span className="flex items-center gap-1 rounded-full px-2 py-0.5 font-bold"
                style={{ background: 'rgba(34,197,94,0.12)', color: '#16a34a' }}>
                ★ {r.rating.toFixed(1)}
              </span>
            )}
            {r.distance != null && <span>{r.distance.toFixed(1)} km</span>}
            {r.deliveryFee != null && (
              <span style={{ color: r.deliveryFee === 0 ? '#16a34a' : 'var(--tx-2)' }}>
                {r.deliveryFee === 0 ? 'Free delivery' : `₹${r.deliveryFee} delivery`}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ── Mood section (horizontal scroll) ──────────────────────────────────────

function MoodSection({ title, desc, items }: { title: string; desc: string; items: Restaurant[] }) {
  if (!items.length) return null;
  return (
    <section className="px-4">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="text-base font-bold" style={{ color: 'var(--tx)' }}>{title}</h2>
          <p className="text-xs" style={{ color: 'var(--tx-3)' }}>{desc}</p>
        </div>
        <Link href="/customer/discovery" className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>See all</Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide">
        {items.map((r, i) => {
          const id = r.branchId ?? r.id;
          return (
            <Link
              key={id}
              href={`/customer/restaurants/${id}`}
              className="group shrink-0 w-44 overflow-hidden rounded-2xl transition hover:shadow-xl"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="relative h-28 overflow-hidden">
                {r.imageUrl ? (
                  <img src={r.imageUrl} alt={r.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center" style={{ background: CARD_BG[i % CARD_BG.length] }}>
                    <span className="text-3xl opacity-50">🍽️</span>
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="truncate text-xs font-bold" style={{ color: 'var(--tx)' }}>{r.name}</p>
                <p className="mt-0.5 text-[10px]" style={{ color: 'var(--tx-3)' }}>
                  {r.rating != null ? `★ ${r.rating.toFixed(1)}` : ''}
                  {r.deliveryTime != null ? `  ·  ${r.deliveryTime} min` : ''}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="h-44 animate-pulse" style={{ background: 'var(--surface-2)' }} />
      <div className="space-y-2 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded-full" style={{ background: 'var(--surface-2)' }} />
        <div className="h-3 w-1/2 animate-pulse rounded-full" style={{ background: 'var(--surface-2)' }} />
        <div className="flex gap-2 pt-1">
          <div className="h-5 w-12 animate-pulse rounded-full" style={{ background: 'var(--surface-2)' }} />
          <div className="h-5 w-16 animate-pulse rounded-full" style={{ background: 'var(--surface-2)' }} />
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function DiscoveryPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [query, setQuery]             = useState('');
  const [searching, setSearching]     = useState(false);
  const [coords, setCoords]           = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const name      = getCustomerName();
  const firstName = name?.split(' ')[0] ?? '';
  const greeting  = getGreeting();

  // Geolocation
  useEffect(() => {
    if (!navigator.geolocation) { setLocationError('Geolocation not supported.'); setLoading(false); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
      ()  => setLocationError('Using default location.'),
    );
  }, []);

  const normalize = (item: any) => {
    const branchId = String(item.branchId ?? item.id ?? '').trim();
    const id = String(item.id ?? item.branchId ?? '').trim();
    return { ...item, id, branchId };
  };

  const fetchNearby = useCallback(async (lat: number, lng: number) => {
    setLoading(true); setError('');
    try {
      const res = await customerDiscoveryApi.nearby({ lat, lng, radius: 10, limit: 20 } as NearbyParams);
      let data: any = res.data?.data ?? res.data?.restaurants ?? res.data;
      if (!Array.isArray(data) && data?.data) data = data.data;
      setRestaurants(Array.isArray(data)
        ? data.map(normalize).filter((r: any) => r.branchId && r.branchId !== 'undefined')
        : []);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to load restaurants.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (coords) fetchNearby(coords.lat, coords.lng);
    else if (locationError) fetchNearby(17.385, 78.4867);
  }, [coords, locationError, fetchNearby]);

  const runSearch = async (q: string) => {
    if (!q.trim() || q.trim().length < 2) return;
    setSearching(true); setError('');
    const { lat, lng } = coords ?? { lat: 17.385, lng: 78.4867 };
    try {
      const res = await customerDiscoveryApi.search(q, lat, lng);
      let data: any = res.data?.data ?? res.data?.restaurants ?? res.data;
      if (!Array.isArray(data) && data?.data) data = data.data;
      setRestaurants(Array.isArray(data)
        ? data.map(normalize).filter((r: any) => r.branchId && r.branchId !== 'undefined')
        : []);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Search failed.');
    } finally { setSearching(false); }
  };

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); runSearch(query); };

  const handleCategory = (cat: typeof CATEGORIES[number]) => {
    if (activeCategory === cat.q) {
      setActiveCategory(null); setQuery('');
      const { lat, lng } = coords ?? { lat: 17.385, lng: 78.4867 };
      fetchNearby(lat, lng);
    } else {
      setActiveCategory(cat.q); setQuery(cat.q);
      runSearch(cat.q);
    }
  };

  const clearSearch = () => {
    setQuery(''); setActiveCategory(null);
    const { lat, lng } = coords ?? { lat: 17.385, lng: 78.4867 };
    fetchNearby(lat, lng);
  };

  // Derived slices for mood sections
  const lateNight  = restaurants.slice(0, 5);
  const healthy    = [...restaurants].reverse().slice(0, 5);

  return (
    <div style={{ background: 'var(--bg)' }}>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden px-4 pb-20 pt-10"
        style={{ background: 'linear-gradient(155deg,#1A0800 0%,#2E1000 35%,#451A00 65%,#1A0800 100%)' }}
      >
        {/* Glow orbs */}
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full opacity-25 blur-3xl"
          style={{ background: 'radial-gradient(circle,#FFD700 0%,transparent 70%)' }}
        />
        <div
          className="pointer-events-none absolute -bottom-8 left-1/3 h-56 w-56 rounded-full opacity-15 blur-3xl"
          style={{ background: 'radial-gradient(circle,#D97706 0%,transparent 70%)' }}
        />

        {/* Floating food emojis */}
        {['🍕','🍔','🌮','🍣','🍛'].map((e, i) => (
          <span
            key={i}
            className="pointer-events-none absolute text-3xl animate-float select-none"
            style={{
              right: `${8 + i * 12}%`,
              top: `${10 + i * 10}%`,
              opacity: 0.12,
              animationDelay: `${i * 0.7}s`,
              animationDuration: `${4 + i * 0.6}s`,
            }}
          >
            {e}
          </span>
        ))}

        {/* Greeting */}
        <motion.div
          className="mx-auto max-w-6xl"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          <p className="text-sm font-semibold" style={{ color: 'rgba(212,175,55,0.75)' }}>
            {greeting.emoji} {greeting.text}{firstName ? `, ${firstName}` : ''}!
          </p>
          {firstName ? (
            <p className="mt-4 text-xl font-semibold text-white">{firstName},</p>
          ) : null}
          <h1 className="mt-1 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
            What are you{' '}
            <span style={{ color: 'var(--accent-bright)' }}>craving</span>
            <br />today?
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'rgba(255,255,255,0.38)' }}>{greeting.tip}</p>
        </motion.div>

        {/* Search bar */}
        <motion.div
          className="mx-auto mt-7 max-w-2xl"
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.12 }}
        >
          <form onSubmit={handleSearch}>
            <div
              className="flex items-center gap-3 rounded-full px-4 py-3"
              style={{
                background: 'rgba(255,255,255,0.10)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.14)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.24)',
              }}
            >
              <svg className="shrink-0" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search restaurants or dishes…"
                className="hero-input flex-1 text-sm"
              />
              {query && (
                <button type="button" onClick={clearSearch}
                  className="shrink-0 text-xs font-semibold"
                  style={{ color: 'rgba(255,255,255,0.5)' }}>
                  ✕
                </button>
              )}
              {/* Mic */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.88 }}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition hover:brightness-110"
                style={{ background: 'var(--accent)' }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0D0906" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                </svg>
              </motion.button>
              {/* Search submit */}
              {query && (
                <button
                  type="submit"
                  disabled={searching}
                  className="hidden sm:flex shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition hover:brightness-110 disabled:opacity-60"
                  style={{ background: 'var(--accent)', color: '#0D0906' }}
                >
                  {searching ? '…' : 'Go'}
                </button>
              )}
            </div>
          </form>
        </motion.div>
      </section>

      {/* ── Content sections ──────────────────────────────────────────── */}
      <div className="space-y-10 pb-8 pt-8">

        {/* ── Offer banners ─────────────────────────────────────────── */}
        <section className="px-4">
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {OFFERS.map((o, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ scale: 1.03 }}
                className="shrink-0 w-64 md:w-72 cursor-pointer rounded-3xl p-5"
                style={{ background: `linear-gradient(135deg,${o.from} 0%,${o.to} 100%)` }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                      {o.tag}
                    </span>
                    <p className="mt-2 text-2xl font-black text-white leading-none">{o.title}</p>
                    <p className="mt-1 text-sm text-white/75">{o.sub}</p>
                  </div>
                  <span className="text-4xl">{o.emoji}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Category chips ────────────────────────────────────────── */}
        <section className="px-4">
          <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
            {CATEGORIES.map((cat) => {
              const active = activeCategory === cat.q;
              return (
                <motion.button
                  key={cat.q}
                  whileTap={{ scale: 0.90 }}
                  onClick={() => handleCategory(cat)}
                  className="shrink-0 flex min-w-[5.5rem] flex-col items-center gap-2 rounded-3xl px-5 py-4 transition-all duration-200 md:min-w-[7rem]"
                  style={{
                    background: active ? 'color-mix(in srgb, var(--accent) 18%, var(--surface))' : 'var(--surface)',
                    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                    color: active ? 'var(--accent)' : 'var(--tx-2)',
                    boxShadow: active ? '0 0 0 1px var(--accent)' : 'none',
                  }}
                >
                  <span className="text-2xl leading-none md:text-3xl">{cat.emoji}</span>
                  <span className="text-xs font-semibold whitespace-nowrap md:text-sm">{cat.label}</span>
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* ── Errors / notices ─────────────────────────────────────── */}
        {(error || locationError) && (
          <div className="px-4 space-y-2">
            {locationError && <p className="text-xs" style={{ color: 'var(--tx-3)' }}>📍 {locationError}</p>}
            {error && (
              <div className="rounded-2xl border px-4 py-3 text-sm"
                style={{ background: 'var(--danger-bg)', borderColor: 'var(--danger-border)', color: 'var(--danger-text)' }}>
                {error}
              </div>
            )}
          </div>
        )}

        {/* ── Main restaurant grid ──────────────────────────────────── */}
        <section className="px-4">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold" style={{ color: 'var(--tx)' }}>
              {query ? `Results for "${query}"` : '🔥 Trending Near You'}
            </h2>
            {!loading && restaurants.length > 0 && (
              <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                style={{ background: 'var(--surface-2)', color: 'var(--tx-3)' }}>
                {restaurants.length} places
              </span>
            )}
          </div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : restaurants.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-20 text-center"
            >
              <p className="text-6xl">🍽️</p>
              <p className="mt-4 font-bold" style={{ color: 'var(--tx-2)' }}>No restaurants found</p>
              <p className="mt-1 text-sm" style={{ color: 'var(--tx-3)' }}>Try a different search or category</p>
              {query && (
                <button
                  onClick={clearSearch}
                  className="mt-4 rounded-full px-5 py-2 text-sm font-semibold transition hover:opacity-80"
                  style={{ background: 'var(--accent)', color: '#0D0906' }}
                >
                  Clear search
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div
              variants={stagger}
              initial="initial"
              animate="animate"
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {restaurants.map((r, i) => (
                <RestaurantCard key={r.branchId ?? r.id ?? i} r={r} idx={i} />
              ))}
            </motion.div>
          )}
        </section>

        {/* ── Mood sections (only when restaurants are loaded) ──────── */}
        {!loading && restaurants.length > 0 && (
          <>
            {/* AI Picks banner */}
            <section className="mx-4 overflow-hidden rounded-3xl"
              style={{ background: 'linear-gradient(135deg,#1A0800 0%,#3A1200 100%)', border: '1px solid rgba(212,175,55,0.2)' }}>
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>✦ AI-Powered</p>
                  <h3 className="mt-0.5 text-base font-black text-white">Picks just for you</h3>
                  <p className="mt-0.5 text-xs text-white/40">Based on your taste profile</p>
                </div>
                <div className="flex -space-x-3">
                  {restaurants.slice(0, 3).map((r, i) => (
                    <div key={i}
                      className="h-10 w-10 overflow-hidden rounded-full border-2"
                      style={{ borderColor: 'var(--accent)', background: CARD_BG[i] }}>
                      {r.imageUrl && <img src={r.imageUrl} alt="" className="h-full w-full object-cover" />}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <MoodSection
              title="🌙 Late Night Cravings"
              desc="Perfect for midnight hunger pangs"
              items={lateNight}
            />

            <MoodSection
              title="🥗 Healthy &amp; Fresh"
              desc="Good food that's good for you"
              items={healthy}
            />

            {/* Combo / reorder section */}
            <section className="px-4">
              <div className="overflow-hidden rounded-3xl p-5"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>Quick Reorder</p>
                <h3 className="mt-1 text-base font-bold" style={{ color: 'var(--tx)' }}>Your Favourites</h3>
                <p className="mt-1 text-xs" style={{ color: 'var(--tx-3)' }}>One-tap to reorder your most loved meals</p>
                <div className="mt-4 flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                  {restaurants.slice(0, 4).map((r, i) => {
                    const id = r.branchId ?? r.id;
                    return (
                      <Link key={id ?? i} href={`/customer/restaurants/${id}`}
                        className="group shrink-0 flex items-center gap-3 rounded-2xl px-3 py-2.5 transition hover:brightness-110"
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', minWidth: 170 }}>
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl" style={{ background: CARD_BG[i] }}>
                          {r.imageUrl && <img src={r.imageUrl} alt="" className="h-full w-full object-cover" />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold" style={{ color: 'var(--tx)' }}>{r.name}</p>
                          <p className="text-[10px]" style={{ color: 'var(--accent)' }}>Order again →</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </section>

          </>
        )}
      </div>
    </div>
  );
}