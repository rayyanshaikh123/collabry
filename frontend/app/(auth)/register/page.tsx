'use client';

import React, { useEffect } from 'react';
import Auth from '../../../views/Auth';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth.store';

export default function RegisterPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const targetRoute = user.role === 'admin' ? '/admin' : '/dashboard';
      router.push(targetRoute);
    }
  }, [isAuthenticated, user, router]);

  const handleAuthSuccess = () => {
    // Get fresh user state after successful auth
    const currentUser = useAuthStore.getState().user;
    const targetRoute = currentUser?.role === 'admin' ? '/admin' : '/dashboard';
    
    // Clear selected role from sessionStorage
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('selectedRole');
    }
    
    router.push(targetRoute);
  };

  return <Auth type="register" onAuthSuccess={handleAuthSuccess} />;
}


