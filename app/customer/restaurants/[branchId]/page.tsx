'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, SlidersHorizontal, ChevronDown, ShoppingCart, X, Plus, Minus,
  Star, Clock, Truck, Tag, Heart, ArrowLeft, Leaf, Flame, Zap,
} from 'lucide-react';
import {
  customerDiscoveryApi, customerCartApi, customerOrdersApi,
  resolveMediaUrl, AddToCartPayload,
} from '../../../../lib/api';
import {
  getCustomerToken, clearCustomerTokens, isCustomerTokenValid,
} from '../../../../lib/customer-auth';
import { useCartContext } from '../../cart-context';

// ── Types ──────────────────────────────────────────────────────────────────────

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
  id: string; name: string; description?: string;
  price: number; isVeg?: boolean; imageUrl?: string;
  addons?: Addon[];
  pricingRules?: PricingRule[]; pricingRule?: PricingRule;
  pricing_rules?: PricingRule[]; pricing_rule?: PricingRule;
  discount?: { valueType: 'PERCENTAGE' | 'FLAT'; value: number; title?: string; startsAt?: string; endsAt?: string };
};
type Category = { id: string; name: string; displayName: string; items: MenuItem[] };
type RestaurantInfo = {
  name: string; cuisine?: string; rating?: number;
  deliveryTime?: number; deliveryFee?: number; imageUrl?: string;
};
type SortKey = 'popularity' | 'price-low' | 'price-high' | 'rating';
type VegFilter = 'all' | 'veg' | 'nonveg';

// ── Design tokens ──────────────────────────────────────────────────────────────

const P      = '#5B3DF5';   // primary
const P2     = '#7C5CFF';   // secondary
const G      = '#16A34A';   // success / veg
const R      = '#EF4444';   // danger / non-veg
const BG     = '#F8FAFC';
const CARD   = '#FFFFFF';
const TX     = '#111827';
const MUTED  = '#6B7280';

const GRAD_CARDS = [
  'linear-gradient(135deg,#1E0050,#4C1D95)',
  'linear-gradient(135deg,#7F1D1D,#991B1B)',
  'linear-gradient(135deg,#064E3B,#065F46)',
  'linear-gradient(135deg,#1E3A5F,#1D4ED8)',
  'linear-gradient(135deg,#431407,#9A3412)',
  'linear-gradient(135deg,#3B0764,#6B21A8)',
];

const FOOD_EMOJIS = ['🍛','🍜','🍕','🍔','🌮','🍣','🥗','🍰','☕','🍝','🥘','🫕'];
const RATINGS     = ['4.1','4.2','4.3','4.4','4.5','3.9','4.0','4.6'];
const BADGES      = ['BESTSELLER','POPULAR','','TRENDING','','CHEFS_PICK','',''] as const;

function foodEmoji(i: number) { return FOOD_EMOJIS[i % FOOD_EMOJIS.length]; }
function getRating(i: number) { return RATINGS[i % RATINGS.length]; }
function getBadge(i: number) { return BADGES[i % BADGES.length]; }
function getCatEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('pizza'))                           return '🍕';
  if (n.includes('burger'))                          return '🍔';
  if (n.includes('biryani'))                         return '🍛';
  if (n.includes('chicken') || n.includes('non'))    return '🍗';
  if (n.includes('veg') && !n.includes('non'))       return '🥗';
  if (n.includes('dessert') || n.includes('sweet'))  return '🍰';
  if (n.includes('bread') || n.includes('garlic'))   return '🥖';
  if (n.includes('drink') || n.includes('beverage')) return '🥤';
  if (n.includes('side'))                            return '🥨';
  if (n.includes('noodle') || n.includes('pasta'))   return '🍜';
  return '🍽️';
}

// ── Veg / Non-veg dot ─────────────────────────────────────────────────────────

function VegDot({ isVeg }: { isVeg?: boolean }) {
  if (isVeg == null) return null;
  return (
    <div style={{
      width: 18, height: 18, borderRadius: 4, flexShrink: 0,
      border: `2.5px solid ${isVeg ? G : R}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: isVeg ? G : R }} />
    </div>
  );
}

// ── Offer ribbon ──────────────────────────────────────────────────────────────

function OfferRibbon({ label }: { label: string }) {
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0,
      background: `linear-gradient(135deg, ${G}, #15803D)`,
      color: '#fff', fontSize: 9, fontWeight: 900,
      letterSpacing: '0.06em', padding: '4px 10px',
      borderRadius: '16px 0 10px 0',
    }}>
      {label}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ style }: { style?: React.CSSProperties }) {
  return (
    <div
      className="animate-pulse"
      style={{ background: '#E5E7EB', borderRadius: 8, ...style }}
    />
  );
}

function PageSkeleton() {
  return (
    <div style={{ background: BG, minHeight: '100vh', display: 'flex' }}>
      {/* Sidebar skeleton */}
      <aside style={{ width: 260, flexShrink: 0, borderRight: '1px solid #E5E7EB', padding: 16, display: 'none' }} className="lg:block">
        <Skeleton style={{ height: 24, width: '70%', marginBottom: 24 }} />
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} style={{ height: 44, marginBottom: 8, borderRadius: 12 }} />
        ))}
      </aside>
      {/* Center skeleton */}
      <div style={{ flex: 1, padding: '16px' }}>
        <Skeleton style={{ height: 220, borderRadius: 20, marginBottom: 16 }} />
        <Skeleton style={{ height: 56, borderRadius: 16, marginBottom: 20 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} style={{ borderRadius: 16, overflow: 'hidden', background: CARD, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <Skeleton style={{ height: 180, borderRadius: 0 }} />
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Skeleton style={{ height: 14, width: '80%' }} />
                <Skeleton style={{ height: 11, width: '60%' }} />
                <Skeleton style={{ height: 32, marginTop: 4 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Quick View Modal ───────────────────────────────────────────────────────────

function QuickViewModal({
  item, idx, discountedPrice, discountLabel, cartQty, isAdding,
  onAdd, onRemove, onClose,
}: {
  item: MenuItem; idx: number; discountedPrice: number; discountLabel: string | null;
  cartQty: number; isAdding: boolean;
  onAdd: () => void; onRemove: () => void; onClose: () => void;
}) {
  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
      />
      <motion.div
        key="sheet"
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 91,
          background: CARD, borderRadius: '28px 28px 0 0',
          maxHeight: '88vh', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 -24px 70px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 0' }}>
          <div style={{ width: 40, height: 4, borderRadius: 999, background: '#E5E7EB' }} />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 120 }}>
          {/* Hero */}
          <div style={{ position: 'relative', height: 260, margin: '12px 16px 0', borderRadius: 20, overflow: 'hidden' }}>
            {item.imageUrl ? (
              <img src={resolveMediaUrl(item.imageUrl)} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: GRAD_CARDS[idx % GRAD_CARDS.length], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 80 }}>{foodEmoji(idx)}</span>
              </div>
            )}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 50%)' }} />
            <button onClick={onClose} style={{
              position: 'absolute', top: 14, right: 14,
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(255,255,255,0.9)', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}>
              <X size={16} color={TX} />
            </button>
            {discountLabel && <OfferRibbon label={discountLabel} />}
          </div>
          {/* Details */}
          <div style={{ padding: '20px 20px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <VegDot isVeg={item.isVeg} />
              <span style={{
                background: '#DCFCE7', color: G, fontSize: 11, fontWeight: 700,
                padding: '2px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 3,
              }}>
                <Star size={10} fill={G} color={G} /> {getRating(idx)}
              </span>
              {getBadge(idx) && (
                <span style={{ background: `${P}15`, color: P, fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 6 }}>
                  {getBadge(idx)}
                </span>
              )}
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: TX, margin: 0 }}>{item.name}</h2>
            <p style={{ fontSize: 14, color: MUTED, marginTop: 10, lineHeight: 1.7 }}>
              {item.description ?? 'A freshly prepared dish made with the finest ingredients.'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20 }}>
              <span style={{ fontSize: 28, fontWeight: 900, color: P }}>
                ₹{discountedPrice % 1 === 0 ? discountedPrice : discountedPrice.toFixed(2)}
              </span>
              {discountLabel && (
                <span style={{ fontSize: 16, color: '#CBD5E1', textDecoration: 'line-through' }}>₹{item.price}</span>
              )}
            </div>
            {item.addons && item.addons.length > 0 && (
              <div style={{ marginTop: 16, padding: '12px 14px', background: '#F8FAFC', borderRadius: 14, border: '1px solid #E5E7EB' }}>
                <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>
                  ⚙️ {item.addons.length} customization{item.addons.length > 1 ? 's' : ''} available
                </p>
              </div>
            )}
          </div>
        </div>
        {/* CTA */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 20px calc(env(safe-area-inset-bottom,0px) + 16px)', background: CARD, borderTop: '1px solid #F1F5F9' }}>
          {cartQty > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <motion.button whileTap={{ scale: 0.92 }} onClick={onRemove} disabled={isAdding} style={{ flex: 1, height: 50, borderRadius: 14, border: `2px solid ${P}`, background: CARD, color: P, fontSize: 22, fontWeight: 900, cursor: 'pointer' }}>−</motion.button>
              <div style={{ flex: 1, height: 50, borderRadius: 14, background: `${P}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: P }}>{cartQty}</div>
              <motion.button whileTap={{ scale: 0.92 }} onClick={onAdd} disabled={isAdding} style={{ flex: 1, height: 50, borderRadius: 14, border: `2px solid ${P}`, background: CARD, color: P, fontSize: 22, fontWeight: 900, cursor: 'pointer' }}>+</motion.button>
            </div>
          ) : (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onAdd}
              disabled={isAdding}
              style={{
                width: '100%', height: 52, borderRadius: 16,
                background: isAdding ? '#CBD5E1' : `linear-gradient(135deg, ${P}, ${P2})`,
                border: 'none', color: '#fff', fontSize: 16, fontWeight: 800,
                cursor: isAdding ? 'default' : 'pointer',
                boxShadow: isAdding ? 'none' : `0 12px 30px ${P}40`,
              }}
            >
              {isAdding ? 'Adding…' : 'Add to Cart'}
            </motion.button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Menu Item Card ────────────────────────────────────────────────────────────

function MenuItemCard({
  item, idx, discountedPrice, discountLabel, cartQty, orderedQty,
  isFav, isAdding, onAdd, onRemove, onToggleFav, onQuickView,
}: {
  item: MenuItem; idx: number; discountedPrice: number; discountLabel: string | null;
  cartQty: number; orderedQty: number; isFav: boolean; isAdding: boolean;
  onAdd: (e: React.MouseEvent) => void;
  onRemove: (e: React.MouseEvent) => void;
  onToggleFav: (e: React.MouseEvent) => void;
  onQuickView: () => void;
}) {
  const badge    = getBadge(idx);
  const inCart   = cartQty > 0;
  const rating   = getRating(idx);
  const hasOffer = !!discountLabel;
  const [imgHover, setImgHover] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(idx * 0.035, 0.35), duration: 0.3 }}
      whileHover={{ y: -4, boxShadow: `0 20px 50px rgba(91,61,245,0.12)` }}
      onClick={onQuickView}
      style={{
        position: 'relative', background: CARD,
        borderRadius: 20, overflow: 'hidden',
        border: `1.5px solid ${inCart ? P : '#E5E7EB'}`,
        boxShadow: inCart ? `0 4px 20px ${P}20` : '0 2px 10px rgba(0,0,0,0.06)',
        cursor: 'pointer', display: 'flex', flexDirection: 'column',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
    >
      {/* Image */}
      <div
        style={{ position: 'relative', height: 180, overflow: 'hidden', background: GRAD_CARDS[idx % GRAD_CARDS.length] }}
        onMouseEnter={() => setImgHover(true)}
        onMouseLeave={() => setImgHover(false)}
      >
        {item.imageUrl ? (
          <img
            src={resolveMediaUrl(item.imageUrl)}
            alt={item.name}
            loading="lazy"
            style={{
              width: '100%', height: '100%', objectFit: 'cover', display: 'block',
              transform: imgHover ? 'scale(1.07)' : 'scale(1)',
              transition: 'transform 0.45s ease',
            }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 60, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.35))', transition: 'transform 0.4s', transform: imgHover ? 'scale(1.15)' : 'scale(1)' }}>
              {foodEmoji(idx)}
            </span>
          </div>
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.3) 0%, transparent 50%)' }} />

        {/* Top-left ribbon */}
        {inCart ? (
          <div style={{
            position: 'absolute', top: 0, left: 0,
            background: `linear-gradient(135deg, ${P}, ${P2})`,
            color: '#fff', fontSize: 9, fontWeight: 900, letterSpacing: '0.06em',
            padding: '4px 10px', borderRadius: '18px 0 10px 0',
          }}>🛒 {cartQty} IN CART</div>
        ) : badge ? (
          <div style={{
            position: 'absolute', top: 0, left: 0,
            background: G, color: '#fff',
            fontSize: 9, fontWeight: 900, letterSpacing: '0.06em',
            padding: '4px 10px', borderRadius: '18px 0 10px 0',
          }}>{badge}</div>
        ) : hasOffer ? (
          <OfferRibbon label={discountLabel!} />
        ) : null}

        {/* Fav button */}
        <motion.button
          whileTap={{ scale: 0.7 }}
          onClick={onToggleFav}
          style={{
            position: 'absolute', top: 8, right: 8,
            width: 32, height: 32, borderRadius: '50%',
            background: isFav ? `${R}E8` : 'rgba(255,255,255,0.9)',
            backdropFilter: 'blur(6px)',
            border: `1px solid ${isFav ? R : 'rgba(0,0,0,0.08)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          }}
        >
          <Heart size={14} fill={isFav ? '#fff' : 'none'} color={isFav ? '#fff' : R} />
        </motion.button>

        {/* "Ordered before" badge */}
        {orderedQty > 0 && (
          <div style={{
            position: 'absolute', bottom: 8, left: 8,
            background: 'rgba(22,163,74,0.88)', backdropFilter: 'blur(6px)',
            color: '#fff', fontSize: 9, fontWeight: 700,
            padding: '3px 8px', borderRadius: 6,
          }}>✓ Ordered before</div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '12px 13px 14px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Veg dot */}
        <div style={{ marginBottom: 6 }}>
          <VegDot isVeg={item.isVeg} />
        </div>

        {/* Name */}
        <p style={{
          fontSize: 14, fontWeight: 700, color: TX, margin: 0, lineHeight: 1.3,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
        }}>{item.name}</p>

        {/* Description */}
        <p style={{
          fontSize: 11.5, color: MUTED, marginTop: 5, lineHeight: 1.5, flex: 1,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
        }}>
          {item.description ?? 'Freshly prepared with the finest ingredients.'}
        </p>

        {/* Rating */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            background: '#DCFCE7', color: G,
            fontSize: 11, fontWeight: 800, padding: '2px 7px', borderRadius: 6,
          }}>
            <Star size={9} fill={G} color={G} /> {rating}
          </span>
          {hasOffer && (
            <span style={{ fontSize: 10, color: G, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Tag size={9} />{discountLabel}
            </span>
          )}
        </div>

        {/* Price + Add */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: TX }}>
              ₹{discountedPrice % 1 === 0 ? discountedPrice : discountedPrice.toFixed(2)}
            </span>
            {hasOffer && (
              <span style={{ fontSize: 11, color: '#CBD5E1', textDecoration: 'line-through' }}>₹{item.price}</span>
            )}
          </div>

          {inCart ? (
            <div style={{
              display: 'flex', alignItems: 'center',
              border: `2px solid ${P}`, borderRadius: 10, overflow: 'hidden',
            }}>
              <button
                onClick={onRemove} disabled={isAdding}
                style={{
                  width: 30, height: 30, border: 'none', background: '#fff',
                  color: P, fontSize: 17, fontWeight: 900,
                  cursor: isAdding ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              ><Minus size={12} /></button>
              <div style={{
                width: 28, textAlign: 'center' as const, fontSize: 13, fontWeight: 900, color: P,
                borderLeft: `1px solid ${P}`, borderRight: `1px solid ${P}`, lineHeight: '30px',
              }}>{cartQty}</div>
              <button
                onClick={onAdd} disabled={isAdding}
                style={{
                  width: 30, height: 30, border: 'none', background: '#fff',
                  color: P, fontSize: 17, fontWeight: 900,
                  cursor: isAdding ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              ><Plus size={12} /></button>
            </div>
          ) : (
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={onAdd}
              disabled={isAdding}
              style={{
                padding: '6px 18px', background: '#fff',
                border: `2px solid ${P}`, borderRadius: 10,
                fontSize: 13, fontWeight: 800, color: P,
                cursor: isAdding ? 'default' : 'pointer',
                opacity: isAdding ? 0.6 : 1,
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!isAdding) {
                  (e.currentTarget as HTMLButtonElement).style.background = P;
                  (e.currentTarget as HTMLButtonElement).style.color = '#fff';
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = '#fff';
                (e.currentTarget as HTMLButtonElement).style.color = P;
              }}
            >
              {isAdding ? '…' : 'Add'}
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Cart Panel ─────────────────────────────────────────────────────────────────

function CartPanel({
  cartItems, cartTotal, onClose, onAdd, onRemove, onCheckout, deliveryFee,
  restaurantName, suggestions = [],
}: {
  cartItems: any[]; cartTotal: number; onClose?: () => void;
  onAdd: (item: any) => void; onRemove: (item: any) => void;
  onCheckout: () => void; deliveryFee: number;
  restaurantName?: string; suggestions?: any[];
}) {
  const totalQty = cartItems.reduce((s, ci) => s + (Number(ci.quantity) || 1), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff' }}>

      {/* ── Header ── */}
      <div style={{ padding: '16px 18px 12px', flexShrink: 0, borderBottom: '1px solid #F1F5F9' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 16, fontWeight: 800, color: '#111', margin: 0 }}>Your Cart</p>
            <p style={{ fontSize: 12, color: '#888', margin: '2px 0 0' }}>
              {totalQty} item{totalQty !== 1 ? 's' : ''}
              {restaurantName ? ` · ${restaurantName}` : ''}
            </p>
          </div>
          {onClose && (
            <button onClick={onClose} style={{ background: '#F4F4F5', border: 'none', cursor: 'pointer', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={14} color="#666" />
            </button>
          )}
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* Cart items */}
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {cartItems.map((ci, i) => {
            const price = Number(ci.unitPrice ?? ci.price ?? ci.totalPrice ?? 0);
            const qty   = Number(ci.quantity) || 1;
            const name  = ci.name ?? ci.menuItemName ?? ci.menuItem?.name ?? ci.item?.name ?? 'Item';
            const rawImg = ci.imageUrl ?? ci.menuItem?.imageUrl ?? ci.item?.imageUrl ?? null;
            const img    = rawImg ? resolveMediaUrl(rawImg) : null;
            return (
              <div key={ci.id ?? i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #F5F5F5' }}>
                {/* Food image / fallback emoji */}
                <div style={{ width: 44, height: 44, borderRadius: 10, background: '#FFF3E0', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {img
                    ? <img src={img} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: 22 }}>🍽️</span>
                  }
                </div>

                {/* Name + price×qty */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#111', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
                  <p style={{ fontSize: 12, color: '#999', margin: '2px 0 0' }}>₹{price.toFixed(2)} × {qty}</p>
                </div>

                {/* Stepper */}
                <div style={{ display: 'flex', alignItems: 'center', border: `1.5px solid ${P}`, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                  <button onClick={() => onRemove(ci)} style={{ width: 26, height: 26, border: 'none', background: '#fff', color: P, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Minus size={9} />
                  </button>
                  <span style={{ width: 24, textAlign: 'center' as const, fontSize: 12, fontWeight: 800, color: P, borderLeft: `1px solid ${P}`, borderRight: `1px solid ${P}`, lineHeight: '26px' }}>{qty}</span>
                  <button onClick={() => onAdd(ci)} style={{ width: 26, height: 26, border: 'none', background: '#fff', color: P, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Plus size={9} />
                  </button>
                </div>

                {/* Line total */}
                <p style={{ fontSize: 13, fontWeight: 700, color: G, margin: 0, flexShrink: 0, minWidth: 42, textAlign: 'right' as const }}>₹{(price * qty).toFixed(0)}</p>
              </div>
            );
          })}
        </div>

        {/* ── You might also like ── */}
        {suggestions.length > 0 && (
          <div style={{ padding: '12px 16px 8px' }}>
            <p style={{ fontSize: 10, fontWeight: 800, color: G, letterSpacing: '0.08em', textTransform: 'uppercase' as const, margin: '0 0 10px' }}>You might also like</p>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              {suggestions.slice(0, 5).map((s, i) => {
                const sImg  = s.imageUrl ? resolveMediaUrl(s.imageUrl) : null;
                const sPrice = Number(s.price ?? s.basePrice ?? 0);
                return (
                  <div key={s.id ?? i} style={{ flexShrink: 0, width: 90, border: '1px solid #EFEFEF', borderRadius: 12, overflow: 'hidden', background: '#FAFAFA', cursor: 'pointer' }} onClick={() => onAdd({ menuItemId: s.id, name: s.name, unitPrice: sPrice, quantity: 1 })}>
                    <div style={{ height: 56, background: '#FFF3E0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {sImg
                        ? <img src={sImg} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: 26 }}>🍽️</span>
                      }
                    </div>
                    <div style={{ padding: '6px 8px 8px' }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: '#111', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</p>
                      <p style={{ fontSize: 11, fontWeight: 700, color: G, margin: '2px 0 0' }}>₹{sPrice.toFixed(2)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Bill summary ── */}
        <div style={{ padding: '12px 16px 4px', borderTop: '1px solid #F1F5F9', marginTop: 4 }}>
          {[
            { label: 'Item total', value: cartTotal },
            { label: 'Delivery fee', value: deliveryFee },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}>
              <span style={{ fontSize: 13, color: '#666' }}>{label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>
                {value === 0 ? 'FREE' : `₹${Number(value).toFixed(0)}`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Action buttons ── */}
      <div style={{ padding: '10px 16px calc(env(safe-area-inset-bottom,0px) + 10px)', borderTop: '1px solid #F1F5F9', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onCheckout}
          style={{
            width: '100%', padding: '13px 0',
            background: `linear-gradient(135deg, ${P}, ${P2})`,
            border: 'none', borderRadius: 12,
            color: '#fff', fontSize: 14, fontWeight: 800,
            cursor: 'pointer', boxShadow: `0 6px 20px ${P}35`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          Proceed to Cart →
        </motion.button>
        {onClose && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onClose}
            style={{
              width: '100%', padding: '11px 0',
              background: '#fff', border: `1.5px solid #E5E7EB`,
              borderRadius: 12, color: '#444', fontSize: 14, fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Keep Adding
          </motion.button>
        )}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function RestaurantMenuPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const router       = useRouter();

  const [info, setInfo]               = useState<RestaurantInfo | null>(null);
  const [categories, setCategories]   = useState<Category[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [addingItem, setAddingItem]   = useState<string | null>(null);
  const [toast, setToast]             = useState('');
  const [toastOk, setToastOk]         = useState(true);
  const [cartMap, setCartMap]         = useState<Record<string, number>>({});
  const [cartItems, setCartItems]     = useState<any[]>([]);
  const [cartTotal, setCartTotal]     = useState(0);
  const [orderedMap, setOrderedMap]   = useState<Record<string, number>>({});
  const [activeCatId, setActiveCatId] = useState('');
  const [favorites, setFavorites]     = useState<Set<string>>(new Set());
  const [previewItem, setPreviewItem] = useState<{ item: MenuItem; idx: number } | null>(null);

  // New filter / search / sort state
  const [vegFilter, setVegFilter]     = useState<VegFilter>('all');
  const [sortBy, setSortBy]           = useState<SortKey>('popularity');
  const [search, setSearch]           = useState('');
  const [sortOpen, setSortOpen]       = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  const { setCartCount } = useCartContext();
  const catSidebarRef = useRef<HTMLDivElement>(null);
  const sectionRefs   = useRef<Record<string, HTMLElement | null>>({});

  // ── Cart helpers ─────────────────────────────────────────────────────────────

  const updateCartState = useCallback((items: any[]) => {
    const map: Record<string, number> = {};
    let total = 0, count = 0;
    items.forEach((ci) => {
      const id  = String(ci.menuItemId ?? ci.id ?? '');
      if (!id) return;
      const qty = Number(ci.quantity) || 1;
      map[id] = (map[id] || 0) + qty;
      total  += Number(ci.unitPrice ?? ci.price ?? ci.totalPrice ?? 0) * qty;
      count  += qty;
    });
    setCartMap(map); setCartItems(items); setCartTotal(total); setCartCount(count);
  }, [setCartCount]);

  const fetchCart = useCallback(async () => {
    if (!getCustomerToken() || !isCustomerTokenValid()) { clearCustomerTokens(); setCartCount(0); return; }
    try {
      const res   = await customerCartApi.get();
      const items: any[] = res.data?.items ?? res.data ?? [];
      updateCartState(Array.isArray(items) ? items : []);
    } catch (e: any) {
      if (e?.response?.status === 401) { clearCustomerTokens(); setCartCount(0); }
    }
  }, [updateCartState, setCartCount]);

  const getCartEntryByMenuItem = (menuItemId: string) =>
    cartItems.find((ci) => String(ci.menuItemId ?? ci.id ?? '') === String(menuItemId));

  // ── IntersectionObserver for sidebar active category ─────────────────────────

  useEffect(() => {
    if (categories.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { const id = e.target.getAttribute('data-cat-id'); if (id) setActiveCatId(id); } }),
      { rootMargin: '-10% 0px -75% 0px' },
    );
    Object.values(sectionRefs.current).forEach((el) => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [categories]);

  // Scroll active category into view in sidebar
  useEffect(() => {
    if (!activeCatId || !catSidebarRef.current) return;
    const el = catSidebarRef.current.querySelector(`[data-cat="${activeCatId}"]`) as HTMLElement | null;
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeCatId]);

  // ── Data loading ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!branchId) { setLoading(false); return; }
    if (branchId === 'undefined') { setError('Invalid restaurant. Please go back and pick one from the home screen.'); setLoading(false); return; }
    const load = async () => {
      try {
        const [detailRes, menuRes] = await Promise.all([
          customerDiscoveryApi.restaurantDetails(branchId),
          customerDiscoveryApi.menu(branchId),
        ]);
        const md  = menuRes.data;
        const raw = Array.isArray(md?.categories) ? md.categories : Array.isArray(md) ? md : [];
        const cats: Category[] = raw.map((cat: any) => ({
          ...cat,
          imageUrl: cat.imageUrl ?? cat.image_url,
          items: (Array.isArray(cat.items) ? cat.items : []).map((it: any) => ({
            ...it,
            imageUrl: it.imageUrl ?? it.image_url,
            pricingRules: it.pricingRules ?? it.pricing_rules ?? [],
            pricing_rules: it.pricingRules ?? it.pricing_rules ?? [],
            discount: it.discount,
            price: Number(it.price),
          })),
        }));
        const dd = detailRes.data;
        setInfo({ ...dd, imageUrl: dd.imageUrl ?? dd.image_url });
        setCategories(cats);
        if (cats.length > 0) setActiveCatId(cats[0].id);
      } catch (err: any) {
        setError(err?.response?.data?.message ?? 'Failed to load restaurant. Please try again.');
      } finally { setLoading(false); }
    };
    load();
    if (getCustomerToken() && isCustomerTokenValid()) {
      (async () => {
        await fetchCart();
        try {
          const ordersRes = await customerOrdersApi.history(1, 10);
          const rawOrders = Array.isArray(ordersRes.data) ? ordersRes.data : (ordersRes.data?.orders ?? ordersRes.data?.data ?? []);
          const oMap: Record<string, number> = {};
          await Promise.all(rawOrders.slice(0, 10).map(async (o: any) => {
            try {
              const det   = await customerOrdersApi.get(o.id ?? o.orderId);
              const items: any[] = det.data?.items ?? det.data ?? [];
              items.forEach((it) => { const key = String(it.menuItemId ?? it.id ?? it.name ?? ''); if (key) oMap[key] = (oMap[key] || 0) + (it.quantity ?? 1); });
            } catch { /* non-fatal */ }
          }));
          setOrderedMap(oMap);
        } catch { /* non-fatal */ }
      })();
    } else { clearCustomerTokens(); }
  }, [branchId, fetchCart]);

  // ── Pricing helpers ───────────────────────────────────────────────────────────

  const normRule = (raw: any): PricingRule => ({
    id: raw.id ?? `${raw.value}-${raw.valueType}`,
    ruleType: (String(raw.ruleType ?? raw.type ?? 'DISCOUNT')).toUpperCase() as PricingRule['ruleType'],
    valueType: (String(raw.valueType ?? raw.value_type ?? 'PERCENTAGE')).toUpperCase() as PricingRule['valueType'],
    value: Number(raw.value ?? raw.amount ?? 0),
    title: raw.title ?? raw.name,
    startsAt: raw.startsAt ?? raw.starts_at,
    endsAt: raw.endsAt ?? raw.ends_at,
  });

  const getRules = (item: MenuItem) => {
    const r: any[] = [];
    if (item.pricingRules)  r.push(...(Array.isArray(item.pricingRules) ? item.pricingRules : [item.pricingRules]));
    if (item.pricing_rules) r.push(...(Array.isArray(item.pricing_rules) ? item.pricing_rules : [item.pricing_rules]));
    if (item.pricingRule)   r.push(item.pricingRule);
    if (item.pricing_rule)  r.push(item.pricing_rule);
    if (item.discount && Number(item.discount.value) > 0) r.push({ ruleType: 'DISCOUNT', ...item.discount });
    return r.map(normRule);
  };

  const activeRule = (item: MenuItem) => {
    const now = new Date();
    return getRules(item)
      .filter((r) => r.ruleType === 'DISCOUNT')
      .filter((r) => !r.startsAt || new Date(r.startsAt) <= now)
      .filter((r) => !r.endsAt   || new Date(r.endsAt)   >= now)
      .sort((a, b) => {
        const va = a.valueType === 'PERCENTAGE' ? a.value : Math.min(a.value, item.price);
        const vb = b.valueType === 'PERCENTAGE' ? b.value : Math.min(b.value, item.price);
        return vb - va;
      })[0];
  };

  const getDiscountedPrice = (item: MenuItem) => {
    const r = activeRule(item);
    if (!r) return item.price;
    return r.valueType === 'PERCENTAGE'
      ? Math.max(0, Number((item.price * (1 - r.value / 100)).toFixed(2)))
      : Math.max(0, Number((item.price - r.value).toFixed(2)));
  };

  const getDiscountLabel = (item: MenuItem): string | null => {
    const r = activeRule(item);
    if (!r) return null;
    return r.valueType === 'PERCENTAGE' ? `${r.value}% OFF` : `₹${r.value} OFF`;
  };

  // ── Actions ───────────────────────────────────────────────────────────────────

  const showToast = (msg: string, ok = true) => { setToast(msg); setToastOk(ok); setTimeout(() => setToast(''), 2600); };

  const handleAdd = async (item: MenuItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!getCustomerToken() || !isCustomerTokenValid()) { clearCustomerTokens(); router.push('/customer/auth/login'); return; }
    setAddingItem(item.id);
    try {
      await customerCartApi.addItem({ menuItemId: String(item.id), branchId: branchId ? String(branchId) : undefined, quantity: 1 } as AddToCartPayload);
      await fetchCart();
      showToast(`${item.name} added to cart 🎉`, true);
    } catch (err: any) {
      if (err?.response?.status === 401) { clearCustomerTokens(); router.push('/customer/auth/login'); return; }
      showToast(err?.response?.data?.message ?? 'Could not add item', false);
    } finally { setAddingItem(null); }
  };

  const handleRemove = async (item: MenuItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!getCustomerToken() || !isCustomerTokenValid()) { clearCustomerTokens(); router.push('/customer/auth/login'); return; }
    const cartEntry   = getCartEntryByMenuItem(item.id);
    if (!cartEntry)   return;
    const cartItemId  = String(cartEntry.id ?? cartEntry.menuItemId ?? '');
    if (!cartItemId)  return;
    setAddingItem(item.id);
    try {
      const qty = Number(cartEntry.quantity) || 1;
      if (qty > 1) await customerCartApi.updateItem(cartItemId, qty - 1);
      else         await customerCartApi.removeItem(cartItemId);
      await fetchCart();
      showToast(`${item.name} updated.`, true);
    } catch (err: any) {
      if (err?.response?.status === 401) { clearCustomerTokens(); router.push('/customer/auth/login'); return; }
      showToast(err?.response?.data?.message ?? 'Could not update cart', false);
    } finally { setAddingItem(null); }
  };

  const handleCartItemAdd = async (ci: any) => {
    const menuItemId = String(ci.menuItemId ?? ci.id ?? '');
    const item = categories.flatMap((c) => c.items).find((it) => String(it.id) === menuItemId);
    if (item) await handleAdd(item);
  };

  const handleCartItemRemove = async (ci: any) => {
    const cartItemId = String(ci.id ?? '');
    if (!cartItemId) return;
    try {
      const qty = Number(ci.quantity) || 1;
      if (qty > 1) await customerCartApi.updateItem(cartItemId, qty - 1);
      else         await customerCartApi.removeItem(cartItemId);
      await fetchCart();
    } catch { /* non-fatal */ }
  };

  const handleToggleFav = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) { next.delete(itemId); showToast('Removed from favourites', true); }
      else { next.add(itemId); showToast('Added to favourites ❤️', true); }
      return next;
    });
  };

  const scrollToCat = (catId: string) => {
    const el  = sectionRefs.current[catId];
    if (!el)  return;
    const top = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: 'smooth' });
    setActiveCatId(catId);
  };

  // ── Derived: filtered + sorted categories ────────────────────────────────────

  const allItems = useMemo(() => categories.flatMap((c) => c.items), [categories]);

  const filteredCategories = useMemo(() => {
    return categories.map((cat) => ({
      ...cat,
      items: cat.items
        .filter((item) => {
          if (vegFilter === 'veg')    return item.isVeg === true;
          if (vegFilter === 'nonveg') return item.isVeg === false;
          return true;
        })
        .filter((item) => {
          if (!search.trim()) return true;
          const q = search.toLowerCase();
          return item.name.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q);
        })
        .sort((a, b) => {
          if (sortBy === 'price-low')  return getDiscountedPrice(a) - getDiscountedPrice(b);
          if (sortBy === 'price-high') return getDiscountedPrice(b) - getDiscountedPrice(a);
          if (sortBy === 'rating') {
            const idxA = allItems.indexOf(a);
            const idxB = allItems.indexOf(b);
            return parseFloat(getRating(idxB)) - parseFloat(getRating(idxA));
          }
          return 0;
        }),
    })).filter((cat) => cat.items.length > 0);
  }, [categories, vegFilter, search, sortBy, allItems]);

  const totalItems = cartItems.reduce((s, ci) => s + (Number(ci.quantity) || 1), 0);
  const SORT_LABELS: Record<SortKey, string> = {
    popularity: 'Popularity', 'price-low': 'Price: Low to High',
    'price-high': 'Price: High to Low', rating: 'Rating',
  };

  // ── Render guards ─────────────────────────────────────────────────────────────

  if (loading) return <PageSkeleton />;

  if (error) return (
    <div style={{ background: BG, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <div style={{ fontSize: 56 }}>😕</div>
      <p style={{ fontSize: 16, fontWeight: 700, color: TX, marginTop: 16, textAlign: 'center' }}>{error}</p>
      <button onClick={() => router.back()} style={{ marginTop: 20, background: `linear-gradient(135deg,${P},${P2})`, color: '#fff', border: 'none', borderRadius: 999, padding: '10px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>← Go Back</button>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div style={{ background: BG, minHeight: '100vh' }}>

      {/* ── Toast ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            style={{
              position: 'fixed', bottom: totalItems > 0 ? 90 : 24, left: '50%',
              transform: 'translateX(-50%)', zIndex: 200, whiteSpace: 'nowrap',
              background: toastOk ? TX : '#FEE2E2',
              borderRadius: 999, padding: '10px 22px',
              fontSize: 13, fontWeight: 600,
              color: toastOk ? '#fff' : R,
              boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
            }}
          >{toast}</motion.div>
        )}
      </AnimatePresence>

      {/* ── Quick View Modal ───────────────────────────────────────────── */}
      {previewItem && (
        <QuickViewModal
          item={previewItem.item}
          idx={previewItem.idx}
          discountedPrice={getDiscountedPrice(previewItem.item)}
          discountLabel={getDiscountLabel(previewItem.item)}
          cartQty={cartMap[String(previewItem.item.id)] || 0}
          isAdding={addingItem === previewItem.item.id}
          onAdd={() => handleAdd(previewItem.item)}
          onRemove={() => handleRemove(previewItem.item)}
          onClose={() => setPreviewItem(null)}
        />
      )}

      {/* ── Mobile Cart Bottom Sheet ───────────────────────────────────── */}
      <AnimatePresence>
        {mobileCartOpen && totalItems > 0 && (
          <>
            <motion.div key="cart-bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileCartOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 95, background: 'rgba(0,0,0,0.5)' }} />
            <motion.div key="cart-sheet"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 300 }}
              style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 96,
                height: '80vh', borderRadius: '24px 24px 0 0', overflow: 'hidden',
                boxShadow: '0 -20px 60px rgba(0,0,0,0.25)',
              }}
            >
              <CartPanel
                cartItems={cartItems} cartTotal={cartTotal}
                onClose={() => setMobileCartOpen(false)}
                onAdd={handleCartItemAdd} onRemove={handleCartItemRemove}
                onCheckout={() => router.push('/customer/checkout')}
                deliveryFee={info?.deliveryFee ?? 0}
                restaurantName={info?.name}
                suggestions={categories.flatMap(c => c.items).filter(it => !cartItems.some(ci => String(ci.menuItemId ?? ci.id) === String(it.id))).slice(0, 5)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Sort dropdown backdrop ─────────────────────────────────────── */}
      {sortOpen && (
        <div onClick={() => setSortOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
      )}

      {/* ── Restaurant Hero ────────────────────────────────────────────── */}
      {info && (
        <div style={{ position: 'relative', height: 240, overflow: 'hidden', background: 'linear-gradient(135deg,#1E0050,#4C1D95)' }}>
          {info.imageUrl ? (
            <img src={resolveMediaUrl(info.imageUrl)} alt={info.name} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 100, opacity: 0.2 }}>🍽️</div>
          )}
          {/* Gradient overlay */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.75) 100%)' }} />

          {/* Back button */}
          <button
            onClick={() => router.back()}
            style={{
              position: 'absolute', top: 16, left: 16,
              width: 38, height: 38, borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={18} color="#fff" />
          </button>

          {/* Info overlay */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 20px 20px' }}>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: '#fff', margin: 0, lineHeight: 1.2, textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>{info.name}</h1>
            {info.cuisine && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>{info.cuisine}</p>}

            {/* Stats pills */}
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              {info.rating != null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', borderRadius: 999, padding: '4px 12px', border: '1px solid rgba(255,255,255,0.2)' }}>
                  <Star size={11} fill="#FBBF24" color="#FBBF24" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{info.rating.toFixed(1)}</span>
                </div>
              )}
              {info.deliveryTime != null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', borderRadius: 999, padding: '4px 12px', border: '1px solid rgba(255,255,255,0.2)' }}>
                  <Clock size={11} color="#fff" />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{info.deliveryTime} min</span>
                </div>
              )}
              {info.deliveryFee != null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: info.deliveryFee === 0 ? 'rgba(22,163,74,0.3)' : 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', borderRadius: 999, padding: '4px 12px', border: `1px solid ${info.deliveryFee === 0 ? 'rgba(22,163,74,0.5)' : 'rgba(255,255,255,0.2)'}` }}>
                  <Truck size={11} color={info.deliveryFee === 0 ? '#86EFAC' : '#fff'} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: info.deliveryFee === 0 ? '#86EFAC' : '#fff' }}>
                    {info.deliveryFee === 0 ? 'Free Delivery' : `₹${info.deliveryFee}`}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Main 3-column Layout ───────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', maxWidth: 1400, margin: '0 auto' }}>

        {/* ══ LEFT SIDEBAR ══════════════════════════════════════════════ */}
        <aside
          ref={catSidebarRef}
          className="hidden lg:flex"
          style={{
            width: 260, flexShrink: 0,
            position: 'sticky', top: 0, height: '100vh',
            overflowY: 'auto', flexDirection: 'column',
            background: CARD,
            borderRight: '1px solid #E5E7EB',
            boxShadow: '2px 0 12px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ padding: '20px 16px 12px' }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              Menu
            </p>
            <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>
              {categories.reduce((s, c) => s + c.items.length, 0)} items
            </p>
          </div>

          <nav style={{ padding: '0 10px 20px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {categories.map((cat) => {
              const isActive = activeCatId === cat.id;
              const emoji    = getCatEmoji(cat.displayName || cat.name);
              return (
                <button
                  key={cat.id}
                  data-cat={cat.id}
                  onClick={() => scrollToCat(cat.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '11px 14px',
                    background: isActive ? `${P}10` : 'transparent',
                    border: 'none',
                    borderLeft: `3px solid ${isActive ? P : 'transparent'}`,
                    borderRadius: '0 12px 12px 0',
                    cursor: 'pointer', textAlign: 'left' as const,
                    transition: 'all 0.18s ease',
                  }}
                >
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{emoji}</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? P : TX, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {cat.displayName || cat.name}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, flexShrink: 0,
                    background: isActive ? P : '#F1F5F9',
                    color: isActive ? '#fff' : MUTED,
                    padding: '1px 7px', borderRadius: 999,
                    transition: 'all 0.18s ease',
                  }}>
                    {cat.items.length}
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ══ CENTER CONTENT ════════════════════════════════════════════ */}
        <main style={{ flex: 1, minWidth: 0 }}>

          {/* ── Sticky Filter Bar ───────────────────────────────────── */}
          <div style={{
            position: 'sticky', top: 0, zIndex: 40,
            background: 'rgba(248,250,252,0.95)', backdropFilter: 'blur(20px)',
            borderBottom: '1px solid #E5E7EB',
            padding: '12px 16px',
          }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>

              {/* Veg filter pills */}
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                {([['all', 'All'], ['veg', 'Veg'], ['nonveg', 'Non Veg']] as [VegFilter, string][]).map(([key, label]) => {
                  const active = vegFilter === key;
                  const color  = key === 'veg' ? G : key === 'nonveg' ? R : P;
                  return (
                    <button
                      key={key}
                      onClick={() => setVegFilter(key)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '6px 14px', borderRadius: 999,
                        border: `1.5px solid ${active ? color : '#E5E7EB'}`,
                        background: active ? `${color}12` : CARD,
                        fontSize: 12, fontWeight: active ? 700 : 500,
                        color: active ? color : MUTED,
                        cursor: 'pointer', transition: 'all 0.15s ease',
                        flexShrink: 0,
                      }}
                    >
                      {key === 'veg'    && <Leaf size={11} color={active ? G : MUTED} />}
                      {key === 'nonveg' && <Flame size={11} color={active ? R : MUTED} />}
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Search */}
              <div style={{ flex: 1, minWidth: 160, position: 'relative' }}>
                <Search size={14} color={MUTED} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search your favourite food..."
                  style={{
                    width: '100%', height: 38, borderRadius: 10,
                    border: '1.5px solid #E5E7EB',
                    background: CARD, paddingLeft: 36, paddingRight: search ? 32 : 12,
                    fontSize: 13, color: TX, outline: 'none',
                    fontFamily: 'inherit',
                    transition: 'border-color 0.15s',
                    boxSizing: 'border-box' as const,
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = P; }}
                  onBlur={(e)  => { e.currentTarget.style.borderColor = '#E5E7EB'; }}
                />
                {search && (
                  <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                    <X size={12} color={MUTED} />
                  </button>
                )}
              </div>

              {/* Sort dropdown */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <button
                  onClick={() => setSortOpen(!sortOpen)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 13px', borderRadius: 10,
                    border: '1.5px solid #E5E7EB', background: CARD,
                    fontSize: 12, fontWeight: 500, color: MUTED,
                    cursor: 'pointer',
                  }}
                >
                  <SlidersHorizontal size={13} />
                  <span className="hidden sm:inline">{SORT_LABELS[sortBy]}</span>
                  <span className="sm:hidden">Sort</span>
                  <ChevronDown size={12} style={{ transform: sortOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
                <AnimatePresence>
                  {sortOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      style={{
                        position: 'absolute', right: 0, top: '110%',
                        background: CARD, borderRadius: 14,
                        border: '1px solid #E5E7EB', boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
                        zIndex: 60, minWidth: 200, overflow: 'hidden',
                      }}
                    >
                      {(Object.entries(SORT_LABELS) as [SortKey, string][]).map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => { setSortBy(key); setSortOpen(false); }}
                          style={{
                            width: '100%', padding: '12px 16px', border: 'none',
                            background: sortBy === key ? `${P}08` : 'transparent',
                            textAlign: 'left' as const, fontSize: 13,
                            fontWeight: sortBy === key ? 700 : 400,
                            color: sortBy === key ? P : TX,
                            cursor: 'pointer', display: 'block',
                            borderLeft: `3px solid ${sortBy === key ? P : 'transparent'}`,
                          }}
                        >{label}</button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Mobile: horizontal category tabs */}
            {categories.length > 1 && (
              <div className="flex lg:hidden overflow-x-auto" style={{ gap: 6, marginTop: 10, paddingBottom: 2 }}>
                {categories.map((cat) => {
                  const isActive = activeCatId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => scrollToCat(cat.id)}
                      style={{
                        flexShrink: 0, padding: '6px 14px',
                        border: `1.5px solid ${isActive ? P : '#E5E7EB'}`,
                        borderRadius: 999, background: isActive ? `${P}12` : CARD,
                        fontSize: 12, fontWeight: isActive ? 700 : 500,
                        color: isActive ? P : MUTED, cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {cat.displayName || cat.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Menu Sections ────────────────────────────────────────── */}
          {filteredCategories.length === 0 ? (
            <div style={{ padding: '80px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 60, marginBottom: 16 }}>🍽️</div>
              <p style={{ fontSize: 18, fontWeight: 700, color: TX }}>No items found</p>
              <p style={{ fontSize: 14, color: MUTED, marginTop: 6 }}>
                {search ? `No results for "${search}"` : 'Try changing your filter'}
              </p>
              <button onClick={() => { setSearch(''); setVegFilter('all'); }} style={{ marginTop: 16, padding: '10px 24px', background: `linear-gradient(135deg,${P},${P2})`, color: '#fff', border: 'none', borderRadius: 999, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Clear Filters
              </button>
            </div>
          ) : (
            <div style={{ padding: '8px 0 120px' }}>
              {filteredCategories.map((cat, catIdx) => (
                <section
                  key={cat.id}
                  data-cat-id={cat.id}
                  ref={(el) => { sectionRefs.current[cat.id] = el; }}
                >
                  {/* Category header */}
                  <div style={{ padding: '20px 16px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 24 }}>{getCatEmoji(cat.displayName || cat.name)}</span>
                      <div>
                        <h2 style={{ fontSize: 18, fontWeight: 800, color: TX, margin: 0 }}>
                          {cat.displayName || cat.name}
                        </h2>
                        <p style={{ fontSize: 12, color: MUTED, margin: '2px 0 0' }}>
                          {cat.items.length} item{cat.items.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div style={{ height: 2, background: `linear-gradient(90deg,${P}30,transparent)`, marginTop: 12, borderRadius: 2 }} />
                  </div>

                  {/* 3-column grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 16, padding: '0 16px 8px' }}>
                    {cat.items.map((item) => {
                      const globalIdx = allItems.indexOf(item);
                      const idx       = globalIdx >= 0 ? globalIdx : catIdx;
                      return (
                        <MenuItemCard
                          key={item.id}
                          item={item}
                          idx={idx}
                          discountedPrice={getDiscountedPrice(item)}
                          discountLabel={getDiscountLabel(item)}
                          cartQty={cartMap[String(item.id)] || 0}
                          orderedQty={orderedMap[String(item.id)] || 0}
                          isFav={favorites.has(item.id)}
                          isAdding={addingItem === item.id}
                          onAdd={(e) => handleAdd(item, e)}
                          onRemove={(e) => handleRemove(item, e)}
                          onToggleFav={(e) => handleToggleFav(item.id, e)}
                          onQuickView={() => setPreviewItem({ item, idx })}
                        />
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </main>

        {/* ══ RIGHT CART PANEL (desktop) ════════════════════════════════ */}
        <AnimatePresence>
          {totalItems > 0 && (
            <motion.aside
              key="cart-panel"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 360, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 260 }}
              className="hidden lg:block"
              style={{
                flexShrink: 0, position: 'sticky', top: 0,
                height: '100vh', overflow: 'hidden',
              }}
            >
              <CartPanel
                cartItems={cartItems}
                cartTotal={cartTotal}
                onAdd={handleCartItemAdd}
                onRemove={handleCartItemRemove}
                onCheckout={() => router.push('/customer/checkout')}
                deliveryFee={info?.deliveryFee ?? 0}
                restaurantName={info?.name}
                suggestions={categories.flatMap(c => c.items).filter(it => !cartItems.some(ci => String(ci.menuItemId ?? ci.id) === String(it.id))).slice(0, 5)}
              />
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* ── Mobile floating cart button ────────────────────────────────── */}
      <AnimatePresence>
        {totalItems > 0 && (
          <motion.div
            key="mobile-cart"
            className="lg:hidden"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            style={{
              position: 'fixed', bottom: 16, left: 16, right: 16, zIndex: 80,
            }}
          >
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setMobileCartOpen(true)}
              style={{
                width: '100%', padding: '14px 20px',
                background: `linear-gradient(135deg, ${P}, ${P2})`,
                border: 'none', borderRadius: 18,
                color: '#fff', fontSize: 15, fontWeight: 800,
                cursor: 'pointer', boxShadow: `0 12px 40px ${P}50`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: '3px 8px', fontSize: 12, fontWeight: 800 }}>
                  {totalItems}
                </div>
                <span>View Cart</span>
              </div>
              <span style={{ fontSize: 15, fontWeight: 800 }}>₹{cartTotal.toFixed(2)}</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
