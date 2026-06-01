'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { getToken, getUserRole, clearToken } from '../../lib/auth';

const NAV_LINK = 'rounded-full border border-slate-200 px-4 py-2 text-slate-700 transition hover:bg-slate-100';
const LOGOUT_BTN = 'rounded-full border border-rose-200 px-4 py-2 text-rose-600 transition hover:bg-rose-50';

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
        <button onClick={handleLogout} className={LOGOUT_BTN}>Logout</button>
      ) : (
        <Link href="/auth/login" className={NAV_LINK}>Partner Login</Link>
      )}
    </nav>
  );
}
