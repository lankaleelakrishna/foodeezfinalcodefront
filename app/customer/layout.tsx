'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { clearCustomerTokens, getCustomerName } from '../../lib/customer-auth';
import { customerAuthApi, customerCartApi } from '../../lib/api';
import { CartProvider, useCartContext } from './cart-context';
import { useEffect, useState } from 'react';

// ── Icons ────────────────────────────────────────────────────────────────────

function IconHome({ filled }: { filled?: boolean }) {
  return filled ? (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
      <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z" />
    </svg>
  ) : (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

function IconCart({ filled }: { filled?: boolean }) {
  return filled ? (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.25 2.25a.75.75 0 000 1.5h1.386c.17 0 .318.114.362.278l2.558 9.592a3.752 3.752 0 00-2.806 3.63c0 .414.336.75.75.75h15.75a.75.75 0 000-1.5H5.378A2.25 2.25 0 017.5 15h11.218a.75.75 0 00.674-.421 60.358 60.358 0 002.96-7.228.75.75 0 00-.525-.965A60.864 60.864 0 005.68 4.509l-.232-.867A1.875 1.875 0 003.636 2.25H2.25zM3.75 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM16.5 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" />
    </svg>
  ) : (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
    </svg>
  );
}

function IconOrders({ filled }: { filled?: boolean }) {
  return filled ? (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M7.502 6h7.128A3.375 3.375 0 0118 9.375v9.375a3 3 0 003-3V6.108c0-1.505-1.125-2.811-2.664-2.94a48.972 48.972 0 00-.673-.05A3 3 0 0015 1.5h-1.5a3 3 0 00-2.663 1.618c-.225.015-.45.032-.673.05C8.662 3.295 7.554 4.542 7.502 6zM13.5 3A1.5 1.5 0 0012 4.5h4.5A1.5 1.5 0 0015 3h-1.5zM4.875 6H6v10.125A3.375 3.375 0 009.375 19.5H16.5a3 3 0 01-3 3H6.75a3.375 3.375 0 01-3.375-3.375V9.375A3.375 3.375 0 014.875 6z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  );
}

function IconWallet({ filled }: { filled?: boolean }) {
  return filled ? (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.273 5.625A4.483 4.483 0 015.25 4.5h13.5c1.141 0 2.183.425 2.977 1.125A3 3 0 0018.75 3H5.25a3 3 0 00-2.977 2.625zM2.273 8.625A4.483 4.483 0 015.25 7.5h13.5c1.141 0 2.183.425 2.977 1.125A3 3 0 0018.75 6H5.25a3 3 0 00-2.977 2.625zM5.25 9a3 3 0 00-3 3v6a3 3 0 003 3h13.5a3 3 0 003-3v-6a3 3 0 00-3-3H5.25zm7.5 3a.75.75 0 01.75.75v.75h.75a.75.75 0 010 1.5H13.5v.75a.75.75 0 01-1.5 0V15h-.75a.75.75 0 010-1.5h.75v-.75a.75.75 0 01.75-.75z" />
    </svg>
  ) : (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
    </svg>
  );
}

function IconProfile({ filled }: { filled?: boolean }) {
  return filled ? (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function IconPin() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--accent)' }}>
      <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-2.013 3.5-4.619 3.5-7.327A8.25 8.25 0 006.75 11.999c0 2.708 1.556 5.314 3.5 7.327a19.58 19.58 0 002.683 2.282 16.975 16.975 0 001.144.742zM21.75 11.999a9.75 9.75 0 11-19.5 0 9.75 9.75 0 0119.5 0zM12 9.75a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z" clipRule="evenodd" />
    </svg>
  );
}

function IconChevronDown() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

// ── Nav items ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: '/customer/discovery', label: 'Home',   Icon: IconHome   },
  { href: '/customer/cart',      label: 'Cart',   Icon: IconCart   },
  { href: '/customer/payments',  label: 'Wallet', Icon: IconWallet },
] as const;

// ── Inner layout ─────────────────────────────────────────────────────────────

function CustomerLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname() ?? '';
  const router    = useRouter();
  const isAuth    = pathname.startsWith('/customer/auth');
  const { cartCount, setCartCount } = useCartContext();
  const [scrolled, setScrolled] = useState(false);

  // Scroll-aware header opacity
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Sync cart count on mount
  useEffect(() => {
    if (isAuth) return;
    customerCartApi.get().then((res) => {
      const items: any[] = res.data?.items ?? [];
      setCartCount(items.reduce((s: number, i: any) => s + (Number(i.quantity) || 1), 0));
    }).catch(() => {});
  }, [isAuth]);

  const handleLogout = async () => {
    try { await customerAuthApi.logout(); } catch { /* ignore */ }
    clearCustomerTokens();
    router.push('/customer/auth/login');
  };

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  if (isAuth) return <>{children}</>;

  const name     = getCustomerName();
  const initials = name ? name.trim()[0].toUpperCase() : '?';

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--tx)' }}>

      {/* ── PREMIUM STICKY HEADER ─────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 transition-all duration-300"
        style={{
          background: scrolled
            ? 'color-mix(in srgb, var(--hdr-bg) 97%, transparent)'
            : 'color-mix(in srgb, var(--hdr-bg) 80%, transparent)',
          borderBottom: `1px solid ${scrolled ? 'var(--hdr-bdr)' : 'transparent'}`,
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          boxShadow: scrolled ? '0 2px 24px rgba(0,0,0,0.08)' : 'none',
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">

          {/* Logo */}
          <Link href="/customer/discovery" className="shrink-0 transition-opacity hover:opacity-80">
            <img
              src="/foodeez-sidebar-logo.png"
              alt="FooDeeZ"
              className="h-12 w-auto object-contain"
            />
          </Link>

          {/* Location chip — sm+ */}
          <button
            className="hidden sm:flex items-center gap-1.5 shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all hover:opacity-75"
            style={{
              background: 'var(--surface-2)',
              color: 'var(--tx-2)',
              border: '1px solid var(--border)',
            }}
          >
            <IconPin />
            <span>Hyderabad</span>
            <IconChevronDown />
          </button>

          {/* Search slot — md+ (decorative, routes to discovery) */}
          <Link
            href="/customer/discovery"
            className="hidden md:flex flex-1 max-w-md items-center gap-2.5 rounded-xl px-4 py-2 transition-all hover:border-[color:var(--accent)]"
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
            }}
          >
            <span style={{ color: 'var(--tx-3)' }}><IconSearch /></span>
            <span className="text-xs font-medium" style={{ color: 'var(--tx-3)' }}>
              Restaurants, dishes, cuisines…
            </span>
          </Link>

          {/* Spacer on mobile */}
          <div className="flex-1 md:hidden" />

          {/* ── Right actions ──────────────────────────────────────────────── */}
          <div className="flex items-center gap-1.5 sm:gap-2">

            {/* Notification bell */}
            <button
              className="relative flex h-9 w-9 items-center justify-center rounded-xl transition hover:opacity-75"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--tx-2)',
              }}
            >
              <IconBell />
              <span
                className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full"
                style={{
                  background: '#EF4444',
                  boxShadow: '0 0 0 1.5px var(--bg)',
                }}
              />
            </button>

            {/* Cart */}
            <Link
              href="/customer/cart"
              className="relative flex h-9 w-9 items-center justify-center rounded-xl transition hover:opacity-75"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--tx-2)',
              }}
            >
              <IconCart />
              {cartCount > 0 && (
                <motion.span
                  key={cartCount}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                  className="absolute -right-1.5 -top-1.5 flex items-center justify-center rounded-full text-[8px] font-black leading-none"
                  style={{
                    background: 'var(--accent)',
                    color: 'white',
                    minWidth: '1.15rem',
                    height: '1.15rem',
                    padding: '0 3px',
                  }}
                >
                  {cartCount > 9 ? '9+' : cartCount}
                </motion.span>
              )}
            </Link>

            {/* Avatar / dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setProfileMenuOpen(true)}
              onMouseLeave={() => setProfileMenuOpen(false)}
            >
              <button
                type="button"
                title="Account menu"
                className="h-9 w-9 rounded-xl flex items-center justify-center transition hover:opacity-80 shrink-0"
                style={{
                  background: 'linear-gradient(135deg, var(--accent-2) 0%, var(--accent) 100%)',
                  color: 'white',
                  boxShadow: '0 2px 8px var(--accent-muted)',
                }}
              >
                <IconUser />
              </button>

              <div
                className={`absolute right-0 top-full z-20 mt-2 w-36 overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl transition-all duration-200 ${profileMenuOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'}`}
                style={{ backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' }}
              >
                <Link
                  href="/customer/profile"
                  className="block px-4 py-3 text-sm font-semibold text-[var(--tx)] transition hover:bg-[var(--surface-2)]"
                >
                  Profile
                </Link>
                <Link
                  href="/customer/orders"
                  className="block px-4 py-3 text-sm font-semibold text-[var(--tx)] transition hover:bg-[var(--surface-2)]"
                >
                  Orders
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3 text-sm font-semibold text-[var(--tx)] transition hover:bg-[var(--surface-2)]"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Page content ───────────────────────────────────────────────────── */}
      <main className="pb-28">
        {children}
      </main>

      {/* ── PREMIUM FLOATING BOTTOM NAV ─────────────────────────────────────── */}
      <motion.nav
        className="fixed inset-x-0 bottom-4 z-50 flex justify-center"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 22, stiffness: 200, delay: 0.2 }}
      >
        <div
          className="w-max flex items-center gap-0.5 rounded-full px-2 py-1.5"
          style={{
            background: 'color-mix(in srgb, var(--surface) 94%, transparent)',
            backdropFilter: 'blur(32px)',
            WebkitBackdropFilter: 'blur(32px)',
            border: '1px solid color-mix(in srgb, var(--border) 80%, transparent)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.24), 0 2px 8px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const active =
              href === '/customer/discovery'
                ? pathname === '/customer/discovery' || pathname === '/customer'
                : pathname.startsWith(href);
            const isCart = label === 'Cart';

            return (
              <Link key={href} href={href} className="no-underline">
                <motion.div
                  whileTap={{ scale: 0.80 }}
                  className="relative flex flex-col items-center justify-center gap-0.5 rounded-full transition-colors duration-200"
                  style={{
                    background: active
                      ? 'color-mix(in srgb, var(--accent) 14%, var(--surface))'
                      : 'transparent',
                    color: active ? 'var(--accent)' : 'var(--tx-3)',
                    minWidth: 54,
                    padding: '7px 8px',
                  }}
                >
                  {/* Icon with optional cart badge */}
                  <div className="relative">
                    <Icon filled={active} />
                    {isCart && cartCount > 0 && (
                      <motion.span
                        key={cartCount}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                        className="absolute -right-1 -top-1 flex items-center justify-center rounded-full text-[7px] font-black leading-none"
                        style={{
                          background: 'var(--accent)',
                          color: 'white',
                          minWidth: '0.9rem',
                          height: '0.9rem',
                          padding: '0 2px',
                        }}
                      >
                        {cartCount > 9 ? '9+' : cartCount}
                      </motion.span>
                    )}
                  </div>

                  <span className="text-[9px] font-semibold leading-none tracking-wide">
                    {label}
                  </span>

                  {/* Active indicator dot */}
                  {active && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute -bottom-0.5 h-[3px] w-4 rounded-full"
                      style={{ background: 'var(--accent)' }}
                      transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                    />
                  )}
                </motion.div>
              </Link>
            );
          })}
        </div>
      </motion.nav>
    </div>
  );
}

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <CustomerLayoutInner>{children}</CustomerLayoutInner>
    </CartProvider>
  );
}