'use client';

/**
 * Role Guard Component
 * Protects routes that require specific user roles
 */

import React from 'react';
import { useAuthStore } from '@/lib/stores/auth.store';
import type { UserRole } from '@/types';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallback?: React.ReactNode;
  redirectTo?: string;
  onRedirect?: () => void;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  allowedRoles,
  fallback,
  redirectTo = '/dashboard',
  onRedirect,
}) => {
  const { user, isAuthenticated } = useAuthStore();

  // If not authenticated, show auth required message
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Authentication Required
          </h2>
          <p className="text-gray-600">
            Please log in to access this page.
          </p>
        </div>
      </div>
    );
  }

  // Check if user has required role
  const hasRequiredRole = allowedRoles.includes(user.role);

  if (!hasRequiredRole) {
    if (onRedirect) {
      onRedirect();
      return null;
    }

    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 mb-4">
            You don't have permission to access this page.
          </p>
          {onRedirect && (
            <button
              onClick={onRedirect}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go to Dashboard
            </button>
          )}
        </div>
      </div>
    );
  }

  // User has required role, render children
  return <>{children}</>;
};

export default RoleGuard;
