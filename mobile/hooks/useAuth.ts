import { useValues, useActions } from 'kea';
import { authLogic } from '../store/auth';
import { LoginRequest, RegisterRequest, User } from '../types';

// Auth hook interface
interface UseAuthReturn {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isLoggedIn: boolean;
  currentUser: User | null;
  hasValidTokens: boolean;
  
  // Actions
  login: (credentials: LoginRequest) => void;
  register: (userData: RegisterRequest) => void;
  logout: () => void;
  refreshToken: () => void;
  initializeAuth: () => void;
  clearError: () => void;
}

/**
 * Custom hook for authentication operations
 * Provides access to auth state and actions through Kea logic
 */
export const useAuth = (): UseAuthReturn => {
  // Get values from Kea store
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    isLoggedIn,
    currentUser,
    hasValidTokens,
  } = useValues(authLogic);
  
  // Get actions from Kea store
  const {
    login: loginAction,
    register: registerAction,
    logout: logoutAction,
    refreshToken: refreshTokenAction,
    initializeAuth: initializeAuthAction,
    setError,
  } = useActions(authLogic);
  
  // Wrapper functions with additional functionality
  const login = (credentials: LoginRequest) => {
    // Clear any existing errors before attempting login
    setError(null);
    loginAction(credentials);
  };
  
  const register = (userData: RegisterRequest) => {
    // Clear any existing errors before attempting registration
    setError(null);
    registerAction(userData);
  };
  
  const logout = () => {
    // Clear any existing errors before logout
    setError(null);
    logoutAction();
  };
  
  const refreshToken = () => {
    refreshTokenAction();
  };
  
  const initializeAuth = () => {
    initializeAuthAction();
  };
  
  const clearError = () => {
    setError(null);
  };
  
  return {
    // State
    user,
    isAuthenticated,
    isLoading,
    error,
    isLoggedIn,
    currentUser,
    hasValidTokens,
    
    // Actions
    login,
    register,
    logout,
    refreshToken,
    initializeAuth,
    clearError,
  };
};

// Export default for convenience
export default useAuth;
