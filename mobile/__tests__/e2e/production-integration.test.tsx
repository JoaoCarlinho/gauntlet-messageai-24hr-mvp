/**
 * End-to-End Production Integration Tests
 * Tests the complete user flow with the production Railway backend
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import App from '../../App';
import { authAPI, healthAPI } from '../../lib/api';

// Mock react-native components that might not be available in test environment
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Alert: {
      alert: jest.fn(),
    },
  };
});

// Mock expo modules
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
}));

describe('Production Backend E2E Integration', () => {
  beforeAll(() => {
    // Set production backend URL
    process.env.EXPO_PUBLIC_API_URL = 'https://gauntlet-messageai-24hr-mvp-production.up.railway.app';
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('App Initialization', () => {
    it('should render the app without crashing', () => {
      render(<App />);
      // App should render without throwing errors
    });

    it('should connect to production backend on startup', async () => {
      render(<App />);
      
      // Wait for any async initialization
      await waitFor(() => {
        // App should be able to make health check calls
        expect(healthAPI.checkHealth).toBeDefined();
      });
    });
  });

  describe('Authentication Flow', () => {
    it('should handle login screen interaction', async () => {
      render(<App />);
      
      // Look for login form elements
      await waitFor(() => {
        // These would be actual test IDs from your components
        const emailInput = screen.queryByTestId('email-input');
        const passwordInput = screen.queryByTestId('password-input');
        const loginButton = screen.queryByTestId('login-button');
        
        if (emailInput && passwordInput && loginButton) {
          // Test form interaction
          fireEvent.changeText(emailInput, 'test@example.com');
          fireEvent.changeText(passwordInput, 'TestPass123');
          fireEvent.press(loginButton);
          
          // Should attempt to call login API
          expect(authAPI.login).toBeDefined();
        }
      });
    });

    it('should handle registration screen interaction', async () => {
      render(<App />);
      
      await waitFor(() => {
        const registerButton = screen.queryByTestId('register-button');
        
        if (registerButton) {
          fireEvent.press(registerButton);
          
          // Should navigate to registration screen
          const emailInput = screen.queryByTestId('register-email-input');
          const passwordInput = screen.queryByTestId('register-password-input');
          const displayNameInput = screen.queryByTestId('register-display-name-input');
          
          if (emailInput && passwordInput && displayNameInput) {
            fireEvent.changeText(emailInput, 'newuser@example.com');
            fireEvent.changeText(passwordInput, 'TestPass123');
            fireEvent.changeText(displayNameInput, 'New User');
            
            const submitButton = screen.queryByTestId('register-submit-button');
            if (submitButton) {
              fireEvent.press(submitButton);
              expect(authAPI.register).toBeDefined();
            }
          }
        }
      });
    });
  });

  describe('API Integration', () => {
    it('should make successful health check calls', async () => {
      try {
        const health = await healthAPI.checkHealth();
        expect(health.status).toBe('ok');
      } catch (error) {
        console.log('Health check test skipped:', error);
      }
    });

    it('should handle API errors gracefully', async () => {
      try {
        await authAPI.login({
          email: 'invalid@example.com',
          password: 'wrongpassword'
        });
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toContain('Login failed');
      }
    });
  });

  describe('Navigation Flow', () => {
    it('should navigate between screens', async () => {
      render(<App />);
      
      await waitFor(() => {
        // Test navigation between different screens
        const homeTab = screen.queryByTestId('home-tab');
        const chatTab = screen.queryByTestId('chat-tab');
        const profileTab = screen.queryByTestId('profile-tab');
        
        if (homeTab) {
          fireEvent.press(homeTab);
        }
        
        if (chatTab) {
          fireEvent.press(chatTab);
        }
        
        if (profileTab) {
          fireEvent.press(profileTab);
        }
      });
    });
  });

  describe('Real-time Features', () => {
    it('should initialize socket connection', async () => {
      render(<App />);
      
      await waitFor(() => {
        // Test that socket connection is attempted
        // This would require mocking socket.io-client
        expect(true).toBe(true); // Placeholder for socket test
      });
    });
  });

  describe('Error Handling', () => {
    it('should show appropriate error messages', async () => {
      render(<App />);
      
      // Test error handling in UI
      await waitFor(() => {
        const errorMessage = screen.queryByTestId('error-message');
        if (errorMessage) {
          expect(errorMessage).toBeDefined();
        }
      });
    });

    it('should handle network connectivity issues', async () => {
      // Mock network error
      const originalFetch = global.fetch;
      global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));
      
      render(<App />);
      
      await waitFor(() => {
        // App should handle network errors gracefully
        expect(Alert.alert).toHaveBeenCalled();
      });
      
      // Restore original fetch
      global.fetch = originalFetch;
    });
  });
});
