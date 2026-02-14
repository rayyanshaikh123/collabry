/**
 * User and Authentication Types
 */

export type UserRole = 'student' | 'admin' | 'mentor';
export type SubscriptionTier = 'free' | 'basic' | 'pro' | 'enterprise';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: UserRole;
  subscriptionTier?: SubscriptionTier;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string; // Now httpOnly cookie — not returned in JSON body
  csrfToken?: string; // Returned in response body for cross-origin setups
  expiresIn?: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface RegisterResponse {
  message: string;
}

export interface Session {
  id: string;
  userAgent: string;
  ipAddress: string;
  createdAt: string;
  expiresAt: string;
}
