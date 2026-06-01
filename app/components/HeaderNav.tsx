'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { getToken, getUserRole, clearToken } from '../../lib/auth';

const NAV_LINK = 'rounded-full border border-slate-200 px-4 py-2 text-slate-700 transition hover:bg-slate-100';
const LOGOUT_BTN = 'rounded-full border border-rose-200 px-4 py-2 text-rose-600 transition hover:bg-rose-50';

function SignInIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M10 17L15 12L10 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M15 12H4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M20 19V5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M9 6H5C4.44772 6 4 6.44772 4 7V17C4 17.5523 4.44772 18 5 18H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16 12H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13 9L16 12L13 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function HeaderNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    setIsLoggedIn(!!token);
    setUserRole(getUserRole());
  }, [pathname]);

  const handleLogout = () => {
    clearToken();
    setIsLoggedIn(false);
    setUserRole(null);
    router.push('/auth/login');
  };

  const canManageRestaurants = userRole === 'super_admin' || userRole === 'sales_operator';

  return (
    <nav className="flex flex-wrap gap-2">
      <Link href="/dashboard" className={NAV_LINK}>Dashboard</Link>
      <Link href="/restaurants" className={NAV_LINK}>Restaurants</Link>
      {canManageRestaurants && (
        <Link href="/restaurants/register" className={NAV_LINK}>Add Restaurant</Link>
      )}
      {isLoggedIn ? (
        <button onClick={handleLogout} className={LOGOUT_BTN} title="Sign out">
          <span className="inline-flex items-center gap-2">
            <SignOutIcon />
            Sign out
          </span>
        </button>
      ) : (
        <>
          <Link href="/auth/signup" className={NAV_LINK}>
            <span className="inline-flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M15 14C17.7614 14 20 11.7614 20 9C20 6.2386 17.7614 4 15 4C12.2386 4 10 6.2386 10 9C10 11.7614 12.2386 14 15 14Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6 20V18C6 16.8954 6.8954 16 8 16H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20 20V18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 20L18 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Sign up
            </span>
          </Link>
          <Link href="/auth/login" className={NAV_LINK}>
            <span className="inline-flex items-center gap-2">
              <SignInIcon />
              Sign in
            </span>
          </Link>
        </>
      )}
    </nav>
  );
}