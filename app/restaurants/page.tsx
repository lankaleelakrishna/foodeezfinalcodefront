'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '../../lib/api';
import { getUserRole } from '../../lib/auth';
import AuthGuard from '../components/AuthGuard';

type Restaurant = {
  id: string; name: string; ownerName: string; email: string; phone: string; status: string;
  cuisineTags?: string[];
  isMine?: boolean;
};

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  active:   { bg: 'var(--success-bg)',   color: 'var(--success-text)'  },
  pending:  { bg: 'var(--accent-muted)', color: 'var(--accent)'        },
  review:   { bg: 'var(--info-bg)',      color: 'var(--info-text)'     },
  rejected: { bg: 'var(--danger-bg)',    color: 'var(--danger-text)'   },
};

type SceneTheme = { skyTop: string; sky: string; bldg: string; roof: string; glow: string; star: string };

const SCENE_THEMES: Record<string, SceneTheme> = {
  active:   { skyTop:'#010f0a', sky:'#021f14', bldg:'#064e3b', roof:'#10b981', glow:'#6ee7b7', star:'#a7f3d0' },
  review:   { skyTop:'#050c1a', sky:'#0c1629', bldg:'#1e3a5f', roof:'#3b82f6', glow:'#93c5fd', star:'#bfdbfe' },
  pending:  { skyTop:'#0f0700', sky:'#1a0e00', bldg:'#451a03', roof:'#d97706', glow:'#fcd34d', star:'#fde68a' },
  rejected: { skyTop:'#100105', sky:'#1a0308', bldg:'#4c0519', roof:'#e11d48', glow:'#fca5a5', star:'#fecdd3' },
};
const SCENE_DEFAULT: SceneTheme = { skyTop:'#060818', sky:'#0c0f1e', bldg:'#1e1b4b', roof:'#7c3aed', glow:'#a78bfa', star:'#ddd6fe' };

function RestaurantScene({ letter, status }: { letter: string; status: string }) {
  const t = SCENE_THEMES[status] ?? SCENE_DEFAULT;

  return (
    <div className="relative overflow-hidden" style={{
      height: 175,
      background: `linear-gradient(180deg, ${t.skyTop} 0%, ${t.sky} 100%)`,
    }}>
      <svg viewBox="0 0 320 175" width="100%" height="175" xmlns="http://www.w3.org/2000/svg">

        {/* ── Stars ─────────────────────────────────── */}
        {([[16,10],[48,7],[88,16],[132,5],[178,13],[222,7],[268,17],[304,4],[42,28],[260,30]] as [number,number][])
          .map(([cx,cy],i) => (
          <circle key={i} cx={cx} cy={cy} r={i%3===0?2:1.5} fill={t.star}
            style={{ animation:`twinkle ${1.3+i*0.33}s ease-in-out infinite`, animationDelay:`${i*0.16}s` }} />
        ))}

        {/* ── Shooting star ─────────────────────────── */}
        <g style={{ animation:'shooting-star 7s linear infinite', animationDelay:'1.5s' }}>
          <line x1="32" y1="14" x2="55" y2="26" stroke="white" strokeWidth="1.5" opacity="0.85" strokeLinecap="round" />
          <circle cx="32" cy="14" r="2" fill="white" opacity="0.9" />
        </g>

        {/* ── Moon with craters ─────────────────────── */}
        <circle cx="280" cy="34" r="24" fill="#FEF3C7" opacity="0.90" />
        <circle cx="291" cy="26" r="19" fill={t.skyTop} />
        <circle cx="268" cy="30" r="3.5" fill="#FEF3C7" opacity="0.28" />
        <circle cx="275" cy="42" r="2.5" fill="#FEF3C7" opacity="0.18" />
        <circle cx="264" cy="40" r="1.8" fill="#FEF3C7" opacity="0.15" />

        {/* ── Clouds ────────────────────────────────── */}
        <g style={{ animation:'scooter-move 18s ease-in-out infinite alternate' }}>
          <ellipse cx="70" cy="22" rx="28" ry="9" fill="white" opacity="0.05" />
          <ellipse cx="94" cy="18" rx="20" ry="7" fill="white" opacity="0.07" />
        </g>

        {/* ── Ground + road ─────────────────────────── */}
        <rect x="0" y="148" width="320" height="27" fill={t.bldg} opacity="0.55" />
        {[55,115,175,235].map((x,i) => (
          <rect key={i} x={x} y="158" width="22" height="3" rx="1.5" fill="white" opacity="0.12" />
        ))}

        {/* ── Left tree cluster ─────────────────────── */}
        <rect x="18" y="142" width="5" height="14" rx="2.5" fill={t.bldg} opacity="0.75" />
        <ellipse cx="20" cy="138" rx="14" ry="11" fill={t.bldg} opacity="0.85" />
        <ellipse cx="20" cy="133" rx="10" ry="8" fill={t.roof} opacity="0.3" />

        {/* ── Right tree cluster ────────────────────── */}
        <rect x="297" y="142" width="5" height="14" rx="2.5" fill={t.bldg} opacity="0.75" />
        <ellipse cx="299" cy="138" rx="14" ry="11" fill={t.bldg} opacity="0.85" />
        <ellipse cx="299" cy="133" rx="10" ry="8" fill={t.roof} opacity="0.3" />

        {/* ── Street lamp ───────────────────────────── */}
        <rect x="60" y="100" width="3.5" height="52" rx="1.75" fill={t.glow} opacity="0.65" />
        <path d="M61.5 100 Q67 90 76 90" stroke={t.glow} strokeWidth="2.5" fill="none" opacity="0.65" strokeLinecap="round" />
        <circle cx="76" cy="90" r="6" fill="#FEF3C7" opacity="0.95"
          style={{ animation:'window-glow 3.5s ease-in-out infinite' }} />
        <circle cx="76" cy="90" r="16" fill="#FEF3C7" opacity="0.07" />
        <circle cx="76" cy="90" r="28" fill="#FEF3C7" opacity="0.03" />

        {/* ── Building body (2-floor) ────────────────── */}
        <rect x="98" y="56" width="124" height="96" rx="6" fill={t.bldg} />
        {/* Floor divider */}
        <rect x="98" y="96" width="124" height="2.5" fill={t.skyTop} opacity="0.55" />

        {/* ── Roof ──────────────────────────────────── */}
        <path d="M84 60 L160 22 L236 60 Z" fill={t.roof} opacity="0.94" />
        <path d="M84 60 L160 22 L236 60" fill="none" stroke="white" strokeWidth="1" opacity="0.12" />

        {/* ── Chimney ───────────────────────────────── */}
        <rect x="194" y="36" width="15" height="26" rx="3" fill={t.bldg} />
        <rect x="191" y="33" width="21" height="6" rx="3" fill={t.roof} opacity="0.85" />

        {/* Steam wisps */}
        {([0, 0.45, 0.9, 1.35] as number[]).map((delay, i) => (
          <ellipse key={i} cx={201} cy={27-i*7} rx={5.5-i*1.1} ry={3.5-i*0.7}
            fill="white" opacity={0.44-i*0.10}
            style={{ animation:`steam-rise 2.3s ease-out infinite`, animationDelay:`${delay}s` }} />
        ))}

        {/* ── Top-floor windows (3) ─────────────────── */}
        {([106, 147, 188] as number[]).map((x,i) => (
          <g key={i}>
            <rect x={x} y="64" width="28" height="22" rx="4" fill={t.glow}
              style={{ animation:`window-glow ${2.6+i*0.5}s ease-in-out infinite`, animationDelay:`${i*0.7}s` }} />
            <line x1={x} y1="75" x2={x+28} y2="75" stroke={t.bldg} strokeWidth="1.2" opacity="0.38" />
            <line x1={x+14} y1="64" x2={x+14} y2="86" stroke={t.bldg} strokeWidth="1.2" opacity="0.38" />
          </g>
        ))}

        {/* ── Neon sign ─────────────────────────────── */}
        <rect x="116" y="60" width="88" height="30" rx="8" fill="none"
          stroke={t.glow} strokeWidth="1.8" opacity="0.75"
          style={{ animation:'neon-flicker 6s linear infinite', animationDelay:'2s' }} />
        <rect x="119" y="63" width="82" height="24" rx="6" fill={t.roof} opacity="0.95" />
        <text x="160" y="80" textAnchor="middle" fontSize="13" fontWeight="900"
          fill="white" fontFamily="system-ui,sans-serif" letterSpacing="1">{letter}</text>
        {/* Neon dots below sign */}
        {[130, 160, 190].map((x,i) => (
          <circle key={i} cx={x} cy="95" r="2.2" fill={t.glow}
            style={{ animation:`window-glow ${1+i*0.35}s ease-in-out infinite`, animationDelay:`${i*0.25}s` }} />
        ))}

        {/* ── Awning + fringe ───────────────────────── */}
        <path d="M96 96 Q160 86 224 96" stroke={t.roof} strokeWidth="4.5" fill="none" strokeLinecap="round" />
        {[0,1,2,3,4,5,6,7].map((i) => (
          <line key={i} x1={100+i*16} y1={96} x2={103+i*16} y2={103}
            stroke={t.roof} strokeWidth="2" opacity="0.55" />
        ))}

        {/* ── Ground-floor windows + door ───────────── */}
        <rect x="106" y="103" width="28" height="24" rx="4" fill={t.glow} opacity="0.72"
          style={{ animation:'window-glow 4s ease-in-out infinite', animationDelay:'0.5s' }} />
        <line x1="106" y1="115" x2="134" y2="115" stroke={t.bldg} strokeWidth="1.2" opacity="0.35" />
        <rect x="186" y="103" width="28" height="24" rx="4" fill={t.glow} opacity="0.78"
          style={{ animation:'window-glow 3.2s ease-in-out infinite', animationDelay:'1.8s' }} />
        <line x1="186" y1="115" x2="214" y2="115" stroke={t.bldg} strokeWidth="1.2" opacity="0.35" />
        <rect x="144" y="105" width="32" height="43" rx="16" fill={t.skyTop} opacity="0.50" />
        {/* Door knob */}
        <circle cx="172" cy="130" r="2.5" fill={t.glow} opacity="0.6" />

        {/* ── Delivery scooter ──────────────────────── */}
        <g style={{ animation:'scooter-move 9s ease-in-out infinite', animationDelay:'0.3s' }}>
          <circle cx="242" cy="156" r="5.5" fill="none" stroke={t.glow} strokeWidth="1.8" opacity="0.7" />
          <circle cx="258" cy="156" r="5.5" fill="none" stroke={t.glow} strokeWidth="1.8" opacity="0.7" />
          <path d="M237 156 L243 145 L255 145 L261 151" stroke={t.glow} strokeWidth="1.8" fill="none" opacity="0.7" strokeLinecap="round" />
          <rect x="244" y="138" width="9" height="8" rx="2" fill={t.roof} opacity="0.75" />
          <path d="M258 145 L262 142 L264 145" stroke={t.glow} strokeWidth="1.4" fill="none" opacity="0.5" />
        </g>

        {/* ── Floating bowl (left) ──────────────────── */}
        <g style={{ animation:'rc-float 3.8s ease-in-out infinite' }}>
          <ellipse cx="34" cy="104" rx="19" ry="5.5" fill={t.roof} opacity="0.55" />
          <path d="M16 102 Q16 88 34 88 Q52 88 52 102 Z" fill={t.roof} opacity="0.82" />
          <ellipse cx="34" cy="88" rx="18" ry="4.5" fill={t.glow} opacity="0.78" />
          {/* Wavy food surface */}
          <path d="M20 88 Q27 84 34 88 Q41 84 48 88" stroke={t.glow} strokeWidth="1.5" fill="none" opacity="0.6" />
          {/* Steam */}
          <path d="M28 86 Q27 78 29 71" stroke="white" strokeWidth="1.8" fill="none" opacity="0.38" strokeLinecap="round"
            style={{ animation:'steam-rise 2.2s ease-out infinite' }} />
          <path d="M35 85 Q34 77 36 70" stroke="white" strokeWidth="1.2" fill="none" opacity="0.22" strokeLinecap="round"
            style={{ animation:'steam-rise 2.2s ease-out infinite', animationDelay:'0.5s' }} />
          <path d="M41 86 Q40 78 42 71" stroke="white" strokeWidth="1" fill="none" opacity="0.14" strokeLinecap="round"
            style={{ animation:'steam-rise 2.2s ease-out infinite', animationDelay:'1s' }} />
        </g>

        {/* ── Floating cutlery (right) ──────────────── */}
        <g style={{ animation:'rc-float 4.3s ease-in-out infinite', animationDelay:'1.2s' }}>
          {/* Fork */}
          <rect x="277" y="76" width="3.5" height="28" rx="1.75" fill={t.glow} opacity="0.7" />
          <path d="M275 66 L275 74 Q275 76 277 76 M279 66 L279 74 Q279 76 277 76 M277 66 L277 68"
            stroke={t.glow} strokeWidth="1.5" fill="none" opacity="0.65" strokeLinecap="round" />
          {/* Spoon */}
          <rect x="287" y="80" width="3.5" height="24" rx="1.75" fill={t.glow} opacity="0.65" />
          <ellipse cx="288" cy="73" rx="5" ry="7" fill={t.glow} opacity="0.6" />
        </g>

        {/* ── Fireflies ─────────────────────────────── */}
        {([[46,78],[278,82],[52,126],[286,118],[160,45]] as [number,number][]).map(([cx,cy],i) => (
          <g key={i} style={{ animation:`firefly ${1.7+i*0.55}s ease-in-out infinite`, animationDelay:`${i*0.62}s` }}>
            <circle cx={cx} cy={cy} r="2.8" fill={t.star} opacity="0.85" />
            <circle cx={cx} cy={cy} r="5" fill={t.star} opacity="0.2" />
          </g>
        ))}

        {/* ── Sparkle diamonds ──────────────────────── */}
        {([[54,24],[272,36],[50,50],[270,65]] as [number,number][]).map(([cx,cy],i) => (
          <g key={i} style={{ animation:`twinkle ${2+i*0.7}s ease-in-out infinite`, animationDelay:`${i*0.5}s` }}>
            <polygon points={`${cx},${cy-5} ${cx+2},${cy} ${cx},${cy+5} ${cx-2},${cy}`}
              fill={t.star} opacity="0.7" />
          </g>
        ))}

      </svg>
    </div>
  );
}

function RestaurantCard({ r }: { r: Restaurant }) {
  const [hovered, setHovered] = useState(false);
  const statusStyle = STATUS_STYLES[r.status] ?? { bg: 'var(--surface-2)', color: 'var(--tx-3)' };
  const letter = r.name.charAt(0).toUpperCase();

  return (
    <Link
      href={`/restaurants/${r.id}`}
      className="no-underline block rounded-[2rem] overflow-hidden border transition-all duration-300"
      style={{
        background: 'var(--surface)',
        borderColor: hovered ? 'var(--accent)' : 'var(--border)',
        boxShadow: hovered
          ? '0 0 0 2px var(--accent-muted), 0 24px 56px var(--accent-glow), 0 6px 16px rgba(0,0,0,0.18)'
          : 'var(--shadow-card)',
        transform: hovered ? 'translateY(-10px) scale(1.025)' : 'translateY(0) scale(1)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Scene wrapper — shine sweep lives here */}
      <div className="relative overflow-hidden">
        <RestaurantScene letter={letter} status={r.status} />

        {/* Diagonal shine sweep on hover */}
        <div className="pointer-events-none absolute inset-0" style={{ overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', top: '-50%', width: '35%', height: '200%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.09), transparent)',
            transform: 'rotate(15deg)',
            transition: 'left 0.65s ease',
            left: hovered ? '130%' : '-60%',
          }} />
        </div>

        {/* Status + Mine badges */}
        <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
          {r.isMine && (
            <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
              style={{ background: 'rgba(0,0,0,0.5)', color: '#fde68a', backdropFilter: 'blur(8px)', border: '1px solid rgba(253,230,138,0.3)' }}>
              ★ Mine
            </span>
          )}
          <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
            style={{ background: 'rgba(0,0,0,0.5)', color: statusStyle.color, backdropFilter: 'blur(8px)', border: `1px solid ${statusStyle.color}55` }}>
            {r.status}
          </span>
        </div>
      </div>

      {/* Card body */}
      <div className="p-5">
        {/* Name + cuisine */}
        <h2 className="text-[15px] font-bold leading-snug" style={{ color: 'var(--tx)' }}>
          {r.name}
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {(r.cuisineTags?.length ? r.cuisineTags.slice(0,2) : ['Partner restaurant']).map((tag) => (
            <span key={tag} className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
              {tag}
            </span>
          ))}
        </div>

        {/* Owner */}
        <div className="mt-3 flex items-center gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
            style={{ background: 'var(--surface-2)', color: 'var(--tx-2)' }}>
            {r.ownerName.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs font-medium truncate" style={{ color: 'var(--tx-2)' }}>{r.ownerName}</span>
        </div>

        {/* Divider */}
        <div className="my-3 h-px" style={{ background: 'var(--border-sub)' }} />

        {/* Email + phone */}
        <div className="flex flex-col gap-1.5 text-[11px]" style={{ color: 'var(--tx-3)' }}>
          <span className="flex items-center gap-1.5 min-w-0">
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 shrink-0" fill="var(--accent)">
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
            <span className="truncate">{r.email}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 shrink-0" fill="var(--accent)">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
            {r.phone}
          </span>
        </div>

        {/* View details row — fades in on hover */}
        <div className="mt-3 flex items-center justify-between transition-opacity duration-300"
          style={{ opacity: hovered ? 1 : 0 }}>
          <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>View details</span>
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="var(--accent)">
            <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-[2rem] overflow-hidden border animate-pulse" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div style={{ height: 155, background: 'var(--surface-2)' }} />
      <div className="p-5 space-y-3">
        <div className="h-4 w-32 rounded-full" style={{ background: 'var(--border)' }} />
        <div className="h-3 w-24 rounded-full" style={{ background: 'var(--surface-2)' }} />
        <div className="h-3 w-20 rounded-full" style={{ background: 'var(--surface-2)' }} />
      </div>
    </div>
  );
}

export default function RestaurantsPage() {
  const searchParams = useSearchParams();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cuisineFilter, setCuisineFilter] = useState('all');

  useEffect(() => {
    setUserRole(getUserRole());
    api.get('/restaurants')
      .then((r) => {
        // Sort so user's own restaurant appears first
        const sorted = [...r.data].sort((a, b) => {
          if (a.isMine === b.isMine) return 0;
          return a.isMine ? -1 : 1;
        });
        setRestaurants(sorted);
      })
      .catch(() => setError('Unable to load restaurant list.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const status = searchParams?.get('status') ?? 'all';
    setStatusFilter(status);
  }, [searchParams]);

  const cuisines = Array.from(new Set(restaurants.flatMap((r) => r.cuisineTags ?? []))).sort();
  const filteredRestaurants = restaurants.filter((restaurant) => {
    const lowerQuery = query.toLowerCase();
    const matchesQuery = restaurant.name.toLowerCase().includes(lowerQuery)
      || restaurant.ownerName.toLowerCase().includes(lowerQuery)
      || restaurant.email.toLowerCase().includes(lowerQuery);

    const matchesStatus = statusFilter === 'all'
      || (statusFilter === 'onboarding' && (restaurant.status === 'pending' || restaurant.status === 'review'))
      || restaurant.status === statusFilter;
    const matchesCuisine = cuisineFilter === 'all'
      || (restaurant.cuisineTags ?? []).includes(cuisineFilter);

    return matchesQuery && matchesStatus && matchesCuisine;
  });

  const canCreate = userRole === 'sales_operator' || userRole === 'super_admin';

  return (
    <AuthGuard requiredRoles={['super_admin', 'sales_operator', 'restaurant_owner', 'restaurant_admin', 'restaurant_manager']}>
      <div className="space-y-6">

        {/* Header */}
        <div className="rounded-[2rem] border p-8" style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-card)' }}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold" style={{ color: 'var(--tx)' }}>Restaurants</h1>
              <p className="mt-2 text-sm" style={{ color: 'var(--tx-3)' }}>Manage all partner restaurants.</p>
            </div>
            {canCreate && (
              <Link
                href="/restaurants/register"
                className="no-underline inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition hover:opacity-90"
                style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-color)', boxShadow: 'var(--btn-primary-shadow)' }}
              >
                + Add restaurant
              </Link>
            )}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.8fr_1fr_1fr]">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search restaurants…"
              className="w-full rounded-2xl border px-5 py-3 text-sm outline-none transition"
              style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--tx)' }}
            />
            <select
              value={cuisineFilter}
              onChange={(e) => setCuisineFilter(e.target.value)}
              className="w-full rounded-2xl border px-5 py-3 text-sm outline-none transition"
              style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--tx)' }}
            >
              <option value="all">All Cuisines</option>
              {cuisines.map((cuisine) => (
                <option key={cuisine} value={cuisine}>{cuisine}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-2xl border px-5 py-3 text-sm outline-none transition"
              style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--tx)' }}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="review">Review</option>
              <option value="onboarding">In Onboarding</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl p-4 text-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', border: '1px solid var(--danger-border)' }}>
            {error}
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }, (_, i) => <SkeletonCard key={i} />)
          ) : filteredRestaurants.length === 0 ? (
            <div className="col-span-full rounded-[2rem] border p-10 text-center" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <p style={{ color: 'var(--tx-3)' }}>No restaurants found with the selected filters.</p>
              {canCreate && (
                <Link
                  href="/restaurants/register"
                  className="no-underline mt-4 inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition hover:opacity-90"
                  style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-color)' }}
                >
                  Register the first one
                </Link>
              )}
            </div>
          ) : (
            filteredRestaurants.map((r) => <RestaurantCard key={r.id} r={r} />)
          )}
        </div>

      </div>
    </AuthGuard>
  );
}