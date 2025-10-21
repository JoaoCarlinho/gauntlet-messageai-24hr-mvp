import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { authLogic } from '../../store/auth';
import { authAPI } from '../../lib/api';
import * as SecureStore from 'expo-secure-store';

// Mock dependencies
jest.mock('../../lib/api');
jest.mock('expo-secure-store');
jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
  },
}));

describe('Authentication Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authLogic.actions.clearAuth();
  });

  describe('Complete Registration Flow', () => {
    it('should handle successful registration from start to finish', async () => {
      const mockAuthResponse = {
        user: {
          id: '1',
          email: 'newuser@example.com',
          displayName: 'New User',
          lastSeen: new Date(),
          isOnline: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      (authAPI.register as jest.Mock).mockResolvedValue(mockAuthResponse);

      // Simulate registration
      const userData = {
        email: 'newuser@example.com',
        password: 'Password123',
        displayName: 'New User',
      };

      authLogic.actions.register(userData);

      // Wait for async operations
      await waitFor(() => {
        const state = authLogic.getState();
        expect(state.isAuthenticated).toBe(true);
        expect(state.user).toEqual(mockAuthResponse.user);
        expect(state.accessToken).toBe(mockAuthResponse.accessToken);
        expect(state.refreshToken).toBe(mockAuthResponse.refreshToken);
      });

      // Verify SecureStore was called
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('access_token', mockAuthResponse.accessToken);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('refresh_token', mockAuthResponse.refreshToken);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('user_data', JSON.stringify(mockAuthResponse.user));
    });

    it('should handle registration error', async () => {
      const errorMessage = 'Email already exists';
      (authAPI.register as jest.Mock).mockRejectedValue(new Error(errorMessage));

      const userData = {
        email: 'existing@example.com',
        password: 'Password123',
        displayName: 'Existing User',
      };

      authLogic.actions.register(userData);

      await waitFor(() => {
        const state = authLogic.getState();
        expect(state.isAuthenticated).toBe(false);
        expect(state.error).toBe(errorMessage);
        expect(state.isLoading).toBe(false);
      });
    });
  });

  describe('Complete Login Flow', () => {
    it('should handle successful login from start to finish', async () => {
      const mockAuthResponse = {
        user: {
          id: '1',
          email: 'test@example.com',
          displayName: 'Test User',
          lastSeen: new Date(),
          isOnline: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      (authAPI.login as jest.Mock).mockResolvedValue(mockAuthResponse);

      // Simulate login
      const credentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      authLogic.actions.login(credentials);

      await waitFor(() => {
        const state = authLogic.getState();
        expect(state.isAuthenticated).toBe(true);
        expect(state.user).toEqual(mockAuthResponse.user);
        expect(state.accessToken).toBe(mockAuthResponse.accessToken);
        expect(state.refreshToken).toBe(mockAuthResponse.refreshToken);
      });

      // Verify SecureStore was called
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('access_token', mockAuthResponse.accessToken);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('refresh_token', mockAuthResponse.refreshToken);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('user_data', JSON.stringify(mockAuthResponse.user));
    });

    it('should handle login error', async () => {
      const errorMessage = 'Invalid credentials';
      (authAPI.login as jest.Mock).mockRejectedValue(new Error(errorMessage));

      const credentials = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      authLogic.actions.login(credentials);

      await waitFor(() => {
        const state = authLogic.getState();
        expect(state.isAuthenticated).toBe(false);
        expect(state.error).toBe(errorMessage);
        expect(state.isLoading).toBe(false);
      });
    });
  });

  describe('Complete Logout Flow', () => {
    it('should handle logout from authenticated state', async () => {
      // First set up authenticated state
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        displayName: 'Test User',
        lastSeen: new Date(),
        isOnline: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      authLogic.actions.setUser(mockUser);
      authLogic.actions.setTokens('access-token', 'refresh-token');

      (authAPI.logout as jest.Mock).mockResolvedValue(undefined);

      // Simulate logout
      authLogic.actions.logout();

      await waitFor(() => {
        const state = authLogic.getState();
        expect(state.isAuthenticated).toBe(false);
        expect(state.user).toBeNull();
        expect(state.accessToken).toBeNull();
        expect(state.refreshToken).toBeNull();
        expect(state.isLoading).toBe(false);
      });

      // Verify SecureStore was cleared
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('access_token');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('refresh_token');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('user_data');
    });
  });

  describe('Token Refresh Flow', () => {
    it('should handle successful token refresh', async () => {
      const mockAuthResponse = {
        user: {
          id: '1',
          email: 'test@example.com',
          displayName: 'Test User',
          lastSeen: new Date(),
          isOnline: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      (authAPI.refreshToken as jest.Mock).mockResolvedValue(mockAuthResponse);

      // Set up initial state with old tokens
      authLogic.actions.setTokens('old-access-token', 'old-refresh-token');

      // Simulate token refresh
      authLogic.actions.refreshToken();

      await waitFor(() => {
        const state = authLogic.getState();
        expect(state.accessToken).toBe('new-access-token');
        expect(state.refreshToken).toBe('new-refresh-token');
        expect(state.user).toEqual(mockAuthResponse.user);
        expect(state.isLoading).toBe(false);
      });

      // Verify SecureStore was updated
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('access_token', 'new-access-token');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('refresh_token', 'new-refresh-token');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('user_data', JSON.stringify(mockAuthResponse.user));
    });

    it('should handle token refresh failure and logout', async () => {
      (authAPI.refreshToken as jest.Mock).mockRejectedValue(new Error('Token expired'));

      // Set up initial state
      authLogic.actions.setTokens('old-access-token', 'old-refresh-token');

      // Simulate token refresh
      authLogic.actions.refreshToken();

      await waitFor(() => {
        const state = authLogic.getState();
        expect(state.isAuthenticated).toBe(false);
        expect(state.user).toBeNull();
        expect(state.accessToken).toBeNull();
        expect(state.refreshToken).toBeNull();
      });

      // Verify SecureStore was cleared
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('access_token');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('refresh_token');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('user_data');
    });
  });

  describe('App Initialization Flow', () => {
    it('should restore auth state from storage on app start', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        displayName: 'Test User',
        lastSeen: new Date(),
        isOnline: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (SecureStore.getItemAsync as jest.Mock)
        .mockResolvedValueOnce('access-token') // access token
        .mockResolvedValueOnce('refresh-token') // refresh token
        .mockResolvedValueOnce(JSON.stringify(mockUser)); // user data

      (authAPI.refreshToken as jest.Mock).mockResolvedValue({
        user: mockUser,
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      // Simulate app initialization
      authLogic.actions.initializeAuth();

      await waitFor(() => {
        const state = authLogic.getState();
        expect(state.isAuthenticated).toBe(true);
        expect(state.user).toEqual(mockUser);
        expect(state.isLoading).toBe(false);
      });
    });

    it('should handle initialization with no stored data', async () => {
      (SecureStore.getItemAsync as jest.Mock)
        .mockResolvedValueOnce(null) // access token
        .mockResolvedValueOnce(null) // refresh token
        .mockResolvedValueOnce(null); // user data

      // Simulate app initialization
      authLogic.actions.initializeAuth();

      await waitFor(() => {
        const state = authLogic.getState();
        expect(state.isAuthenticated).toBe(false);
        expect(state.user).toBeNull();
        expect(state.isLoading).toBe(false);
      });
    });
  });

  describe('State Selectors', () => {
    it('should return correct selector values', () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        displayName: 'Test User',
        lastSeen: new Date(),
        isOnline: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      authLogic.actions.setUser(mockUser);
      authLogic.actions.setTokens('access-token', 'refresh-token');

      const state = authLogic.getState();

      expect(state.isLoggedIn).toBe(true);
      expect(state.currentUser).toEqual(mockUser);
      expect(state.hasValidTokens).toBe(true);
    });
  });
});
