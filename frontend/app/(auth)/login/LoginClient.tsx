'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import Auth from '../../../views/Auth';
import { useAuthStore } from '@/lib/stores/auth.store';

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuthStore();
  const redirectPath = searchParams.get('redirect');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const targetRoute = redirectPath || (user.role === 'admin' ? '/admin' : '/dashboard');
      router.push(targetRoute);
    }
  }, [isAuthenticated, user, router, redirectPath]);

  const handleAuthSuccess = () => {
    // Get fresh user state after successful auth
    const currentUser = useAuthStore.getState().user;

    // Use redirect path if available, otherwise use default
    const targetRoute = redirectPath || (currentUser?.role === 'admin' ? '/admin' : '/dashboard');

    // Clear selected role from sessionStorage
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('selectedRole');
    }

    router.push(targetRoute);
  };

  return <Auth type="login" onAuthSuccess={handleAuthSuccess} />;
}
