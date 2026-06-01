'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { customerPaymentsApi, PaymentGateway } from '../../../lib/api';
import { getCustomerToken } from '../../../lib/customer-auth';

// ── Types ──────────────────────────────────────────────────────────────────

type Wallet      = { balance: number; currency: string };
type Transaction = { id: string; type: string; amount: number; description?: string; createdAt: string; status?: string };

// ── Quick amounts ──────────────────────────────────────────────────────────

const QUICK_AMOUNTS = [50, 100, 200, 500];

// ── Transaction icon/color ─────────────────────────────────────────────────

const TX_CFG: Record<string, { icon: string; color: string; sign: string }> = {
  CREDIT: { icon: '↓', color: '#4ade80', sign: '+' },
  DEBIT:  { icon: '↑', color: '#f87171', sign: '−' },
  REFUND: { icon: '↩', color: '#60a5fa', sign: '+' },
};

// ── Main page ──────────────────────────────────────────────────────────────

export default function PaymentsPage() {
  const [wallet, setWallet]             = useState<Wallet | null>(null);
  const [transactions, setTx]           = useState<Transaction[]>([]);
  const [loading, setLoading]           = useState(true);
  const [txLoading, setTxLoading]       = useState(false);
  const [error, setError]               = useState('');
  const [topupAmount, setTopupAmount]   = useState('');
  const [gateway, setGateway]           = useState<PaymentGateway>('razorpay');
  const [initiating, setInitiating]     = useState(false);
  const [topupMsg, setTopupMsg]         = useState('');
  const [page, setPage]                 = useState(1);
  const [hasMore, setHasMore]           = useState(false);
  const [showTopup, setShowTopup]       = useState(false);

  const fetchWallet = async () => {
    try {
      const res = await customerPaymentsApi.wallet();
      const raw = res.data?.wallet ?? res.data;
      setWallet(raw ? { ...raw, balance: Number(raw.balance ?? 0) } : null);
    } catch { setError('Failed to load wallet.'); }
    finally { setLoading(false); }
  };

  const fetchTx = async (p: number) => {
    setTxLoading(true);
    try {
      const res = await customerPaymentsApi.transactions(p, 20);
      const raw: Transaction[] = Array.isArray(res.data?.transactions ?? res.data) ? (res.data?.transactions ?? res.data) : [];
      setTx((prev) => (p === 1 ? raw : [...prev, ...raw]));
      setHasMore(raw.length === 20);
    } finally { setTxLoading(false); }
  };

  useEffect(() => {
    if (!getCustomerToken()) { setLoading(false); setError('Sign in to view your wallet.'); return; }
    fetchWallet(); fetchTx(1);
  }, []);

  const handleTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(topupAmount);
    if (!amount || amount < 10) { setTopupMsg('Minimum top-up is ₹10.'); return; }
    setInitiating(true); setTopupMsg('');
    try {
      const res = await customerPaymentsApi.topupInitiate(amount, gateway);
      setTopupMsg(`✓ Top-up initiated (ID: ${res.data?.orderId ?? res.data?.id ?? 'pending'})`);
      setTopupAmount('');
      await fetchWallet();
    } catch (e: any) {
      setTopupMsg(e?.response?.data?.message ?? 'Top-up failed.');
    } finally { setInitiating(false); }
  };

  const loadMore = () => { const next = page + 1; setPage(next); fetchTx(next); };

  // Group transactions by date
  const grouped = transactions.reduce<Record<string, Transaction[]>>((acc, tx) => {
    const key = new Date(tx.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    if (!acc[key]) acc[key] = [];
    acc[key].push(tx);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-lg px-4 pt-5 pb-10 space-y-5">

      {/* Header */}
      <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }}>
        <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--tx)' }}>Wallet</h1>
        <p className="text-sm" style={{ color: 'var(--tx-3)' }}>Your FooDeeZ balance &amp; transactions</p>
      </motion.div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl border px-4 py-3 text-sm"
          style={{ background: 'var(--danger-bg)', borderColor: 'var(--danger-border)', color: 'var(--danger-text)' }}>
          {error}
        </div>
      )}

      {/* ── Balance card ─────────────────────────────────────────── */}
      {loading ? (
        <div className="h-44 animate-pulse rounded-3xl" style={{ background: 'var(--surface)' }} />
      ) : wallet ? (
        <motion.div
          initial={{ opacity:0, scale:0.96 }}
          animate={{ opacity:1, scale:1 }}
          transition={{ type:'spring', damping:20 }}
          className="relative overflow-hidden rounded-3xl p-6"
          style={{ background: 'linear-gradient(135deg,#1A0800 0%,#3A1200 50%,#1A0800 100%)' }}
        >
          {/* Decorative glow */}
          <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full opacity-25 blur-3xl"
            style={{ background: 'radial-gradient(circle,#FFD700,transparent)' }} />
          <div className="pointer-events-none absolute -bottom-8 left-1/4 h-40 w-40 rounded-full opacity-15 blur-3xl"
            style={{ background: 'radial-gradient(circle,#D97706,transparent)' }} />

          {/* Card network pattern */}
          <div className="pointer-events-none absolute right-4 bottom-4 opacity-5">
            <div className="flex">
              <div className="h-14 w-14 rounded-full" style={{ background: '#FF5F00', marginRight: '-14px' }} />
              <div className="h-14 w-14 rounded-full" style={{ background: '#EB001B' }} />
            </div>
          </div>

          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/50">Available Balance</p>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-2 text-4xl font-black text-white"
            >
              ₹{wallet.balance.toFixed(2)}
            </motion.p>
            <p className="mt-1 text-xs text-white/35">{wallet.currency} · FooDeeZ Wallet</p>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setShowTopup((s) => !s)}
                className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition hover:brightness-110"
                style={{ background: 'var(--accent)', color: '#0D0906' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add Money
              </button>
              <button
                className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition hover:opacity-75"
                style={{ background: 'rgba(255,255,255,0.1)', color: 'white', backdropFilter:'blur(8px)' }}
              >
                History
              </button>
            </div>
            <p className="text-[10px] text-white/30 font-mono">{new Date().toLocaleDateString('en-IN', {month:'short', year:'numeric'})}</p>
          </div>
        </motion.div>
      ) : null}

      {/* ── Stats row ───────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity:0, y:10 }}
        animate={{ opacity:1, y:0 }}
        transition={{ delay:0.1 }}
        className="grid grid-cols-3 gap-3"
      >
        {[
          { emoji: '💸', label: 'Total Spent',   val: `₹${transactions.filter(t=>t.type==='DEBIT').reduce((s,t)=>s+t.amount,0).toFixed(0)}` },
          { emoji: '🔄', label: 'Transactions',  val: `${transactions.length}` },
          { emoji: '💰', label: 'Cashbacks',     val: `₹${transactions.filter(t=>t.type==='REFUND').reduce((s,t)=>s+t.amount,0).toFixed(0)}` },
        ].map(({ emoji, label, val }) => (
          <div key={label} className="rounded-2xl p-3 text-center"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-xl">{emoji}</p>
            <p className="mt-1 text-sm font-black" style={{ color: 'var(--tx)' }}>{val}</p>
            <p className="text-[9px] font-semibold" style={{ color: 'var(--tx-3)' }}>{label}</p>
          </div>
        ))}
      </motion.div>

      {/* ── Top-up form (animated) ──────────────────────────────── */}
      <AnimatePresence>
        {showTopup && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-3xl p-5 space-y-4"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between">
                <p className="font-bold" style={{ color: 'var(--tx)' }}>Add Money to Wallet</p>
                <button onClick={() => setShowTopup(false)} style={{ color: 'var(--tx-3)', fontSize: 18 }}>×</button>
              </div>

              {/* Quick amounts */}
              <div className="flex gap-2">
                {QUICK_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setTopupAmount(String(amt))}
                    className="flex-1 rounded-xl py-2 text-xs font-bold transition hover:opacity-80"
                    style={{
                      background: topupAmount === String(amt) ? 'color-mix(in srgb,var(--accent) 18%,var(--surface-2))' : 'var(--surface-2)',
                      border: `1px solid ${topupAmount === String(amt) ? 'var(--accent)' : 'var(--border)'}`,
                      color: topupAmount === String(amt) ? 'var(--accent)' : 'var(--tx-2)',
                    }}
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>

              <form onSubmit={handleTopup} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--tx-3)' }}>
                    Custom Amount (₹)
                  </label>
                  <input
                    type="number" min={10} value={topupAmount}
                    onChange={(e) => setTopupAmount(e.target.value)}
                    placeholder="Min ₹10"
                    className="w-full rounded-2xl px-4 py-2.5 text-sm outline-none"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--tx)' }}
                  />
                </div>

                {/* Gateway toggle */}
                <div className="flex gap-2">
                  {(['razorpay','stripe'] as PaymentGateway[]).map((g) => (
                    <button
                      key={g} type="button"
                      onClick={() => setGateway(g)}
                      className="flex-1 rounded-xl py-2 text-xs font-bold capitalize transition hover:opacity-80"
                      style={{
                        background: gateway === g ? 'color-mix(in srgb,var(--accent) 14%,var(--surface-2))' : 'var(--surface-2)',
                        border: `1px solid ${gateway === g ? 'var(--accent)' : 'var(--border)'}`,
                        color: gateway === g ? 'var(--accent)' : 'var(--tx-2)',
                      }}
                    >
                      {g === 'razorpay' ? '⚡ Razorpay' : '💳 Stripe'}
                    </button>
                  ))}
                </div>

                {topupMsg && (
                  <p className="text-sm font-semibold"
                    style={{ color: topupMsg.startsWith('✓') ? 'var(--success-text)' : 'var(--danger-text)' }}>
                    {topupMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={initiating}
                  className="w-full rounded-2xl py-3 text-sm font-bold transition hover:opacity-80 disabled:opacity-50"
                  style={{ background: 'var(--accent)', color: '#0D0906' }}
                >
                  {initiating ? 'Processing…' : `Add ₹${topupAmount || '—'} via ${gateway}`}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Transaction history ─────────────────────────────────── */}
      <section>
        <p className="mb-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--tx-3)' }}>
          Transaction History
        </p>

        {transactions.length === 0 && !txLoading ? (
          <div className="py-16 text-center rounded-3xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-4xl">💳</p>
            <p className="mt-3 font-semibold" style={{ color: 'var(--tx-2)' }}>No transactions yet</p>
            <p className="text-sm" style={{ color: 'var(--tx-3)' }}>Add money or place an order to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([date, txs]) => (
              <div key={date}>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--tx-3)' }}>{date}</p>
                <div className="overflow-hidden rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  {txs.map((tx, i) => {
                    const cfg = TX_CFG[tx.type] ?? { icon: '·', color: 'var(--tx-2)', sign: '' };
                    return (
                      <div
                        key={tx.id}
                        className="flex items-center gap-3 px-4 py-3"
                        style={{ borderTop: i > 0 ? '1px solid var(--border-sub)' : 'none' }}
                      >
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black"
                          style={{ background: `${cfg.color}18`, color: cfg.color }}
                        >
                          {cfg.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold" style={{ color: 'var(--tx)' }}>
                            {tx.description ?? tx.type}
                          </p>
                          <p className="text-[10px]" style={{ color: 'var(--tx-3)' }}>
                            {new Date(tx.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            {tx.status && ` · ${tx.status}`}
                          </p>
                        </div>
                        <p className="shrink-0 font-black text-sm" style={{ color: cfg.color }}>
                          {cfg.sign}₹{Math.abs(tx.amount)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {hasMore && (
              <button
                onClick={loadMore}
                disabled={txLoading}
                className="w-full rounded-2xl py-3 text-sm font-bold transition hover:opacity-75 disabled:opacity-50"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--tx-2)' }}
              >
                {txLoading ? 'Loading…' : 'Load more'}
              </button>
            )}
          </div>
        )}
      </section>

      {/* ── Saved payment methods (placeholder) ─────────────────── */}
      <section>
        <p className="mb-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--tx-3)' }}>
          Saved Payment Methods
        </p>
        <div className="space-y-2">
          {[
            { icon: '🏦', label: 'UPI',  sub: 'yourid@upi',        tag: 'Primary' },
            { icon: '💳', label: 'Card', sub: '**** **** **** 4242', tag: ''       },
          ].map(({ icon, label, sub, tag }) => (
            <div key={label}
              className="flex items-center gap-3 rounded-2xl p-4"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl"
                style={{ background: 'var(--surface-2)' }}>
                {icon}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold" style={{ color: 'var(--tx)' }}>{label}</p>
                <p className="text-xs font-mono" style={{ color: 'var(--tx-3)' }}>{sub}</p>
              </div>
              {tag && (
                <span className="rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide"
                  style={{ background: 'var(--accent)', color: '#0D0906' }}>
                  {tag}
                </span>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
