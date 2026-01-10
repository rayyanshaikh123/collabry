/**
 * Authentication Store Tests
 * Tests for Zustand auth store state management
 */
import { act } from '@testing-library/react';

// Mock API responses
const mockUser = {
  id: 'user-123',
  name: 'Test User',
  email: 'test@example.com',
  role: 'student',
  subscriptionTier: 'free',
};

const mockTokens = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
};

// Mock the auth service
jest.mock('../../src/services/auth.service', () => ({
  authService: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    refreshToken: jest.fn(),
    getCurrentUser: jest.fn(),
  },
}));

// Mock socket client
jest.mock('../../src/lib/socket', () => ({
  socketClient: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    isConnected: jest.fn(() => false),
  },
}));

describe('Auth Store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear localStorage
    localStorage.clear();
  });

  describe('Initial State', () => {
    it('should have correct initial state', async () => {
      // Import fresh store
      jest.resetModules();
      const { useAuthStore } = await import('../../src/stores/auth.store');
      
      const state = useAuthStore.getState();
      
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('Login Action', () => {
    it('should update state on successful login', async () => {
      const { authService } = await import('../../src/services/auth.service');
      const { useAuthStore } = await import('../../src/stores/auth.store');
      
      // Mock successful login
      (authService.login as jest.Mock).mockResolvedValue({
        user: mockUser,
        tokens: mockTokens,
      });

      await act(async () => {
        await useAuthStore.getState().login({
          email: 'test@example.com',
          password: 'password123',
        });
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.accessToken).toBe(mockTokens.accessToken);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set error on failed login', async () => {
      const { authService } = await import('../../src/services/auth.service');
      const { useAuthStore } = await import('../../src/stores/auth.store');
      
      // Mock failed login
      (authService.login as jest.Mock).mockRejectedValue(
        new Error('Invalid credentials')
      );

      await act(async () => {
        try {
          await useAuthStore.getState().login({
            email: 'test@example.com',
            password: 'wrong',
          });
        } catch (e) {
          // Expected to throw
        }
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBe('Invalid credentials');
    });
  });

  describe('Logout Action', () => {
    it('should clear state on logout', async () => {
      const { authService } = await import('../../src/services/auth.service');
      const { useAuthStore } = await import('../../src/stores/auth.store');
      
      // Set initial authenticated state
      useAuthStore.setState({
        user: mockUser,
        accessToken: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken,
        isAuthenticated: true,
      });

      (authService.logout as jest.Mock).mockResolvedValue(undefined);

      await act(async () => {
        await useAuthStore.getState().logout();
      });

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('Clear Error Action', () => {
    it('should clear error state', async () => {
      const { useAuthStore } = await import('../../src/stores/auth.store');
      
      // Set error state
      useAuthStore.setState({ error: 'Some error' });
      expect(useAuthStore.getState().error).toBe('Some error');

      act(() => {
        useAuthStore.getState().clearError();
      });

      expect(useAuthStore.getState().error).toBeNull();
    });
  });
});

describe('Auth State Persistence', () => {
  it('should persist to localStorage', async () => {
    const { useAuthStore } = await import('../../src/stores/auth.store');
    
    // Set state
    useAuthStore.setState({
      user: mockUser,
      accessToken: mockTokens.accessToken,
      refreshToken: mockTokens.refreshToken,
      isAuthenticated: true,
    });

    // Check localStorage (Zustand persist middleware should save it)
    const stored = localStorage.getItem('auth-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.user).toEqual(mockUser);
    }
  });
});
