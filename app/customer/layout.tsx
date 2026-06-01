'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { clearCustomerTokens, getCustomerName } from '../../lib/customer-auth';
import { customerAuthApi } from '../../lib/api';

// ── Inline SVG Icons ────────────────────────────────────────────────────────

function IconHome({ filled }: { filled?: boolean }) {
  return filled ? (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
      <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z" />
    </svg>
  ) : (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

function IconExplore({ filled }: { filled?: boolean }) {
  return filled ? (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function IconOrders({ filled }: { filled?: boolean }) {
  return filled ? (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.25 2.25a.75.75 0 000 1.5h1.386c.17 0 .318.114.362.278l2.558 9.592a3.752 3.752 0 00-2.806 3.63c0 .414.336.75.75.75h15.75a.75.75 0 000-1.5H5.378A2.25 2.25 0 017.5 15h11.218a.75.75 0 00.674-.421 60.358 60.358 0 002.96-7.228.75.75 0 00-.525-.965A60.864 60.864 0 005.68 4.509l-.232-.867A1.875 1.875 0 003.636 2.25H2.25zM3.75 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM16.5 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" />
    </svg>
  ) : (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
    </svg>
  );
}

function IconWallet({ filled }: { filled?: boolean }) {
  return filled ? (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.273 5.625A4.483 4.483 0 015.25 4.5h13.5c1.141 0 2.183.425 2.977 1.125A3 3 0 0018.75 3H5.25a3 3 0 00-2.977 2.625zM2.273 8.625A4.483 4.483 0 015.25 7.5h13.5c1.141 0 2.183.425 2.977 1.125A3 3 0 0018.75 6H5.25a3 3 0 00-2.977 2.625zM5.25 9a3 3 0 00-3 3v6a3 3 0 003 3h13.5a3 3 0 003-3v-6a3 3 0 00-3-3H5.25zm7.5 3a.75.75 0 01.75.75v.75h.75a.75.75 0 010 1.5H13.5v.75a.75.75 0 01-1.5 0V15h-.75a.75.75 0 010-1.5h.75v-.75a.75.75 0 01.75-.75z" />
    </svg>
  ) : (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
    </svg>
  );
}

function IconProfile({ filled }: { filled?: boolean }) {
  return filled ? (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

const NAV_ITEMS = [
  { href: '/customer/discovery', label: 'Home',    Icon: IconHome    },
  { href: '/customer/cart',      label: 'Cart',    Icon: IconExplore },
  { href: '/customer/orders',    label: 'Orders',  Icon: IconOrders  },
  { href: '/customer/payments',  label: 'Wallet',  Icon: IconWallet  },
  { href: '/customer/profile',   label: 'Profile', Icon: IconProfile },
] as const;

// ── Layout ──────────────────────────────────────────────────────────────────

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const router   = useRouter();
  const isAuth   = pathname.startsWith('/customer/auth');

  const handleLogout = async () => {
    try { await customerAuthApi.logout(); } catch { /* ignore */ }
    clearCustomerTokens();
    router.push('/customer/auth/login');
  };

  if (isAuth) return <>{children}</>;

  const name   = getCustomerName();
  const initials = name ? name.trim()[0].toUpperCase() : '?';

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--tx)' }}>

      {/* ── Sticky glass header ─────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          background: 'color-mix(in srgb, var(--hdr-bg) 80%, transparent)',
          borderColor: 'var(--hdr-bdr)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">

          {/* Logo */}
          <Link href="/customer/discovery" className="shrink-0">
            <img src="/foodeez-sidebar-logo.png" alt="FooDeeZ" className="h-8 w-auto object-contain" />
          </Link>

          {/* Location chip */}
          <button
            className="hidden sm:flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition hover:opacity-75"
            style={{ background: 'var(--surface-2)', color: 'var(--tx-2)', border: '1px solid var(--border)' }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--accent)' }}>
              <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-2.013 3.5-4.619 3.5-7.327A8.25 8.25 0 006.75 11.999c0 2.708 1.556 5.314 3.5 7.327a19.58 19.58 0 002.683 2.282 16.975 16.975 0 001.144.742zM21.75 11.999a9.75 9.75 0 11-19.5 0 9.75 9.75 0 0119.5 0zM12 9.75a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z" clipRule="evenodd" />
            </svg>
            Hyderabad
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {/* Right icons */}
          <div className="flex items-center gap-2">

            {/* Notification bell */}
            <button
              className="relative flex h-9 w-9 items-center justify-center rounded-full transition hover:opacity-75"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ color: 'var(--tx-2)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
            </button>

            {/* Cart */}
            <Link
              href="/customer/cart"
              className="flex h-9 w-9 items-center justify-center rounded-full transition hover:opacity-75"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ color: 'var(--tx-2)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
            </Link>

            {/* Avatar / logout */}
            <button
              onClick={handleLogout}
              title={`Sign out (${name ?? ''})`}
              className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold transition hover:opacity-80 shrink-0"
              style={{ background: 'var(--accent)', color: '#0D0906' }}
            >
              {initials}
            </button>
          </div>
        </div>
      </header>

      {/* ── Page content ───────────────────────────────────────── */}
      <main className="pb-28">
        {children}
      </main>

      {/* ── Floating bottom nav ─────────────────────────────────── */}
      <motion.nav
        className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2"
        initial={{ y: 90, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 22, stiffness: 180, delay: 0.3 }}
      >
        <div
          className="flex items-center gap-0.5 rounded-full px-2 py-2"
          style={{
            background: 'color-mix(in srgb, var(--surface) 85%, transparent)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid color-mix(in srgb, var(--border) 60%, transparent)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.20), 0 2px 8px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const active =
              href === '/customer/discovery'
                ? pathname === '/customer/discovery' || pathname === '/customer'
                : pathname.startsWith(href);

            return (
              <Link key={href} href={href}>
                <motion.div
                  whileTap={{ scale: 0.84 }}
                  className="relative flex flex-col items-center gap-0.5 rounded-full px-3.5 py-2.5 transition-all duration-200"
                  style={{
                    background: active
                      ? 'color-mix(in srgb, var(--accent) 18%, var(--surface))'
                      : 'transparent',
                    color: active ? 'var(--accent)' : 'var(--tx-3)',
                    minWidth: 52,
                  }}
                >
                  <Icon filled={active} />
                  <span className="text-[9px] font-semibold leading-none tracking-wide">
                    {label}
                  </span>
                  {active && (
                    <motion.div
                      layoutId="nav-dot"
                      className="absolute -bottom-0.5 h-[3px] w-5 rounded-full"
                      style={{ background: 'var(--accent)' }}
                      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
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
