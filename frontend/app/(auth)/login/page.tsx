'use client';

import React, { useEffect } from 'react';
import Auth from '../../../views/Auth';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../src/stores/auth.store';

export default function LoginPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const redirectPath = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('redirect') : null;
      const targetRoute = redirectPath || (user.role === 'admin' ? '/admin' : '/dashboard');
      router.push(targetRoute);
    }
  }, [isAuthenticated, user, router]);

  const handleAuthSuccess = () => {
    // Get fresh user state after successful auth
    const currentUser = useAuthStore.getState().user;
    const redirectPath = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('redirect') : null;
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
