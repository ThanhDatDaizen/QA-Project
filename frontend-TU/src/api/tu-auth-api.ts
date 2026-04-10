/**
 * ========================================
 * TU AUTHENTICATION API - Backend Integration
 * ========================================
 * Tất cả auth calls đều qua file này
 * Mock login bị xóa - chỉ dùng real Backend API
 */

import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080/api';

// ========================================
// Types
// ========================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    username: string;
    role: 'SuperAdmin' | 'Admin' | 'QAManager' | 'QACoordinator' | 'Contributor' | 'Viewer';
    is_active: boolean;
  };
  permissions: string[];
}

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: string;
  power: number;
  permissions: string[];
}

// ========================================
// Role → Power Level Mapping
// ========================================

const ROLE_POWER_MAP: Record<string, number> = {
  SuperAdmin: 20,
  Admin: 18,
  QAManager: 15,
  QACoordinator: 10,
  Contributor: 5,
  Viewer: 1,
};

/**
 * 🔄 Convert Backend Role to Power Level
 */
export function getRolePower(role: string): number {
  return ROLE_POWER_MAP[role] || 0;
}

// ========================================
// Authentication API Calls
// ========================================

/**
 * 🔐 Login - Gọi Backend để xác thực
 */
export async function loginAPI(credentials: LoginRequest): Promise<{ user: AuthUser; token: string }> {
  try {
    console.log('[TU-AUTH-API] 🔐 Calling backend login API...', credentials.email);

    const response = await axios.post<AuthResponse>(`${API_BASE}/auth/login`, credentials, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('[TU-AUTH-API] ✅ Login successful!', response.data);

    // Transform backend response to include power level
    const roleName = response.data.user.role;
    const rolePower = getRolePower(roleName);
    
    console.log(`[TU-AUTH-API] 🔄 Converting role "${roleName}" to power level...`);
    console.log(`[TU-AUTH-API] 📊 ROLE_POWER_MAP:`, ROLE_POWER_MAP);
    console.log(`[TU-AUTH-API] ⚡ getRolePower("${roleName}") = ${rolePower}`);
    
    const authUser: AuthUser = {
      id: response.data.user.id,
      email: response.data.user.email,
      username: response.data.user.username,
      role: roleName,
      power: rolePower,
      permissions: response.data.permissions,
    };
    
    console.log(`[TU-AUTH-API] ✅ AuthUser created:`, authUser);

    // ✅ Store token immediately
    localStorage.setItem('tu_jwt_token', response.data.token);

    return { user: authUser, token: response.data.token };
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: { message?: string; error?: { message?: string } } } };
    const errorMsg =
      axiosError.response?.data?.message ||
      axiosError.response?.data?.error?.message ||
      'Login failed';

    console.error('[TU-AUTH-API] ❌ Login error:', errorMsg);
    throw new Error(errorMsg);
  }
}

/**
 * 📝 Register - Gọi Backend để đăng ký mới
 */
export async function registerAPI(data: RegisterRequest): Promise<{ user: AuthUser; token: string }> {
  try {
    console.log('[TU-AUTH-API] 📝 Calling backend register API...', data.email);

    const response = await axios.post<AuthResponse>(`${API_BASE}/auth/register`, data, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('[TU-AUTH-API] ✅ Registration successful!', response.data);

    const authUser: AuthUser = {
      id: response.data.user.id,
      email: response.data.user.email,
      username: response.data.user.username,
      role: response.data.user.role,
      power: getRolePower(response.data.user.role),
      permissions: response.data.permissions,
    };

    // ✅ Store token immediately
    localStorage.setItem('tu_jwt_token', response.data.token);

    return { user: authUser, token: response.data.token };
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: { message?: string; error?: { message?: string } } } };
    const errorMsg =
      axiosError.response?.data?.message ||
      axiosError.response?.data?.error?.message ||
      'Registration failed';

    console.error('[TU-AUTH-API] ❌ Register error:', errorMsg);
    throw new Error(errorMsg);
  }
}

/**
 * 🔑 Refresh Token - Làm mới JWT token
 */
export async function refreshTokenAPI(token: string): Promise<string> {
  try {
    console.log('[TU-AUTH-API] 🔄 Refreshing token...');

    const response = await axios.post(
      `${API_BASE}/auth/refresh`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log('[TU-AUTH-API] ✅ Token refreshed!');
    return response.data.token;
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: { message?: string } } };
    const errorMsg = axiosError.response?.data?.message || 'Token refresh failed';
    console.error('[TU-AUTH-API] ❌ Refresh error:', errorMsg);
    throw new Error(errorMsg);
  }
}

/**
 * 👤 Get Profile - Lấy thông tin user hiện tại
 */
export async function getProfileAPI(token: string): Promise<AuthUser> {
  try {
    console.log('[TU-AUTH-API] 👤 Fetching user profile...');

    const response = await axios.get<{
      user: {
        id: string;
        email: string;
        username: string;
        role: string;
        is_active: boolean;
      };
      permissions: string[];
    }>(`${API_BASE}/auth/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log('[TU-AUTH-API] ✅ Profile fetched!');

    const authUser: AuthUser = {
      id: response.data.user.id,
      email: response.data.user.email,
      username: response.data.user.username,
      role: response.data.user.role,
      power: getRolePower(response.data.user.role),
      permissions: response.data.permissions,
    };

    return authUser;
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: { message?: string } } };
    const errorMsg = axiosError.response?.data?.message || 'Failed to fetch profile';
    console.error('[TU-AUTH-API] ❌ Profile error:', errorMsg);
    throw new Error(errorMsg);
  }
}

/**
 * 🔄 Validate Token - Kiểm tra token còn hợp lệ không
 */
export function isTokenValid(token: string | null): boolean {
  if (!token) return false;

  try {
    // Decode JWT (không verify signature vì chỉ check iat)
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    const payload = JSON.parse(atob(parts[1]));
    const expTime = payload.exp * 1000; // Convert to milliseconds
    const now = Date.now();

    const isValid = expTime > now;
    console.log(
      `[TU-AUTH-API] 🔍 Token validation: ${isValid ? '✅ Valid' : '❌ Expired'}`
    );

    return isValid;
  } catch (error) {
    console.error('[TU-AUTH-API] ❌ Token validation error:', error);
    return false;
  }
}

/**
 * 🛑 Logout Helper - Clear auth data
 */
export function clearAuthData(): void {
  console.log('[TU-AUTH-API] 🛑 Clearing auth data from localStorage...');
  localStorage.removeItem('tu_jwt_token');
  localStorage.removeItem('tu_user_info');
  localStorage.removeItem('tu_user_power');
  console.log('[TU-AUTH-API] ✅ Auth data cleared');
}
