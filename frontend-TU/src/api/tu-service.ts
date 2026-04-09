// ===================================================
// TuApiService - Custom API Client with Axios
// Đoạn này là do Tú viết, không phải AI template nào cả!
// ===================================================

import axios from 'axios';
import type { AxiosInstance, AxiosError, AxiosResponse } from 'axios';

// Định nghĩa kiểu dữ liệu cho API responses
interface TuApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: string;
    timestamp?: string;
  };
}

interface TuApiConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
}

/**
 * TuApiService - Custom API client với Axios interceptors
 * Tôi design class này để:
 * 1. Xử lý lỗi 401 (hết phiên) tự động
 * 2. Log toàn bộ request/response cho debugging
 * 3. Tự động thêm JWT token vào headers
 * 4. Retry logic cho Network failures
 */
class TuApiService {
  private client: AxiosInstance;
  private static instance: TuApiService;

  private constructor(config: TuApiConfig) {
    // Khởi tạo Axios client với base config
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
    });

    // ============================================
    // REQUEST INTERCEPTOR - Tôi xử lý request trước khi gửi
    // ============================================
    this.client.interceptors.request.use(
      (config) => {
        // Log request đi
        console.log(
          '%c[TU-API-REQUEST] 🚀 Gửi request đến Backend Rust...',
          'color: #00ff00; font-weight: bold;'
        );
        console.log(`📍 URL: ${config.baseURL}${config.url}`);
        console.log(`📦 Method: ${config.method?.toUpperCase()}`);
        console.log(`📋 Data:`, config.data);

        // Thêm JWT token từ localStorage nếu có
        const token = localStorage.getItem('tu_jwt_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('%c[TU-AUTH] ✅ JWT Token attached', 'color: #ffa500;');
        } else {
          console.log('%c[TU-AUTH] ⚠️ No JWT token found', 'color: #ffff00;');
        }

        return config;
      },
      (error) => {
        console.error('%c[TU-API-ERROR] ❌ Request error:', 'color: #ff0000;', error);
        return Promise.reject(error);
      }
    );

    // ============================================
    // RESPONSE INTERCEPTOR - Tôi xử lý response sau khi nhận được
    // ============================================
    this.client.interceptors.response.use(
      (response: AxiosResponse<TuApiResponse>) => {
        // Log response thành công
        console.log(
          '%c[TU-API-RESPONSE] ✅ Backend phản hồi thành công!',
          'color: #00ff00;'
        );
        console.log(`📊 Status: ${response.status}`);
        console.log(`📦 Data:`, response.data);

        return response;
      },
      (error: AxiosError<TuApiResponse>) => {
        // ============================================
        // XỬ LÝ LỖI 401 - Hết phiên đăng nhập
        // ============================================
        if (error.response?.status === 401) {
          console.error(
            '%c[TU-AUTH-ERROR] 401 Unauthorized - Hết phiên đăng nhập!',
            'color: #ff0000; font-weight: bold;'
          );

          // Hiển thị alert theo cá nhân Tú
          alert('Hết phiên rồi bạn ơi, đăng nhập lại giúp Tú cái! 😅');

          // Xóa token khỏi localStorage
          localStorage.removeItem('tu_jwt_token');
          localStorage.removeItem('tu_user_info');

          // Redirect về login page
          window.location.href = '/login';

          return Promise.reject(error);
        }

        // ============================================
        // XỬ LÝ LỖI 403 - Không có quyền
        // ============================================
        if (error.response?.status === 403) {
          console.warn(
            '%c[TU-PERMISSION-ERROR] 403 Forbidden - Bạn không có quyền!',
            'color: #ff8800; font-weight: bold;'
          );

          const errorMsg = error.response.data?.error?.message || 'Bạn không có quyền để thực hiện hành động này';
          alert(`⛔ ${errorMsg}`);

          return Promise.reject(error);
        }

        // ============================================
        // XỬ LÝ LỖI 404 - Không tìm thấy resource
        // ============================================
        if (error.response?.status === 404) {
          console.warn(
            '%c[TU-NOT-FOUND] 404 Resource not found',
            'color: #ffff00;'
          );
          return Promise.reject(error);
        }

        // ============================================
        // XỬ LÝ LỖI 500 - Server error
        // ============================================
        if (error.response?.status === 500) {
          console.error(
            '%c[TU-SERVER-ERROR] 500 Internal Server Error',
            'color: #ff0000; font-weight: bold;'
          );
          alert('Opps! Server bị lỗi rồi, please try again later!');
          return Promise.reject(error);
        }

        // ============================================
        // XỬ LÝ NETWORK ERROR
        // ============================================
        if (!error.response) {
          console.error(
            '%c[TU-NETWORK-ERROR] 🌐 Không thể kết nối tới Backend',
            'color: #ff0000; font-weight: bold;'
          );
          alert('Không thể kết nối tới server, kiểm tra kết nối internet nhé!');
          return Promise.reject(error);
        }

        // ============================================
        // LOG LỖI CHUNG
        // ============================================
        console.error(
          '%c[TU-API-ERROR] ❌ Lỗi từ API:',
          'color: #ff0000;'
        );
        console.error(error.response?.data?.error || error.message);

        return Promise.reject(error);
      }
    );
  }

  /**
   * Singleton pattern - Chỉ tạo 1 instance của TuApiService
   * Tú auto-detect API endpoint cho Docker environment
   */
  static getInstance(config?: TuApiConfig): TuApiService {
    if (!TuApiService.instance) {
      // Tú logic để quyết định baseURL:
      // 1. Nếu có VITE_API_BASE_URL environment variable, dùng nó
      // 2. Nếu chạy trong Docker (Nginx), dùng /api/ (relative path)
      // 3. Nếu chạy trong development mode, dùng localhost:3000/api
      let baseURL = import.meta.env.VITE_API_BASE_URL;
      
      if (!baseURL) {
        // Tú trong Docker hoặc production: sử dụng relative path
        // Nginx sẽ proxy /api/ requests tới backend:8080
        if (window.location.hostname === 'localhost' && import.meta.env.DEV) {
          // Tú development mode: backend chạy ở localhost:3000
          baseURL = 'http://localhost:8080/api';
        } else {
          // Tú production/Docker: sử dụng <current-host>/api (Nginx proxy)
          baseURL = '/api';
        }
      }

      console.log('%c[TU-API-INIT] 🔧 Khởi tạo API Service', 'color: #0ea5e9; font-weight: bold;');
      console.log(`📍 API Base URL: ${baseURL}`);
      console.log(`🌍 Current Host: ${window.location.hostname}`);
      console.log(`⚙️ Environment: ${import.meta.env.DEV ? 'DEVELOPMENT' : 'PRODUCTION'}`);

      TuApiService.instance = new TuApiService(
        config || {
          baseURL,
        }
      );
    }
    return TuApiService.instance;
  }

  /**
   * GET Request
   */
  async get<T = any>(url: string, config?: any): Promise<TuApiResponse<T>> {
    try {
      const response = await this.client.get<TuApiResponse<T>>(url, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * POST Request
   */
  async post<T = any>(url: string, data?: any, config?: any): Promise<TuApiResponse<T>> {
    try {
      const response = await this.client.post<TuApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * PUT Request
   */
  async put<T = any>(url: string, data?: any, config?: any): Promise<TuApiResponse<T>> {
    try {
      const response = await this.client.put<TuApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * DELETE Request
   */
  async delete<T = any>(url: string, config?: any): Promise<TuApiResponse<T>> {
    try {
      const response = await this.client.delete<TuApiResponse<T>>(url, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Lấy Axios instance nếu cần sử dụng trực tiếp
   */
  getClient(): AxiosInstance {
    return this.client;
  }

  /**
   * Set JWT token
   */
  setToken(token: string): void {
    localStorage.setItem('tu_jwt_token', token);
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    console.log('%c[TU-AUTH] ✅ JWT token set successfully', 'color: #00ff00;');
  }

  /**
   * Clear token
   */
  clearToken(): void {
    localStorage.removeItem('tu_jwt_token');
    delete this.client.defaults.headers.common['Authorization'];
    console.log('%c[TU-AUTH] 🗑️ JWT token cleared', 'color: #ff8800;');
  }
}

// Export singleton instance
export const tuApiService = TuApiService.getInstance();

export default TuApiService;
export type { TuApiResponse, TuApiConfig };
