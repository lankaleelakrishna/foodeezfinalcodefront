'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { customerProfileApi, CreateAddressPayload } from '../../../lib/api';
import { getCustomerName } from '../../../lib/customer-auth';

// ── Types ──────────────────────────────────────────────────────────────────

type Profile = { name?: string; email?: string; phone?: string; dateOfBirth?: string; gender?: string };
type Address = { id: string; label: string; addressLine1: string; addressLine2?: string; city: string; state: string; pincode: string; isDefault?: boolean };
type Tab     = 'profile' | 'addresses' | 'favorites';

const EMPTY_ADDR: CreateAddressPayload = {
  label: '', addressLine1: '', city: '', state: '', pincode: '', latitude: 0, longitude: 0, isDefault: false,
};

// ── Quick action config ────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { emoji: '📦', label: 'Orders',       href: '/customer/orders'   },
  { emoji: '💳', label: 'Wallet',       href: '/customer/payments' },
  { emoji: '🏍️', label: 'Track',        href: '/customer/orders'   },
  { emoji: '⭐', label: 'Reviews',      href: '/customer/orders'   },
  { emoji: '🎁', label: 'Offers',       href: '/customer/discovery'},
  { emoji: '🔔', label: 'Alerts',       href: '/customer/profile'  },
];

// ── Tab bar ────────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: 'profile',   label: 'Profile',   emoji: '👤' },
  { key: 'addresses', label: 'Addresses', emoji: '📍' },
  { key: 'favorites', label: 'Saved',     emoji: '❤️' },
];

// ── Main page ──────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const [tab, setTab]                 = useState<Tab>('profile');
  const [profile, setProfile]         = useState<Profile>({});
  const [addresses, setAddresses]     = useState<Address[]>([]);
  const [favRestaurants, setFavRests] = useState<any[]>([]);
  const [favItems, setFavItems]       = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState('');
  const [showAddAddr, setShowAddAddr] = useState(false);
  const [newAddr, setNewAddr]         = useState<CreateAddressPayload>(EMPTY_ADDR);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addingAddr, setAddingAddr]   = useState(false);
  const displayName = getCustomerName();

  useEffect(() => {
    const load = async () => {
      try {
        const [pRes, aRes, rRes, iRes] = await Promise.allSettled([
          customerProfileApi.get(),
          customerProfileApi.getAddresses(),
          customerProfileApi.getFavRestaurants(),
          customerProfileApi.getFavItems(),
        ]);
        if (pRes.status === 'fulfilled') setProfile(pRes.value.data?.customer ?? pRes.value.data ?? {});
        if (aRes.status === 'fulfilled') setAddresses(aRes.value.data?.addresses ?? aRes.value.data ?? []);
        if (rRes.status === 'fulfilled') setFavRests(rRes.value.data?.restaurants ?? rRes.value.data ?? []);
        if (iRes.status === 'fulfilled') setFavItems(iRes.value.data?.items ?? iRes.value.data ?? []);
      } finally { setLoading(false); }
    };
    load();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(''); setSuccess('');
    try {
      await customerProfileApi.update({ name: profile.name, email: profile.email, dateOfBirth: profile.dateOfBirth, gender: profile.gender as any });
      setSuccess('Profile updated!');
      setTimeout(() => setSuccess(''), 3000);
    } catch { setError('Failed to update profile.'); }
    finally { setSaving(false); }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault(); setAddingAddr(true); setError(''); setSuccess('');
    try {
      if (editingAddressId) {
        const updatePayload = {
          label: newAddr.label,
          addressLine1: newAddr.addressLine1,
          addressLine2: newAddr.addressLine2,
          city: newAddr.city,
          state: newAddr.state,
          pincode: newAddr.pincode,
          isDefault: newAddr.isDefault,
        };
        const res = await customerProfileApi.updateAddress(editingAddressId, updatePayload);
        setAddresses((prev) => prev.map((a) => a.id === editingAddressId ? { ...a, ...res.data?.address ?? res.data } : a));
        setEditingAddressId(null);
        setSuccess('Address saved successfully!');
      } else {
        const res = await customerProfileApi.addAddress(newAddr);
        setAddresses((prev) => [...prev, res.data?.address ?? res.data]);
        setSuccess('Address saved successfully!');
      }
      setShowAddAddr(false);
      setNewAddr(EMPTY_ADDR);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) { 
      setError(err?.response?.data?.message ?? 'Failed to save address.');
    }
    finally { setAddingAddr(false); }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      await customerProfileApi.deleteAddress(id);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      if (editingAddressId === id) {
        setEditingAddressId(null);
        setShowAddAddr(false);
        setNewAddr(EMPTY_ADDR);
      }
    } catch { setError('Failed to delete address.'); }
  };

  const handleEditAddress = (addr: Address) => {
    setEditingAddressId(addr.id);
    setNewAddr({
      label: addr.label,
      addressLine1: addr.addressLine1,
      addressLine2: addr.addressLine2,
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
      latitude: 0,
      longitude: 0,
      isDefault: !!addr.isDefault,
    });
    setShowAddAddr(true);
  };

  const handleSetDefault = async (id: string) => {
    try {
      await customerProfileApi.setDefaultAddress(id);
      setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })));
    } catch { setError('Failed to set default.'); }
  };

  const handleRemoveFavRest = async (restaurantId: string) => {
    try {
      await customerProfileApi.removeFavRestaurant(restaurantId);
      setFavRests((prev) => prev.filter((r) => (r.id ?? r.restaurantId) !== restaurantId));
    } catch { setError('Failed to remove.'); }
  };

  const initials = displayName ? displayName.trim()[0].toUpperCase() : '?';

  if (loading) return (
    <div className="mx-auto max-w-lg px-4 pt-8 space-y-4">
      <div className="h-28 animate-pulse rounded-3xl" style={{ background: 'var(--surface)' }} />
      <div className="h-14 animate-pulse rounded-2xl" style={{ background: 'var(--surface)' }} />
      <div className="h-48 animate-pulse rounded-3xl" style={{ background: 'var(--surface)' }} />
    </div>
  );

  return (
    <div className="mx-auto max-w-lg px-4 pt-5 pb-10 space-y-5">

      {/* ── Profile hero ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl p-6"
        style={{ background: 'linear-gradient(135deg,#1A0800 0%,#3A1200 60%,#2A0E00 100%)', border: '1px solid rgba(212,175,55,0.18)' }}
      >
        {/* Background glow */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle,#FFD700,transparent)' }} />

        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div
            className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-black"
            style={{ background: 'var(--accent)', color: '#0D0906', boxShadow: '0 0 0 3px rgba(212,175,55,0.3)' }}
          >
            {initials}
            <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 bg-green-400" style={{ borderColor: '#1A0800' }} />
          </div>

          <div className="min-w-0">
            <p className="text-lg font-extrabold text-white truncate">{displayName ?? 'Your Account'}</p>
            {profile.email && <p className="text-xs text-white/45 truncate">{profile.email}</p>}
            <span
              className="mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider"
              style={{ background: 'rgba(212,175,55,0.18)', color: 'var(--accent)' }}
            >
              ✦ Gold Member
            </span>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-5 grid grid-cols-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          {[
            { label: 'Orders',  val: '24' },
            { label: 'Points',  val: '320' },
            { label: 'Reviews', val: '8'  },
          ].map(({ label, val }) => (
            <div key={label} className="text-center px-2 pt-4"
              style={{ borderLeft: label !== 'Orders' ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
              <p className="text-lg font-black text-white">{val}</p>
              <p className="text-[10px] text-white/40">{label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Quick actions */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="grid grid-cols-6 gap-2"
      >
        {QUICK_ACTIONS.map((a) => (
          <a
            key={a.label}
            href={a.href}
            className="flex flex-col items-center gap-1.5 rounded-2xl py-3 transition hover:opacity-75"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <span className="text-xl">{a.emoji}</span>
            <span className="text-[9px] font-semibold" style={{ color: 'var(--tx-3)' }}>{a.label}</span>
          </a>
        ))}
      </motion.div>

      {/* ── Tab bar ───────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.12 }}
        className="flex gap-1 rounded-2xl p-1"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="relative flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-all"
            style={{ color: tab === t.key ? 'var(--tx)' : 'var(--tx-3)' }}
          >
            {tab === t.key && (
              <motion.div
                layoutId="profile-tab"
                className="absolute inset-0 rounded-xl"
                style={{ background: 'var(--surface-2)' }}
              />
            )}
            <span className="relative z-10">{t.emoji}</span>
            <span className="relative z-10">{t.label}</span>
          </button>
        ))}
      </motion.div>

      {/* Alerts */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}
            className="rounded-2xl border px-4 py-3 text-sm"
            style={{ background: 'var(--danger-bg)', borderColor: 'var(--danger-border)', color: 'var(--danger-text)' }}>
            {error}
          </motion.div>
        )}
        {success && (
          <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}
            className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold"
            style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Tab content ───────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >

          {/* ── Profile tab ──────────────────────────────────────── */}
          {tab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="overflow-hidden rounded-3xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="p-5">
                  {[
                    { key: 'name',  label: 'Full Name', type: 'text'  },
                    { key: 'email', label: 'Email',     type: 'email' },
                  ].map(({ key, label, type }) => (
                    <div key={key} className="mb-4 last:mb-0">
                      <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--tx-3)' }}>
                        {label}
                      </label>
                      <input
                        type={type}
                        value={(profile as any)[key] ?? ''}
                        onChange={(e) => setProfile((p) => ({ ...p, [key]: e.target.value }))}
                        className="w-full rounded-2xl px-4 py-2.5 text-sm outline-none transition"
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--tx)' }}
                      />
                    </div>
                  ))}

                  <div className="mb-4">
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--tx-3)' }}>
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={profile.dateOfBirth ?? ''}
                      onChange={(e) => setProfile((p) => ({ ...p, dateOfBirth: e.target.value }))}
                      className="w-full rounded-2xl px-4 py-2.5 text-sm outline-none transition"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--tx)' }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--tx-3)' }}>
                      Gender
                    </label>
                    <div className="flex gap-2">
                      {[{v:'M',l:'Male'},{v:'F',l:'Female'},{v:'O',l:'Other'}].map(({v,l}) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setProfile((p) => ({ ...p, gender: v }))}
                          className="flex-1 rounded-2xl py-2.5 text-xs font-bold transition"
                          style={{
                            background: profile.gender === v ? 'color-mix(in srgb,var(--accent) 18%,var(--surface))' : 'var(--surface-2)',
                            border: `1px solid ${profile.gender === v ? 'var(--accent)' : 'var(--border)'}`,
                            color: profile.gender === v ? 'var(--accent)' : 'var(--tx-2)',
                          }}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="px-5 py-4" style={{ borderTop: '1px solid var(--border)' }}>
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full rounded-2xl py-3 text-sm font-bold transition hover:opacity-80 disabled:opacity-50"
                    style={{ background: 'var(--accent)', color: '#0D0906' }}
                  >
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* ── Addresses tab ────────────────────────────────────── */}
          {tab === 'addresses' && (
            <div className="space-y-3">
              {addresses.map((addr) => (
                <motion.div
                  key={addr.id}
                  layout
                  className="overflow-hidden rounded-2xl"
                  style={{
                    background: addr.isDefault ? 'color-mix(in srgb,var(--accent) 8%,var(--surface))' : 'var(--surface)',
                    border: `1px solid ${addr.isDefault ? 'var(--accent)' : 'var(--border)'}`,
                  }}
                >
                  <div className="flex items-start gap-3 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
                      style={{ background: 'var(--surface-2)' }}>
                      {addr.label.toLowerCase().includes('home') ? '🏠' : addr.label.toLowerCase().includes('work') ? '🏢' : '📍'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold truncate" style={{ color: 'var(--tx)', fontSize: 14 }}>{addr.label}</p>
                        {addr.isDefault && (
                          <span className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide"
                            style={{ background: 'var(--accent)', color: '#0D0906' }}>
                            Default
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs" style={{ color: 'var(--tx-3)' }}>
                        {addr.addressLine1}, {addr.city}, {addr.state} — {addr.pincode}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 px-4 pb-3">
                    {!addr.isDefault && (
                      <button
                        onClick={() => handleSetDefault(addr.id)}
                        className="rounded-xl px-3 py-1.5 text-xs font-semibold transition hover:opacity-80"
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--tx-2)' }}
                      >
                        Set default
                      </button>
                    )}
                    <button
                      onClick={() => handleEditAddress(addr)}
                      className="rounded-xl px-3 py-1.5 text-xs font-semibold transition hover:opacity-80"
                      style={{ background: 'var(--accent)', border: '1px solid rgba(212,175,55,0.24)', color: '#0D0906' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteAddress(addr.id)}
                      className="rounded-xl px-3 py-1.5 text-xs font-semibold transition hover:opacity-80"
                      style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)' }}
                    >
                      Delete
                    </button>
                  </div>
                </motion.div>
              ))}

              <AnimatePresence>
                {showAddAddr ? (
                  <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    onSubmit={handleSaveAddress}
                    className="overflow-hidden rounded-3xl p-5 space-y-3"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                  >
                    <p className="font-bold text-sm" style={{ color: 'var(--tx)' }}>
                      {editingAddressId ? 'Edit address' : 'Add new address'}
                    </p>
                    {(['label','addressLine1','addressLine2','city','state','pincode'] as const).map((f) => (
                      <div key={f}>
                        <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--tx-3)' }}>
                          {f.replace(/([A-Z])/g,' $1').trim()} {!['addressLine2'].includes(f) && '*'}
                        </label>
                        <input
                          type="text"
                          value={(newAddr as any)[f] ?? ''}
                          required={!['addressLine2'].includes(f)}
                          onChange={(e) => setNewAddr((a) => ({ ...a, [f]: e.target.value }))}
                          className="w-full rounded-2xl px-3 py-2 text-sm outline-none"
                          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--tx)' }}
                        />
                      </div>
                    ))}
                    <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--tx-2)' }}>
                      <input
                        type="checkbox"
                        checked={!!newAddr.isDefault}
                        onChange={(e) => setNewAddr((a) => ({ ...a, isDefault: e.target.checked }))}
                        className="rounded"
                      />
                      Set as default
                    </label>
                    <div className="flex gap-3 pt-1">
                      <button type="submit" disabled={addingAddr}
                        className="flex-1 rounded-2xl py-2.5 text-sm font-bold transition hover:opacity-80 disabled:opacity-50"
                        style={{ background: 'var(--accent)', color: '#0D0906' }}>
                        {addingAddr ? 'Saving…' : 'Save address'}
                      </button>
                      <button type="button" onClick={() => { setShowAddAddr(false); setNewAddr(EMPTY_ADDR); setEditingAddressId(null); }}
                        className="flex-1 rounded-2xl py-2.5 text-sm font-bold transition hover:opacity-75"
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--tx)' }}>
                        Cancel
                      </button>
                    </div>
                  </motion.form>
                ) : (
                  <motion.button
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    onClick={() => setShowAddAddr(true)}
                    className="w-full rounded-2xl border-2 border-dashed py-4 text-sm font-bold transition hover:opacity-75"
                    style={{ borderColor: 'var(--border)', color: 'var(--tx-3)' }}
                  >
                    + Add new address
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ── Favourites tab ───────────────────────────────────── */}
          {tab === 'favorites' && (
            <div className="space-y-6">
              <section>
                <p className="mb-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--tx-3)' }}>
                  Favourite Restaurants
                </p>
                {favRestaurants.length === 0 ? (
                  <p className="py-8 text-center text-sm" style={{ color: 'var(--tx-3)' }}>No favourite restaurants saved.</p>
                ) : (
                  <div className="space-y-2">
                    {favRestaurants.map((r) => (
                      <div key={r.id ?? r.restaurantId}
                        className="flex items-center justify-between gap-3 rounded-2xl p-4"
                        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl flex items-center justify-center text-lg"
                            style={{ background: 'var(--surface-2)' }}>🍽️</div>
                          <p className="font-semibold text-sm" style={{ color: 'var(--tx)' }}>{r.name}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveFavRest(r.id ?? r.restaurantId)}
                          className="rounded-xl px-3 py-1.5 text-xs font-semibold transition hover:opacity-80"
                          style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)' }}>
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <p className="mb-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--tx-3)' }}>
                  Favourite Dishes
                </p>
                {favItems.length === 0 ? (
                  <p className="py-8 text-center text-sm" style={{ color: 'var(--tx-3)' }}>No favourite dishes saved.</p>
                ) : (
                  <div className="space-y-2">
                    {favItems.map((item) => (
                      <div key={item.id ?? item.menuItemId}
                        className="flex items-center justify-between gap-3 rounded-2xl p-4"
                        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl flex items-center justify-center text-lg"
                            style={{ background: 'var(--surface-2)' }}>🍴</div>
                          <div>
                            <p className="font-semibold text-sm" style={{ color: 'var(--tx)' }}>{item.name}</p>
                            {item.price != null && <p className="text-xs" style={{ color: 'var(--accent)' }}>₹{item.price}</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}