'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  customerDiscoveryApi, customerCartApi, customerOrdersApi, resolveMediaUrl, AddToCartPayload,
} from '../../../../lib/api';
import {
  getCustomerToken, clearCustomerTokens, isCustomerTokenValid,
} from '../../../../lib/customer-auth';
import { useCartContext } from '../../cart-context';

// ── Types ──────────────────────────────────────────────────────────────────

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

// ── Design-system constants (CSS-variable-driven for light+dark support) ───

const GOLD    = 'var(--accent)';
const GOLD_DK = 'var(--accent-2)';
const GOLD_LT = 'var(--accent-bright)';
const SURFACE = 'var(--surface)';
const BG      = 'var(--bg)';
const CREAM   = 'var(--tx)';

// ── Visual metadata generators (enrich UX without fake data) ──────────────

function getBadge(idx: number): 'BESTSELLER' | 'POPULAR' | 'CHEFS_SPECIAL' | 'TRENDING' | '' {
  if (idx % 7 === 0) return 'BESTSELLER';
  if (idx % 7 === 2) return 'POPULAR';
  if (idx % 7 === 4) return 'TRENDING';
  if (idx % 11 === 9) return 'CHEFS_SPECIAL';
  return '';
}

function getPrepTime(idx: number): number {
  return 10 + (idx % 5) * 5; // 10–30 min
}

function getRating(idx: number): string {
  const ratings = ['4.1', '4.2', '4.3', '4.4', '4.5', '3.9', '4.0', '4.6'];
  return ratings[idx % ratings.length];
}

const FOOD_EMOJIS = ['🍛', '🍜', '🍕', '🍔', '🌮', '🍣', '🥗', '🍰', '☕', '🍝', '🥘', '🫕'];
function foodEmoji(idx: number) { return FOOD_EMOJIS[idx % FOOD_EMOJIS.length]; }

function getCatEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('biryani'))                        return '🍛';
  if (n.includes('pizza'))                          return '🍕';
  if (n.includes('burger'))                         return '🍔';
  if (n.includes('chicken') || n.includes('non-veg')) return '🍗';
  if (n.includes('veg') && !n.includes('non'))      return '🥗';
  if (n.includes('dessert') || n.includes('sweet') || n.includes('brownie') || n.includes('cake')) return '🍰';
  if (n.includes('noodle') || n.includes('rice'))   return '🍜';
  if (n.includes('drink') || n.includes('beverage') || n.includes('juice')) return '🥤';
  if (n.includes('bread') || n.includes('bakery'))  return '🥖';
  if (n.includes('snack') || n.includes('starter')) return '🥨';
  if (n.includes('sea') || n.includes('fish') || n.includes('prawn')) return '🦐';
  if (n.includes('coffee') || n.includes('café') || n.includes('cafe')) return '☕';
  if (n.includes('wrap') || n.includes('roll'))     return '🌯';
  if (n.includes('combo') || n.includes('meal'))    return '🎁';
  if (n.includes('special') || n.includes('weekend')) return '⭐';
  if (n.includes('indo') || n.includes('chinese'))  return '🥡';
  return '🍽️';
}

const ITEM_IMG_GRADIENTS = [
  'linear-gradient(135deg, #1E0050 0%, #4C1D95 100%)',
  'linear-gradient(135deg, #7F1D1D 0%, #991B1B 100%)',
  'linear-gradient(135deg, #064E3B 0%, #065F46 100%)',
  'linear-gradient(135deg, #1E3A5F 0%, #1D4ED8 100%)',
  'linear-gradient(135deg, #431407 0%, #9A3412 100%)',
  'linear-gradient(135deg, #3B0764 0%, #6B21A8 100%)',
];

// ── Badge component ────────────────────────────────────────────────────────

function Badge({ type }: { type: 'BESTSELLER' | 'POPULAR' | 'CHEFS_SPECIAL' | 'TRENDING' }) {
  const styles: Record<string, { bg: string; color: string; label: string; icon: string }> = {
    BESTSELLER:  { bg: 'linear-gradient(135deg,#6B4F00,#C49A0A)', color: '#FFF7D6', label: 'Bestseller',   icon: '⭐' },
    POPULAR:     { bg: 'rgba(251,146,60,0.14)',  color: '#FB923C', label: 'Popular',      icon: '🔥' },
    CHEFS_SPECIAL:{ bg: 'rgba(167,139,250,0.12)', color: '#A78BFA', label: "Chef's Pick",  icon: '👨‍🍳' },
    TRENDING:    { bg: 'rgba(251,191,36,0.12)', color: '#FBBF24', label: 'Trending',      icon: '📈' },
  };
  const s = styles[type];
  return (
    <span style={{
      background: s.bg,
      color: s.color,
      border: type === 'BESTSELLER' ? 'none' : `1px solid ${s.color}30`,
      fontSize: 9, fontWeight: 900, padding: '2px 8px',
      borderRadius: 5, textTransform: 'uppercase' as const, letterSpacing: '0.04em',
      boxShadow: type === 'BESTSELLER' ? '0 2px 10px rgba(212,160,23,0.3)' : 'none',
    }}>
      {s.icon} {s.label}
    </span>
  );
}

// ── Quick Preview Modal ────────────────────────────────────────────────────

function QuickViewModal({
  item, idx, discountedPrice, discountLabel, cartQty, isAdding,
  onAdd, onRemove, onClose,
}: {
  item: MenuItem; idx: number; discountedPrice: number; discountLabel: string | null;
  cartQty: number; isAdding: boolean;
  onAdd: () => void; onRemove: () => void; onClose: () => void;
}) {
  const badge    = getBadge(idx);
  const prepTime = getPrepTime(idx);
  const hasDiscount = discountLabel !== null;

  return (
    <AnimatePresence>
      <motion.div
        key="qv-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 80,
          background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(6px)',
        }}
      />
      <motion.div
        key="qv-sheet"
        initial={{ y: '100%', opacity: 0.85 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 81,
          background: '#ffffff',
          borderTop: '1px solid rgba(15,23,42,0.08)',
          borderRadius: '28px 28px 0 0',
          maxHeight: '88vh',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 -24px 70px rgba(15,23,42,0.18)',
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 0' }}>
          <div style={{ width: 42, height: 4, borderRadius: 999, background: 'rgba(15,23,42,0.12)' }} />
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 134 }}>
          {/* Hero image */}
          <div style={{ position: 'relative', height: 260, margin: '12px 16px 0', borderRadius: 22, overflow: 'hidden', boxShadow: '0 24px 60px rgba(15,23,42,0.08)' }}>
            {item.imageUrl ? (
              <img src={resolveMediaUrl(item.imageUrl)} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{
                width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, #F8F0D1 0%, #E8D09C 100%)',
              }}>
                <span style={{ fontSize: 72, filter: 'drop-shadow(0 8px 20px rgba(15,23,42,0.16))' }}>{foodEmoji(idx)}</span>
              </div>
            )}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 55%)' }} />
            {/* Close button */}
            <button
              onClick={onClose}
              style={{
                position: 'absolute', top: 14, right: 14,
                width: 38, height: 38, borderRadius: '50%',
                background: 'rgba(255,255,255,0.92)',
                border: '1px solid rgba(15,23,42,0.08)',
                color: '#111827', fontSize: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 12px 24px rgba(15,23,42,0.12)',
              }}
            >✕</button>
            {/* Discount ribbon */}
            {hasDiscount && discountLabel && (
              <div style={{
                position: 'absolute', top: 14, left: 14,
                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                borderRadius: 999, padding: '5px 13px', fontSize: 11, fontWeight: 900, color: '#ffffff',
                boxShadow: '0 10px 24px rgba(249,115,22,0.18)',
              }}>{discountLabel}</div>
            )}
          </div>

          {/* Info */}
          <div style={{ padding: '20px 20px 0' }}>
            {/* Veg indicator + badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              {item.isVeg != null && (
                <div style={{
                  width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                  border: `2.5px solid ${item.isVeg ? '#22c55e' : '#ef4444'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.isVeg ? '#22c55e' : '#ef4444' }} />
                </div>
              )}
              {badge && <Badge type={badge} />}
            </div>

            {/* Name */}
            <h2 style={{ fontSize: 22, fontWeight: 900, color: CREAM, margin: 0, lineHeight: 1.2 }}>{item.name}</h2>

            {/* Metadata row */}
            <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'rgba(212,175,55,0.55)', display: 'flex', alignItems: 'center', gap: 4 }}>
                🕒 {prepTime} min prep
              </span>
              <span style={{ fontSize: 12, color: item.isVeg ? 'rgba(74,222,128,0.7)' : 'rgba(248,113,113,0.7)', display: 'flex', alignItems: 'center', gap: 4 }}>
                {item.isVeg ? '🌿 Vegetarian' : '🍖 Non-Veg'}
              </span>
            </div>

            {/* Description */}
            {item.description ? (
              <p style={{ fontSize: 15, color: '#475569', marginTop: 16, lineHeight: 1.75 }}>{item.description}</p>
            ) : (
              <p style={{ fontSize: 15, color: '#94A3B8', marginTop: 16, lineHeight: 1.75, fontStyle: 'italic' }}>
                A freshly prepared dish made with the finest ingredients.
              </p>
            )}

            {/* Price */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 22, flexWrap: 'wrap' }}>
              <p style={{ fontSize: 28, fontWeight: 900, color: '#C47B06', margin: 0 }}>
                ₹{discountedPrice % 1 === 0 ? discountedPrice : discountedPrice.toFixed(2)}
              </p>
              {hasDiscount && (
                <p style={{ fontSize: 15, color: 'rgba(212,175,55,0.38)', textDecoration: 'line-through', margin: 0 }}>₹{item.price}</p>
              )}
              {hasDiscount && discountLabel && (
                <span style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.22)', color: '#4ade80', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 8 }}>{discountLabel}</span>
              )}
            </div>

            {/* Addons note */}
            {item.addons && item.addons.length > 0 && (
              <div style={{ marginTop: 16, padding: '14px 16px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 16 }}>
                <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>
                  ⚙️ Customizable · {item.addons.length} add-on option{item.addons.length !== 1 ? 's' : ''} available
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sticky bottom CTA */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '18px 22px calc(env(safe-area-inset-bottom, 0px) + 18px)',
          background: '#ffffff',
          borderTop: '1px solid rgba(15,23,42,0.08)',
        }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            {cartQty > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                <button
                  onClick={onRemove}
                  disabled={isAdding}
                  style={{
                    width: 46, height: 46, borderRadius: 14,
                    border: '1px solid rgba(15,23,42,0.12)',
                    background: isAdding ? '#F8FAFC' : '#ffffff',
                    color: '#166534', fontSize: 22, fontWeight: 900,
                    cursor: isAdding ? 'default' : 'pointer',
                  }}
                >
                  −
                </button>
                <div style={{
                  flex: 1, minWidth: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: '#F8FAFC', borderRadius: 14,
                  border: '1px solid rgba(226,232,240,0.9)', padding: '16px 12px',
                  fontSize: 16, fontWeight: 900, color: '#111827',
                }}>
                  {cartQty}
                </div>
                <button
                  onClick={onAdd}
                  disabled={isAdding}
                  style={{
                    width: 46, height: 46, borderRadius: 14,
                    border: '1px solid rgba(15,23,42,0.12)',
                    background: isAdding ? '#F8FAFC' : '#ffffff',
                    color: '#166534', fontSize: 22, fontWeight: 900,
                    cursor: isAdding ? 'default' : 'pointer',
                  }}
                >
                  +
                </button>
              </div>
            ) : (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onAdd}
                disabled={isAdding}
                style={{
                  flex: 1,
                  minWidth: 200,
                  background: isAdding ? '#FBBF24' : 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                  border: 'none', borderRadius: 18,
                  padding: '16px 0',
                  fontSize: 16, fontWeight: 900, color: '#111827',
                  cursor: isAdding ? 'default' : 'pointer',
                  boxShadow: isAdding ? 'none' : '0 18px 40px rgba(249,115,22,0.22)',
                  textAlign: 'center' as const,
                }}
              >
                {isAdding ? 'Adding…' : 'Add to Cart'}
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Menu Item Card — Zomato/Swiggy style ─────────────────────────────────

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
  const badge       = getBadge(idx);
  const hasDiscount = discountLabel !== null;
  const inCart      = cartQty > 0;
  const rating      = getRating(idx);

  const BADGE_STYLES: Record<string, { bg: string; color: string; label: string }> = {
    BESTSELLER:   { bg: '#1BA672', color: '#fff',    label: 'BESTSELLER'   },
    POPULAR:      { bg: '#1BA672', color: '#fff',    label: 'POPULAR'      },
    TRENDING:     { bg: '#1BA672', color: '#fff',    label: 'TRENDING'     },
    CHEFS_SPECIAL:{ bg: '#1BA672', color: '#fff',    label: "CHEF'S PICK"  },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(idx * 0.04, 0.4), duration: 0.35 }}
      whileHover={{ y: -3, boxShadow: '0 12px 32px rgba(0,0,0,0.13)' }}
      onClick={onQuickView}
      style={{
        position: 'relative', overflow: 'hidden',
        background: '#ffffff',
        borderRadius: 16,
        border: `1px solid ${inCart ? '#1BA672' : '#e5e7eb'}`,
        boxShadow: inCart
          ? '0 4px 16px rgba(27,166,114,0.15)'
          : '0 2px 8px rgba(0,0,0,0.06)',
        cursor: 'pointer',
        display: 'flex', flexDirection: 'column',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
    >
      {/* ── IMAGE ─────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '15px 15px 0 0' }}>
        <div style={{
          height: 190,
          background: ITEM_IMG_GRADIENTS[idx % ITEM_IMG_GRADIENTS.length],
        }}>
          {item.imageUrl ? (
            <img
              src={resolveMediaUrl(item.imageUrl)} alt={item.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.45s ease' }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 64, filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.4))' }}>{foodEmoji(idx)}</span>
            </div>
          )}
        </div>

        {/* Top-left: offer / badge */}
        {badge && badge in BADGE_STYLES && (
          <div style={{
            position: 'absolute', top: 0, left: 0,
            background: BADGE_STYLES[badge].bg,
            color: BADGE_STYLES[badge].color,
            fontSize: 9, fontWeight: 900, letterSpacing: '0.06em',
            padding: '4px 10px', borderRadius: '15px 0 8px 0',
          }}>
            {BADGE_STYLES[badge].label}
          </div>
        )}
        {hasDiscount && discountLabel && !badge && (
          <div style={{
            position: 'absolute', top: 0, left: 0,
            background: '#1BA672', color: '#fff',
            fontSize: 9, fontWeight: 900, letterSpacing: '0.06em',
            padding: '4px 10px', borderRadius: '15px 0 8px 0',
          }}>
            {discountLabel}
          </div>
        )}
        {inCart && (
          <div style={{
            position: 'absolute', top: 0, left: 0,
            background: '#1BA672', color: '#fff',
            fontSize: 9, fontWeight: 900, letterSpacing: '0.06em',
            padding: '4px 10px', borderRadius: '15px 0 8px 0',
          }}>
            🛒 {cartQty} IN CART
          </div>
        )}

        {/* Top-right: fav button */}
        <motion.button
          whileTap={{ scale: 0.72 }}
          onClick={onToggleFav}
          style={{
            position: 'absolute', top: 8, right: 8,
            width: 32, height: 32, borderRadius: '50%',
            background: isFav ? 'rgba(239,68,68,0.9)' : 'rgba(255,255,255,0.88)',
            backdropFilter: 'blur(8px)',
            border: `1px solid ${isFav ? 'rgba(239,68,68,0.4)' : 'rgba(0,0,0,0.08)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: 15,
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          }}
        >
          {isFav ? '❤️' : '🤍'}
        </motion.button>
      </div>

      {/* ── CARD BODY ─────────────────────────────────────────────── */}
      <div style={{ padding: '12px 13px 14px', display: 'flex', flexDirection: 'column', flex: 1 }}>

        {/* Veg / Non-veg indicator */}
        {item.isVeg != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
            <div style={{
              width: 16, height: 16, borderRadius: 3, flexShrink: 0,
              border: `2px solid ${item.isVeg ? '#22c55e' : '#ef4444'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: item.isVeg ? '#22c55e' : '#ef4444' }} />
            </div>
            {orderedQty > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#16a34a' }}>✓ Ordered</span>
            )}
          </div>
        )}

        {/* Item name */}
        <p style={{
          fontSize: 14, fontWeight: 700, color: '#1a1a1a', margin: 0, lineHeight: 1.3,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
        }}>
          {item.name}
        </p>

        {/* Description */}
        <p style={{
          fontSize: 11.5, color: '#6b7280', marginTop: 5, lineHeight: 1.5, flex: 1,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
        }}>
          {item.description ?? 'A freshly prepared dish made with the finest ingredients.'}
        </p>

        {/* Rating */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            background: '#1BA672', color: '#fff',
            fontSize: 11, fontWeight: 800,
            padding: '2px 7px', borderRadius: 5,
          }}>
            ★ {rating}
          </span>
        </div>

        {/* Price + Add button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
          {/* Price */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#1a1a1a' }}>
              ₹ {discountedPrice % 1 === 0 ? discountedPrice : discountedPrice.toFixed(2)}
            </span>
            {hasDiscount && (
              <span style={{ fontSize: 11, color: '#9ca3af', textDecoration: 'line-through' }}>
                ₹{item.price}
              </span>
            )}
          </div>

          {/* Add / quantity control */}
          {inCart ? (
            <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #1BA672', borderRadius: 8, overflow: 'hidden' }}>
              <button
                onClick={onRemove}
                disabled={isAdding}
                style={{
                  width: 30, height: 30, border: 'none', background: '#fff',
                  color: '#1BA672', fontSize: 17, fontWeight: 900,
                  cursor: isAdding ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >−</button>
              <div style={{
                width: 28, textAlign: 'center' as const,
                fontSize: 13, fontWeight: 900, color: '#1BA672',
                borderLeft: '1px solid #1BA672', borderRight: '1px solid #1BA672',
                lineHeight: '30px',
              }}>
                {cartQty}
              </div>
              <button
                onClick={onAdd}
                disabled={isAdding}
                style={{
                  width: 30, height: 30, border: 'none', background: '#fff',
                  color: '#1BA672', fontSize: 17, fontWeight: 900,
                  cursor: isAdding ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >+</button>
            </div>
          ) : (
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={onAdd}
              disabled={isAdding}
              style={{
                padding: '6px 20px',
                background: '#fff',
                border: '1.5px solid #1BA672',
                borderRadius: 8,
                fontSize: 13, fontWeight: 800, color: '#1BA672',
                cursor: isAdding ? 'default' : 'pointer',
                letterSpacing: '0.01em',
                opacity: isAdding ? 0.6 : 1,
                transition: 'all 0.15s ease',
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

// ── Premium Loading Skeleton ───────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div style={{ background: BG, minHeight: '100vh' }}>
      {/* Hero skeleton */}
      <div style={{ height: 200, background: 'linear-gradient(135deg, #1C0A00, #3A1A00)' }} className="animate-pulse" />
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ height: 26, width: '55%', background: 'var(--surface-2)', borderRadius: 8, marginBottom: 10 }} className="animate-pulse" />
        <div style={{ height: 14, width: '35%', background: 'var(--surface-2)', borderRadius: 8, marginBottom: 20 }} className="animate-pulse" />
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {[80, 110, 90, 80].map((w, i) => <div key={i} style={{ height: 28, width: w, background: 'var(--surface-2)', borderRadius: 999 }} className="animate-pulse" />)}
        </div>
      </div>
      {/* Category tabs skeleton */}
      <div style={{ height: 46, background: 'var(--surface-2)', borderBottom: '1px solid rgba(212,160,23,0.08)', marginBottom: 8, display: 'flex', gap: 8, padding: '0 12px', alignItems: 'center' }}>
        {[70, 90, 80, 100, 75].map((w, i) => <div key={i} style={{ height: 20, width: w, background: 'var(--surface-2)', borderRadius: 999 }} className="animate-pulse" />)}
      </div>
      {/* Cards skeleton */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" style={{ padding: '8px 12px' }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{ borderRadius: 18, overflow: 'hidden', border: '1px solid var(--border)' }} className="animate-pulse">
            <div style={{ height: 170, background: 'var(--surface-2)' }} />
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ height: 14, width: '75%', background: 'var(--surface-2)', borderRadius: 6 }} />
              <div style={{ height: 10, width: '50%', background: 'var(--surface-2)', borderRadius: 6 }} />
              <div style={{ height: 16, width: '40%', background: 'var(--surface-2)', borderRadius: 6 }} />
              <div style={{ height: 36, background: 'var(--surface-2)', borderRadius: 10 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function RestaurantMenuPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const router = useRouter();

  const [info, setInfo]             = useState<RestaurantInfo | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [addingItem, setAddingItem] = useState<string | null>(null);
  const [toast, setToast]           = useState('');
  const [toastOk, setToastOk]       = useState(true);
  const [cartMap, setCartMap]       = useState<Record<string, number>>({});
  const [cartItems, setCartItems]   = useState<any[]>([]);
  const [cartTotal, setCartTotal]   = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [orderedMap, setOrderedMap] = useState<Record<string, number>>({});
  const [activeCatId, setActiveCatId] = useState('');
  const [favorites, setFavorites]   = useState<Set<string>>(new Set());
  const [previewItem, setPreviewItem] = useState<{ item: MenuItem; idx: number } | null>(null);

  const { setCartCount } = useCartContext();
  const catTabsRef   = useRef<HTMLDivElement>(null);
  const sectionRefs  = useRef<Record<string, HTMLElement | null>>({});

  // ── Cart helpers ────────────────────────────────────────────────

  const updateCartState = useCallback((items: any[]) => {
    const map: Record<string, number> = {};
    let total = 0, count = 0;
    items.forEach((ci) => {
      const id = String(ci.menuItemId ?? ci.id ?? '');
      if (!id) return;
      const qty = Number(ci.quantity) || 1;
      map[id] = (map[id] || 0) + qty;
      total += Number(ci.unitPrice ?? ci.price ?? ci.totalPrice ?? 0) * qty;
      count += qty;
    });
    setCartMap(map); setCartItems(items); setCartTotal(total); setCartCount(count);
  }, [setCartCount]);

  const fetchCart = useCallback(async () => {
    if (!getCustomerToken() || !isCustomerTokenValid()) { clearCustomerTokens(); setCartCount(0); return; }
    try {
      const res = await customerCartApi.get();
      const items: any[] = res.data?.items ?? res.data ?? [];
      updateCartState(Array.isArray(items) ? items : []);
    } catch (e: any) {
      if (e?.response?.status === 401) { clearCustomerTokens(); setCartCount(0); }
    }
  }, [updateCartState, setCartCount]);

  const getCartEntryByMenuItem = (menuItemId: string) =>
    cartItems.find((ci) => String(ci.menuItemId ?? ci.id ?? '') === String(menuItemId) || String(ci.id) === String(menuItemId));

  // ── IntersectionObserver for category tab highlight ──────────────

  useEffect(() => {
    if (categories.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => { entries.forEach((e) => { if (e.isIntersecting) { const id = e.target.getAttribute('data-cat-id'); if (id) setActiveCatId(id); } }); },
      { rootMargin: '-15% 0px -70% 0px' },
    );
    Object.values(sectionRefs.current).forEach((el) => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [categories]);

  useEffect(() => {
    if (!activeCatId || !catTabsRef.current) return;
    const el = catTabsRef.current.querySelector(`[data-tab="${activeCatId}"]`) as HTMLElement | null;
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeCatId]);

  // ── Data loading ─────────────────────────────────────────────────

  useEffect(() => {
    if (!branchId) { setLoading(false); return; }
    if (branchId === 'undefined') { setError('Invalid restaurant. Please go back and pick one from the home screen.'); setLoading(false); return; }
    const load = async () => {
      try {
        const [detailRes, menuRes] = await Promise.all([
          customerDiscoveryApi.restaurantDetails(branchId),
          customerDiscoveryApi.menu(branchId),
        ]);
        const md = menuRes.data;
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
        const detailData = detailRes.data;
        setInfo({
          ...detailData,
          imageUrl: detailData.imageUrl ?? detailData.image_url,
        });
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
          const raw = Array.isArray(ordersRes.data) ? ordersRes.data : (ordersRes.data?.orders ?? ordersRes.data?.data ?? []);
          const oMap: Record<string, number> = {};
          await Promise.all(raw.slice(0, 10).map(async (o: any) => {
            try {
              const det = await customerOrdersApi.get(o.id ?? o.orderId);
              const items: any[] = det.data?.items ?? det.data ?? [];
              items.forEach((it) => { const key = String(it.menuItemId ?? it.id ?? it.name ?? ''); if (key) oMap[key] = (oMap[key] || 0) + (it.quantity ?? 1); });
            } catch { /* non-fatal */ }
          }));
          setOrderedMap(oMap);
        } catch { /* non-fatal */ }
      })();
    } else { clearCustomerTokens(); }
  }, [branchId, fetchCart]);

  // ── Pricing helpers ───────────────────────────────────────────────

  const normRule = (raw: any): PricingRule => ({
    id: raw.id ?? raw.ruleId ?? `${raw.value}-${raw.valueType}`,
    ruleType: (String(raw.ruleType ?? raw.rule_type ?? raw.type ?? 'DISCOUNT')).toUpperCase() as PricingRule['ruleType'],
    valueType: (String(raw.valueType ?? raw.value_type ?? 'PERCENTAGE')).toUpperCase() as PricingRule['valueType'],
    value: Number(raw.value ?? raw.amount ?? 0),
    title: raw.title ?? raw.name, startsAt: raw.startsAt ?? raw.starts_at, endsAt: raw.endsAt ?? raw.ends_at,
  });

  const getRules = (item: MenuItem) => {
    const r: any[] = [];
    if (item.pricingRules) r.push(...(Array.isArray(item.pricingRules) ? item.pricingRules : [item.pricingRules]));
    if (item.pricing_rules) r.push(...(Array.isArray(item.pricing_rules) ? item.pricing_rules : [item.pricing_rules]));
    if (item.pricingRule) r.push(item.pricingRule);
    if (item.pricing_rule) r.push(item.pricing_rule);
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

  const discountedPrice = (item: MenuItem) => {
    const r = activeRule(item);
    if (!r) return item.price;
    return r.valueType === 'PERCENTAGE'
      ? Math.max(0, Number((item.price * (1 - r.value / 100)).toFixed(2)))
      : Math.max(0, Number((item.price - r.value).toFixed(2)));
  };

  const discountLabel = (item: MenuItem): string | null => {
    const r = activeRule(item);
    if (!r) return null;
    return r.valueType === 'PERCENTAGE' ? `${r.value}% OFF` : `₹${r.value} OFF`;
  };

  // ── Actions ───────────────────────────────────────────────────────

  const showToast = (msg: string, ok = true) => {
    setToast(msg); setToastOk(ok);
    setTimeout(() => setToast(''), 2600);
  };

  const handleAdd = async (item: MenuItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!getCustomerToken() || !isCustomerTokenValid()) { clearCustomerTokens(); router.push('/customer/auth/login'); return; }
    setAddingItem(item.id);
    try {
      await customerCartApi.addItem({ menuItemId: String(item.id), branchId: branchId ? String(branchId) : undefined, quantity: 1 } as AddToCartPayload);
      await fetchCart();
      showToast(`${item.name} added! 🎉`, true);
    } catch (err: any) {
      if (err?.response?.status === 401) { clearCustomerTokens(); router.push('/customer/auth/login'); return; }
      showToast(err?.response?.data?.message ?? 'Could not add item', false);
    } finally { setAddingItem(null); }
  };

  const handleRemove = async (item: MenuItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!getCustomerToken() || !isCustomerTokenValid()) { clearCustomerTokens(); router.push('/customer/auth/login'); return; }
    const cartEntry = getCartEntryByMenuItem(item.id);
    if (!cartEntry) return;
    const cartItemId = String(cartEntry.id ?? cartEntry.menuItemId ?? '');
    if (!cartItemId) return;

    setAddingItem(item.id);
    try {
      const qty = Number(cartEntry.quantity) || 1;
      if (qty > 1) {
        await customerCartApi.updateItem(cartItemId, qty - 1);
        showToast(`${item.name} quantity updated.`, true);
      } else {
        await customerCartApi.removeItem(cartItemId);
        showToast(`${item.name} removed!`, true);
      }
      await fetchCart();
    } catch (err: any) {
      if (err?.response?.status === 401) { clearCustomerTokens(); router.push('/customer/auth/login'); return; }
      showToast(err?.response?.data?.message ?? 'Could not update cart', false);
    } finally { setAddingItem(null); }
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
    const el = sectionRefs.current[catId];
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 116;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  // ── Render guards ─────────────────────────────────────────────────

  if (loading) return <PageSkeleton />;

  if (error) return (
    <div style={{ background: BG, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <div style={{ fontSize: 56 }}>😕</div>
      <p style={{ fontSize: 16, fontWeight: 700, color: CREAM, marginTop: 16, textAlign: 'center' }}>{error}</p>
      <button onClick={() => router.back()} style={{ marginTop: 20, background: `linear-gradient(135deg, ${GOLD_DK}, ${GOLD})`, color: '#0D0906', border: 'none', borderRadius: 999, padding: '10px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>← Go Back</button>
    </div>
  );

  const totalItems = cartItems.reduce((s, ci) => s + (Number(ci.quantity) || 1), 0);
  const allItems   = categories.flatMap((c) => c.items);

  return (
    <div style={{ background: BG, minHeight: '100vh', paddingBottom: totalItems > 0 ? 220 : 100 }}>

      {/* ── Toast ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            style={{
              position: 'fixed', bottom: 148, left: '50%', transform: 'translateX(-50%)',
              zIndex: 120, whiteSpace: 'nowrap',
              background: toastOk ? 'var(--surface)' : 'rgba(239,68,68,0.12)',
              border: toastOk ? '1px solid color-mix(in srgb, var(--accent) 40%, transparent)' : '1px solid rgba(239,68,68,0.3)',
              borderRadius: 999, padding: '10px 22px',
              fontSize: 13, fontWeight: 600,
              color: toastOk ? GOLD_LT : '#FCA5A5',
              backdropFilter: 'blur(24px)',
              boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
            }}
          >{toast}</motion.div>
        )}
      </AnimatePresence>

      {/* ── Quick View Modal ─────────────────────────────────── */}
      {previewItem && (
        <QuickViewModal
          item={previewItem.item}
          idx={previewItem.idx}
          discountedPrice={discountedPrice(previewItem.item)}
          discountLabel={discountLabel(previewItem.item)}
          cartQty={cartMap[String(previewItem.item.id)] || 0}
          isAdding={addingItem === previewItem.item.id}
          onAdd={() => handleAdd(previewItem.item)}
          onRemove={() => handleRemove(previewItem.item)}
          onClose={() => setPreviewItem(null)}
        />
      )}

      {/* ── Restaurant Hero ──────────────────────────────────── */}
      {info && (
        <>
          <div style={{ position: 'relative', height: 210, overflow: 'hidden' }}>
            {info.imageUrl ? (
              <img src={resolveMediaUrl(info.imageUrl)} alt={info.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80, opacity: 0.35 }}>🍽️</div>
            )}
            {/* Gradient overlay — name readable on any image */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,6,0,0.2) 0%, rgba(10,6,0,0.92) 100%)' }} />
            {/* Restaurant name overlaid on hero */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 16px 16px' }}>
              <h1 style={{ fontSize: 24, fontWeight: 900, color: '#FFFFFF', margin: 0, lineHeight: 1.15, textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}>{info.name}</h1>
              {info.cuisine && <p style={{ fontSize: 13, color: 'rgba(212,175,55,0.65)', marginTop: 3 }}>{info.cuisine}</p>}
            </div>
            {/* Gold shimmer top edge */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(212,160,23,0.4), transparent)' }} />
          </div>

          {/* Stats bar */}
          <div style={{ background: 'var(--surface-2)', borderBottom: '1px solid rgba(212,160,23,0.14)', padding: '12px 16px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {info.rating != null && (
              <span style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 999, padding: '4px 12px', fontSize: 12, fontWeight: 700, color: '#4ade80' }}>★ {info.rating.toFixed(1)}</span>
            )}
            {info.deliveryTime != null && (
              <span style={{ background: 'rgba(212,160,23,0.08)', border: '1px solid rgba(212,160,23,0.18)', borderRadius: 999, padding: '4px 12px', fontSize: 12, fontWeight: 600, color: 'rgba(212,175,55,0.72)' }}>🕒 {info.deliveryTime} min</span>
            )}
            {info.deliveryFee != null && (
              <span style={{
                background: info.deliveryFee === 0 ? 'rgba(74,222,128,0.08)' : 'rgba(212,160,23,0.08)',
                border: `1px solid ${info.deliveryFee === 0 ? 'rgba(74,222,128,0.2)' : 'rgba(212,160,23,0.18)'}`,
                borderRadius: 999, padding: '4px 12px', fontSize: 12, fontWeight: 600,
                color: info.deliveryFee === 0 ? '#4ade80' : 'rgba(212,175,55,0.72)',
              }}>
                {info.deliveryFee === 0 ? '✓ Free delivery' : `🛵 ₹${info.deliveryFee} delivery`}
              </span>
            )}
            {favorites.size > 0 && (
              <span style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 999, padding: '4px 12px', fontSize: 12, fontWeight: 600, color: '#f87171' }}>
                ❤️ {favorites.size} saved
              </span>
            )}
          </div>
        </>
      )}

      {/* ── Sticky Category Tabs ─────────────────────────────── */}
      {categories.length > 1 && (
        <div
          className="sticky z-30"
          style={{ top: 64, background: 'color-mix(in srgb, var(--surface) 97%, transparent)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}
        >
          <div ref={catTabsRef} className="flex overflow-x-auto scrollbar-hide" style={{ padding: '0 10px' }}>
            {categories.map((cat) => {
              const isActive = activeCatId === cat.id;
              return (
                <button
                  key={cat.id} data-tab={cat.id}
                  onClick={() => scrollToCat(cat.id)}
                  style={{
                    flexShrink: 0, padding: '13px 16px', fontSize: 13,
                    fontWeight: isActive ? 800 : 500,
                    color: isActive ? 'var(--accent)' : 'var(--tx-3)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    borderBottom: `2.5px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
                    whiteSpace: 'nowrap', transition: 'all 0.2s ease',
                  }}
                >
                  {cat.displayName || cat.name}
                  <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.5 }}>({cat.items.length})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Menu Sections ────────────────────────────────────── */}
      {categories.length === 0 ? (
        <div style={{ padding: '80px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 56 }}>🍽️</div>
          <p style={{ fontSize: 16, fontWeight: 700, color: CREAM, marginTop: 16 }}>Menu not available</p>
          <p style={{ fontSize: 13, color: 'var(--tx-3)', marginTop: 6 }}>Check back soon</p>
        </div>
      ) : (
        <div style={{ paddingBottom: 16 }}>
          {categories.map((cat, catIdx) => (
            <section
              key={cat.id} data-cat-id={cat.id}
              ref={(el) => { sectionRefs.current[cat.id] = el; }}
              style={{ marginTop: catIdx === 0 ? 8 : 0 }}
            >
              {/* ── Category header ─────────────────────────────── */}
              <div style={{ padding: '20px 12px 12px' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'var(--surface)',
                  border: '1.5px solid var(--border)',
                  borderRadius: 18,
                  boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                }}>
                  {/* Left: emoji icon + name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 22,
                      background: 'color-mix(in srgb, var(--accent) 10%, var(--surface-2))',
                      border: '1.5px solid color-mix(in srgb, var(--accent) 22%, transparent)',
                    }}>
                      {getCatEmoji(cat.displayName || cat.name)}
                    </div>
                    <div>
                      <h2 style={{ fontSize: 15, fontWeight: 900, color: 'var(--tx)', margin: 0, letterSpacing: '0.01em' }}>
                        {cat.displayName || cat.name}
                      </h2>
                      <p style={{ fontSize: 11, color: 'var(--tx-3)', margin: '2px 0 0' }}>
                        {cat.items.length} item{cat.items.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  {/* Right: count pill */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
                    borderRadius: 999, padding: '4px 12px',
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)' }}>
                      {cat.items.length}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--accent)', opacity: 0.7 }}>items</span>
                  </div>
                </div>
              </div>

              {/* ── Items grid ───────────────────────────────────── */}
              <div
                className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                style={{ padding: '0 12px' }}
              >
                {cat.items.map((item, localIdx) => {
                  const globalItemIdx = allItems.findIndex((i) => i.id === item.id);
                  const effectiveIdx  = globalItemIdx >= 0 ? globalItemIdx : localIdx;
                  return (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      idx={effectiveIdx}
                      discountedPrice={discountedPrice(item)}
                      discountLabel={discountLabel(item)}
                      cartQty={cartMap[String(item.id)] || 0}
                      orderedQty={orderedMap[String(item.id)] || orderedMap[String(item.name)] || 0}
                      isFav={favorites.has(item.id)}
                      isAdding={addingItem === item.id}
                      onAdd={(e) => handleAdd(item, e)}
                      onRemove={(e) => handleRemove(item, e)}
                      onToggleFav={(e) => handleToggleFav(item.id, e)}
                      onQuickView={() => setPreviewItem({ item, idx: effectiveIdx })}
                    />
                  );
                })}
              </div>

              {/* ── Section divider ──────────────────────────────── */}
              <div style={{
                height: 1, margin: '20px 12px 0',
                background: 'linear-gradient(90deg, transparent, var(--border) 20%, var(--border) 80%, transparent)',
              }} />
            </section>
          ))}
        </div>
      )}

      {/* ── Floating Cart Bar ────────────────────────────────── */}
      <AnimatePresence>
        {totalItems > 0 && !drawerOpen && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: [0, -6, 0], opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{
              opacity: { duration: 0.3 },
              y: {
                times: [0, 0.5, 1],
                duration: 1.8,
                repeat: Infinity,
                repeatType: 'loop',
                ease: 'easeInOut',
              },
            }}
            style={{ position: 'fixed', left: '50%', bottom: 82, zIndex: 60, transform: 'translateX(-50%)', width: 'clamp(320px, min(92vw, 420px), 420px)' }}
          >
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => setDrawerOpen(true)}
              style={{
                width: '100%', cursor: 'pointer', borderRadius: 999,
                background: `linear-gradient(135deg, #7C3AED 0%, #6D28D9 54%, #5B21B6 100%)`,
                padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                boxShadow: '0 20px 55px rgba(109,40,217,0.35)',
                border: '1px solid rgba(255,255,255,0.18)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ background: 'rgba(255,255,255,0.18)', borderRadius: 999, padding: '4px 12px', fontSize: 12, fontWeight: 900, color: '#ffffff' }}>
                  {totalItems} {totalItems === 1 ? 'item' : 'items'}
                </span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#ffffff' }}>View Cart</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 16, fontWeight: 900, color: '#ffffff' }}>₹{cartTotal.toFixed(0)}</span>
                <span style={{ fontSize: 20, color: '#ffffff', fontWeight: 700 }}>›</span>
              </div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Cart Drawer ──────────────────────────────────────── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div key="cd-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawerOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.74)', backdropFilter: 'blur(5px)' }}
            />
            <motion.div key="cd-drawer"
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              style={{
                position: 'fixed', right: 0, top: 0, bottom: 0, zIndex: 51,
                width: 'clamp(320px, 100%, 420px)', maxWidth: 420,
                background: '#f9fafb',
                borderLeft: '1px solid #e5e7eb',
                boxShadow: '-14px 0 64px rgba(15,23,42,0.12)',
                display: 'flex', flexDirection: 'column',
              }}
            >
              {/* Header */}
              <div style={{ padding: '18px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff' }}>
                <div>
                  <p style={{ fontSize: 17, fontWeight: 800, color: '#111827', margin: 0 }}>Your Cart</p>
                  <p style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>
                    {cartItems.length} item{cartItems.length !== 1 ? 's' : ''}{info?.name ? ` · ${info.name}` : ''}
                  </p>
                </div>
                <button onClick={() => setDrawerOpen(false)}
                  style={{ width: 34, height: 34, borderRadius: '50%', background: '#f3f4f6', border: '1px solid #e5e7eb', color: '#374151', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>✕</button>
              </div>

              {/* Items */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {cartItems.map((ci, i) => {
                  const qty      = Number(ci.quantity) || 1;
                  const price    = Number(ci.unitPrice ?? ci.price ?? ci.totalPrice ?? 0);
                  const itemName = ci.menuItemName ?? ci.name ?? ci.title ?? 'Item';
                  const menuItem = allItems.find((it) => String(it.id) === String(ci.menuItemId));
                  const imgUrl   = menuItem?.imageUrl ?? ci.imageUrl ?? null;
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '12px 14px' }}>
                      <div style={{ width: 54, height: 54, borderRadius: 12, overflow: 'hidden', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {imgUrl ? (
                          <img src={resolveMediaUrl(imgUrl)} alt={itemName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: 22 }}>{foodEmoji(i)}</span>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p className="truncate" style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>{itemName}</p>
                        <p style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>₹{price.toFixed(0)} × {qty}</p>
                      </div>
                      <p style={{ fontSize: 15, fontWeight: 800, color: '#1BA672', flexShrink: 0 }}>₹{(price * qty).toFixed(0)}</p>
                    </div>
                  );
                })}

                {/* Suggested items */}
                {allItems.length > cartItems.length && (
                  <div style={{ marginTop: 4, padding: '14px', background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 14 }}>
                    <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#1BA672', marginBottom: 10 }}>You might also like</p>
                    <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }} className="scrollbar-hide">
                      {allItems.slice(0, 4).map((it, i) => {
                        const dp = discountedPrice(it);
                        return (
                          <button key={it.id} onClick={() => { setDrawerOpen(false); setPreviewItem({ item: it, idx: i }); }}
                            style={{ flexShrink: 0, width: 110, textAlign: 'left', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '8px', cursor: 'pointer' }}>
                            <div style={{ height: 60, borderRadius: 8, overflow: 'hidden', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                              {it.imageUrl ? <img src={resolveMediaUrl(it.imageUrl)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 22 }}>{foodEmoji(i)}</span>}
                            </div>
                            <p className="truncate" style={{ fontSize: 10, fontWeight: 700, color: '#111827', margin: 0 }}>{it.name}</p>
                            <p style={{ fontSize: 10, color: '#1BA672', marginTop: 2, fontWeight: 700 }}>₹{dp % 1 === 0 ? dp : dp.toFixed(2)}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{ padding: '16px 20px', borderTop: '1px solid #e5e7eb', background: '#ffffff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: '#6b7280' }}>Item total</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#111827' }}>₹{cartTotal.toFixed(0)}</span>
                </div>
                {info?.deliveryFee != null && info.deliveryFee > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: '#6b7280' }}>Delivery fee</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>₹{info.deliveryFee}</span>
                  </div>
                )}
                {info?.deliveryFee === 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: '#1BA672', fontWeight: 600 }}>✓ Free delivery</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1BA672' }}>₹0</span>
                  </div>
                )}
                <div style={{ height: 1, background: '#f3f4f6', margin: '12px 0' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                  <button onClick={() => { setDrawerOpen(false); router.push('/customer/cart'); }}
                    style={{ width: '100%', background: '#1BA672', border: 'none', borderRadius: 12, padding: '14px 0', fontSize: 15, fontWeight: 800, color: '#ffffff', cursor: 'pointer', letterSpacing: '0.01em', boxShadow: '0 4px 16px rgba(27,166,114,0.28)' }}>
                    Proceed to Cart →
                  </button>
                  <button onClick={() => setDrawerOpen(false)}
                    style={{ width: '100%', background: '#ffffff', border: '1.5px solid #d1d5db', borderRadius: 12, padding: '12px 0', fontSize: 14, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
                    Keep Adding
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}