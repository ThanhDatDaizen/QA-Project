// ===================================================
// TuIdentityContext - Authentication & Authorization
// Đoạn này tôi viết để quản lý User identity và role
// ===================================================

import React, { createContext, useContext, useState, useCallback } from 'react';
import { loginAPI, registerAPI, clearAuthData } from '../api/tu-auth-api';

// ============================================
// Type definitions
// ============================================

export type UserRole = 'SuperAdmin' | 'Admin' | 'QAManager' | 'QACoordinator' | 'Contributor' | 'Viewer';

export interface TuUser {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  power: number; // Power level: SuperAdmin=20, Admin=18, QAManager=15, QACoordinator=10, Contributor=5, Viewer=1
  permissions: string[];
  createdAt?: string;
  lastLogin?: string;
}

export interface TuAuthState {
  isAuthenticated: boolean;
  user: TuUser | null;
  loading: boolean;
  error: string | null;
}

interface TuIdentityContextType extends TuAuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  forceLogout: () => void;
  register: (email: string, password: string, name: string) => Promise<void>;
  setUser: (user: TuUser | null) => void;
  hasRole: (role: UserRole) => boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
}

// ============================================
// Helper: Map role to power level
// Backend doesn't send power, so we calculate it from role
// ============================================
const getRolePower = (role: string): number => {
  switch (role) {
    case 'SuperAdmin':
      return 20;
    case 'Admin':
      return 18;
    case 'QAManager':
      return 15;
    case 'QACoordinator':
      return 10;
    case 'Contributor':
      return 5;
    case 'Viewer':
      return 1;
    default:
      return 0; // Unknown role
  }
};

// ============================================
// Create Context
// ============================================

const TuIdentityContext = createContext<TuIdentityContextType | undefined>(undefined);

// ============================================
// Provider Component
// ============================================

interface TuIdentityProviderProps {
  children: React.ReactNode;
}

export const TuIdentityProvider: React.FC<TuIdentityProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<TuAuthState>({
    isAuthenticated: false,
    user: null,
    loading: false,
    error: null,
  });

  // ============================================
  // Helper: Check Role
  // Đoạn này check role, Staff mà đòi vào Admin là tôi 'sút' ra ngay!
  // ============================================
  const hasRole = useCallback((role: UserRole): boolean => {
    if (!authState.user) {
      console.warn('%c[TU-AUTH] ⚠️ User is not authenticated', 'color: #ffff00;');
      return false;
    }

    const hasAccess = authState.user.role === role;

    if (!hasAccess) {
      console.error(
        `%c[TU-AUTH-REJECT] 🚫 User role "${authState.user.role}" cannot access "${role}" resource!`,
        'color: #ff0000; font-weight: bold;'
      );
    }

    return hasAccess;
  }, [authState.user]);

  // ============================================
  // Helper: Check Permission
  // ============================================
  const hasPermission = useCallback((permission: string): boolean => {
    if (!authState.user) {
      return false;
    }

    const hasPerms = authState.user.permissions.includes(permission);

    if (!hasPerms) {
      console.warn(
        `%c[TU-PERMISSION] ⚠️ User lacks permission: ${permission}`,
        'color: #ffff00;'
      );
    }

    return hasPerms;
  }, [authState.user]);

  // ============================================
  // Helper: Check Any Role
  // ============================================
  const hasAnyRole = useCallback((roles: UserRole[]): boolean => {
    if (!authState.user) {
      return false;
    }
    return roles.includes(authState.user.role);
  }, [authState.user]);

  // ============================================
  // Login Handler - REAL BACKEND API
  // ============================================
  const login = useCallback(async (email: string, password: string) => {
    setAuthState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      console.log(
        '%c[TU-LOGIN] 🔐 Calling Backend Auth API...',
        'color: #0ea5e9; font-weight: bold;'
      );

      // ✅ Call real Backend API (NOT MOCK!)
      const { user: authUser } = await loginAPI({ email, password });

      // ✅ Use power already calculated by loginAPI (no need to recalculate!)
      // Transform to TuUser format
      const user: TuUser = {
        id: authUser.id,
        email: authUser.email,
        username: authUser.username,
        role: authUser.role as UserRole,
        power: authUser.power,  // ✅ Use power from loginAPI directly!
        permissions: authUser.permissions,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      };

      // ✅ Save token + user info to localStorage (token already saved by loginAPI)
      localStorage.setItem('tu_user_info', JSON.stringify(user));
      localStorage.setItem('tu_user_power', user.power.toString());

      setAuthState({
        isAuthenticated: true,
        user,
        loading: false,
        error: null,
      });

      console.log(
        '%c[TU-LOGIN] ✅ Login successful!',
        'color: #10b981; font-weight: bold;'
      );
      console.log('👤 User:', user);
      console.log(`⚡ Power Level: ${user.power}`);
      console.log(`🎭 Role: ${user.role}`);
      console.log('🔑 Token saved to localStorage');
    } catch (error: any) {
      const errorMsg = error.message || 'Login failed';

      console.error(
        '%c[TU-LOGIN-ERROR] ❌ Login failed!',
        'color: #ef4444; font-weight: bold;'
      );
      console.error(errorMsg);

      setAuthState({
        isAuthenticated: false,
        user: null,
        loading: false,
        error: errorMsg,
      });

      throw error;
    }
  }, []);

  // ============================================
  // Logout Handler
  // ============================================
  const logout = useCallback(() => {
    console.log(
      '%c[TU-LOGOUT] 👋 Logging out...',
      'color: #f59e0b; font-weight: bold;'
    );

    clearAuthData();

    setAuthState({
      isAuthenticated: false,
      user: null,
      loading: false,
      error: null,
    });

    console.log('%c[TU-LOGOUT] ✅ Logout successful', 'color: #10b981;');
  }, []);

  // ============================================
  // Force Logout - EMERGENCY CLEAR
  // Xóa sạch tất cả localStorage + session
  // ============================================
  const forceLogout = useCallback(() => {
    console.log(
      '%c[TU-FORCE-LOGOUT] 🔴 FORCE CLEARING ALL AUTH DATA!',
      'color: #dc2626; font-weight: bold; font-size: 14px;'
    );

    // Clear everything from localStorage
    localStorage.removeItem('tu_jwt_token');
    localStorage.removeItem('tu_user_info');
    localStorage.removeItem('tu_user_power');
    localStorage.clear();

    // Reset auth state
    setAuthState({
      isAuthenticated: false,
      user: null,
      loading: false,
      error: null,
    });

    console.log('%c[TU-FORCE-LOGOUT] ✅ All auth data cleared!', 'color: #dc2626; font-weight: bold;');
  }, []);

  // ============================================
  // Register Handler - REAL BACKEND API
  // ============================================
  const register = useCallback(async (email: string, password: string, username: string) => {
    setAuthState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      console.log(
        '%c[TU-REGISTER] 📝 Calling Backend Register API...',
        'color: #0ea5e9; font-weight: bold;'
      );

      // ✅ Call real Backend API (NOT MOCK!)
      const { user: authUser } = await registerAPI({ email, password, username });

      const user: TuUser = {
        id: authUser.id,
        email: authUser.email,
        username: authUser.username,
        role: authUser.role as UserRole,
        power: authUser.power,
        permissions: authUser.permissions,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      };

      // ✅ Save token + user info (token already saved by registerAPI)
      localStorage.setItem('tu_user_info', JSON.stringify(user));
      localStorage.setItem('tu_user_power', user.power.toString());

      setAuthState({
        isAuthenticated: true,
        user,
        loading: false,
        error: null,
      });

      console.log(
        '%c[TU-REGISTER] ✅ Registration successful!',
        'color: #10b981; font-weight: bold;'
      );
      console.log('👤 New User:', user);
      console.log(`⚡ Assigned Power Level: ${user.power} (${user.role})`);
      console.log('🔑 Token saved to localStorage');
    } catch (error: any) {
      const errorMsg = error.message || 'Registration failed';

      console.error(
        '%c[TU-REGISTER-ERROR] ❌ Registration failed!',
        'color: #ef4444; font-weight: bold;'
      );
      console.error(errorMsg);

      setAuthState({
        isAuthenticated: false,
        user: null,
        loading: false,
        error: errorMsg,
      });

      throw error;
    }
  }, []);

  // ============================================
  // Set User (for loading from localStorage)
  // ============================================
  const setUser = useCallback((user: TuUser | null) => {
    setAuthState((prev) => ({
      ...prev,
      user,
      isAuthenticated: user !== null,
    }));
  }, []);

  // Load user from localStorage on mount
  React.useEffect(() => {
    const savedUser = localStorage.getItem('tu_user_info');
    const savedToken = localStorage.getItem('tu_jwt_token');
    
    if (savedUser && savedToken) {
      try {
        const user = JSON.parse(savedUser);
        
        // Ensure power level is set (backward compatibility)
        if (!user.power || user.power === 0) {
          user.power = getRolePower(user.role);
          localStorage.setItem('tu_user_info', JSON.stringify(user));
        }
        
        setAuthState({
          isAuthenticated: true,
          user,
          loading: false,
          error: null,
        });
        console.log(
          '%c[TU-AUTH] ✅ User & Token restored from localStorage',
          'color: #10b981;'
        );
        console.log('👤 Restored User:', user);
        console.log(`⚡ Power Level: ${user.power}`);
      } catch (error) {
        console.error(
          '%c[TU-AUTH] ❌ Failed to restore user from localStorage',
          'color: #ef4444;',
          error
        );
        localStorage.removeItem('tu_user_info');
        localStorage.removeItem('tu_jwt_token');
      }
    } else {
      console.log('%c[TU-AUTH] ℹ️ No saved session found', 'color: #06b6d4;');
    }
  }, []);

  const value: TuIdentityContextType = {
    ...authState,
    login,
    logout,
    forceLogout,
    register,
    setUser,
    hasRole,
    hasPermission,
    hasAnyRole,
  };

  return (
    <TuIdentityContext.Provider value={value}>
      {children}
    </TuIdentityContext.Provider>
  );
};

// ============================================
// Custom Hook - useTuIdentity
// ============================================

export const useTuIdentity = (): TuIdentityContextType => {
  const context = useContext(TuIdentityContext);

  if (context === undefined) {
    throw new Error(
      'useTuIdentity must be used within TuIdentityProvider'
    );
  }

  return context;
};

export default TuIdentityContext;
