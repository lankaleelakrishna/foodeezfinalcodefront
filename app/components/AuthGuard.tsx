'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, getUserRole } from '../../lib/auth';
import UnauthorizedPage from './UnauthorizedPage';

interface Props {
  children: React.ReactNode;
  requiredRoles?: string[];
}

type State = 'loading' | 'authorized' | 'unauthorized' | 'unauthenticated';

export default function AuthGuard({ children, requiredRoles }: Props) {
  const router = useRouter();
  const [state, setState] = useState<State>('loading');

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/auth/login');
      setState('unauthenticated');
      return;
    }
    if (requiredRoles) {
      const role = getUserRole();
      if (!role || !requiredRoles.includes(role)) {
        setState('unauthorized');
        return;
      }
    }
    setState('authorized');
  }, [router, requiredRoles]);

  if (state === 'loading' || state === 'unauthenticated') return null;
  if (state === 'unauthorized') return <UnauthorizedPage requiredRoles={requiredRoles} />;
  return <>{children}</>;
}
