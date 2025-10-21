import { authLogic } from '../../store/auth';
import * as SecureStore from 'expo-secure-store';
import { authAPI } from '../../lib/api';

// Mock the API
jest.mock('../../lib/api', () => ({
  authAPI: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    refreshToken: jest.fn(),
  },
}));

// Mock SecureStore
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

describe('Auth Store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the store state
    authLogic.actions.clearAuth();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = authLogic.getState();
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('Login Action', () => {
    it('should handle successful login', async () => {
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

      const credentials = { email: 'test@example.com', password: 'password123' };
      
      // Trigger login action
      authLogic.actions.login(credentials);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      const state = authLogic.getState();
      expect(state.user).toEqual(mockAuthResponse.user);
      expect(state.accessToken).toBe(mockAuthResponse.accessToken);
      expect(state.refreshToken).toBe(mockAuthResponse.refreshToken);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();

      // Verify SecureStore was called
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('access_token', mockAuthResponse.accessToken);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('refresh_token', mockAuthResponse.refreshToken);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('user_data', JSON.stringify(mockAuthResponse.user));
    });

    it('should handle login error', async () => {
      const errorMessage = 'Invalid credentials';
      (authAPI.login as jest.Mock).mockRejectedValue(new Error(errorMessage));

      const credentials = { email: 'test@example.com', password: 'wrongpassword' };
      
      authLogic.actions.login(credentials);

      await new Promise(resolve => setTimeout(resolve, 100));

      const state = authLogic.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe(errorMessage);
    });
  });

  describe('Register Action', () => {
    it('should handle successful registration', async () => {
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

      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        displayName: 'New User',
      };
      
      authLogic.actions.register(userData);

      await new Promise(resolve => setTimeout(resolve, 100));

      const state = authLogic.getState();
      expect(state.user).toEqual(mockAuthResponse.user);
      expect(state.isAuthenticated).toBe(true);
      expect(state.error).toBeNull();
    });
  });

  describe('Logout Action', () => {
    it('should handle logout', async () => {
      // First set up authenticated state
      authLogic.actions.setUser({
        id: '1',
        email: 'test@example.com',
        displayName: 'Test User',
        lastSeen: new Date(),
        isOnline: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      authLogic.actions.setTokens('access-token', 'refresh-token');

      (authAPI.logout as jest.Mock).mockResolvedValue(undefined);

      authLogic.actions.logout();

      await new Promise(resolve => setTimeout(resolve, 100));

      const state = authLogic.getState();
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);

      // Verify SecureStore was cleared
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('access_token');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('refresh_token');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('user_data');
    });
  });

  describe('Initialize Auth Action', () => {
    it('should restore auth state from storage', async () => {
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

      authLogic.actions.initializeAuth();

      await new Promise(resolve => setTimeout(resolve, 100));

      const state = authLogic.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it('should handle initialization with no stored data', async () => {
      (SecureStore.getItemAsync as jest.Mock)
        .mockResolvedValueOnce(null) // access token
        .mockResolvedValueOnce(null) // refresh token
        .mockResolvedValueOnce(null); // user data

      authLogic.actions.initializeAuth();

      await new Promise(resolve => setTimeout(resolve, 100));

      const state = authLogic.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('Selectors', () => {
    it('should return correct isLoggedIn selector', () => {
      authLogic.actions.setUser({
        id: '1',
        email: 'test@example.com',
        displayName: 'Test User',
        lastSeen: new Date(),
        isOnline: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const state = authLogic.getState();
      expect(state.isLoggedIn).toBe(true);
    });

    it('should return correct currentUser selector', () => {
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

      const state = authLogic.getState();
      expect(state.currentUser).toEqual(mockUser);
    });

    it('should return correct hasValidTokens selector', () => {
      authLogic.actions.setTokens('access-token', 'refresh-token');

      const state = authLogic.getState();
      expect(state.hasValidTokens).toBe(true);
    });
  });
});
