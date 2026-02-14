/**
 * Authentication Hooks
 * Custom hooks for auth-related functionality
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/stores/auth.store';
import { authService } from '@/lib/services/auth.service';
import type { LoginCredentials, RegisterData, User } from '@/types/user.types';

/**
 * Hook to access auth state and actions
 */
export const useAuth = () => {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
  } = useAuthStore();

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
  };
};

/**
 * Hook for login mutation
 */
export const useLogin = () => {
  const { login } = useAuthStore();
  
  return useMutation({
    mutationFn: (credentials: LoginCredentials) => login(credentials),
    onSuccess: () => {
      // Redirect or refetch user data
    },
    onError: (error) => {
      console.error('Login failed:', error);
    },
  });
};

/**
 * Hook for register mutation
 */
export const useRegister = () => {
  const { register } = useAuthStore();
  
  return useMutation({
    mutationFn: (data: RegisterData) => register(data),
    onSuccess: () => {
      // Redirect or refetch user data
    },
    onError: (error) => {
      console.error('Registration failed:', error);
    },
  });
};

/**
 * Hook for logout mutation
 */
export const useLogout = () => {
  const { logout } = useAuthStore();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => logout(),
    onSuccess: () => {
      // Clear all queries on logout
      queryClient.clear();
    },
  });
};

/**
 * Hook to fetch current user
 */
export const useCurrentUser = () => {
  const { user, isAuthenticated, accessToken } = useAuthStore();
  
  return useQuery({
    queryKey: ['user', 'me'],
    queryFn: () => authService.getCurrentUser(),
    enabled: isAuthenticated && !!accessToken && !user,
    staleTime: Infinity, // User data rarely changes
  });
};

/**
 * Hook to update user profile
 */
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { setUser } = useAuthStore();
  
  return useMutation({
    mutationFn: (data: Partial<User>) => authService.updateProfile(data),
    onSuccess: (updatedUser) => {
      // Update user in store
      setUser(updatedUser);
      
      // Invalidate user query
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
    },
  });
};

/**
 * Hook to request password reset
 */
export const useForgotPassword = () => {
  return useMutation({
    mutationFn: (email: string) => authService.forgotPassword(email),
  });
};

/**
 * Hook to reset password
 */
export const useResetPassword = () => {
  return useMutation({
    mutationFn: ({ token, newPassword }: { token: string; newPassword: string }) =>
      authService.resetPassword(token, newPassword),
  });
};
