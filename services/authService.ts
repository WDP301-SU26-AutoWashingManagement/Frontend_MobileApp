import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/app.config';

// API Configuration
const API_BASE_URL = API_CONFIG.API_BASE_URL;
const API_TIMEOUT = API_CONFIG.API_TIMEOUT;

// Types
export interface LoginRequest {
  email: string;
  password: string;
  type?: 'customer' | 'admin' | 'staff' | 'manager';
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  role?: 'customer' | 'admin' | 'staff' | 'manager';
}

export interface GoogleLoginRequest {
  idToken: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: {
      _id: string;
      email: string;
      full_name: string;
      phone?: string;
      avatar_url?: string;
      role: string;
      is_email_verified: boolean;
      last_login_at: string;
      created_at: string;
      updated_at: string;
    };
    tokens: {
      accessToken: string;
      refreshToken: string;
    };
  };
  statusCode: number;
}

export interface User {
  _id: string;
  email: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  role: string;
  is_email_verified: boolean;
  last_login_at: string;
  created_at: string;
  updated_at: string;
  role_data?: {
    _id: string;
    customer_code?: string;
    referral_code?: string;
    membership_points?: number;
    reward_points?: number;
    tier_id?: string;
    staff_type?: string;
    branch_id?: string;
  } | null;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

// Token Manager
class TokenManager {
  private static readonly ACCESS_TOKEN_KEY = '@auth_access_token';
  private static readonly REFRESH_TOKEN_KEY = '@auth_refresh_token';
  private static readonly USER_KEY = '@auth_user';

  static async saveTokens(tokens: Tokens): Promise<void> {
    try {
      await AsyncStorage.multiSet([
        [this.ACCESS_TOKEN_KEY, tokens.accessToken],
        [this.REFRESH_TOKEN_KEY, tokens.refreshToken],
      ]);
    } catch (error) {
      console.error('Error saving tokens:', error);
      throw error;
    }
  }

  static async getAccessToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.ACCESS_TOKEN_KEY);
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  static async getRefreshToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  }

  static async saveUser(user: User): Promise<void> {
    try {
      await AsyncStorage.setItem(this.USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Error saving user:', error);
      throw error;
    }
  }

  static async getUser(): Promise<User | null> {
    try {
      const userStr = await AsyncStorage.getItem(this.USER_KEY);
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  static async clearAll(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        this.ACCESS_TOKEN_KEY,
        this.REFRESH_TOKEN_KEY,
        this.USER_KEY,
      ]);
    } catch (error) {
      console.error('Error clearing tokens:', error);
      throw error;
    }
  }
}

// Axios Instance
class AuthService {
  private axiosInstance: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (err: any) => void;
  }> = [];

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        const token = await TokenManager.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then((token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return this.axiosInstance(originalRequest);
              })
              .catch(() => Promise.reject(error));
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshToken = await TokenManager.getRefreshToken();
            if (!refreshToken) {
              this.isRefreshing = false;
              return Promise.reject(error);
            }

            const response = await this.axiosInstance.post<AuthResponse>('/auth/refresh', {
              refreshToken,
            });

            const { accessToken, refreshToken: newRefreshToken } = response.data.data.tokens;
            await TokenManager.saveTokens({
              accessToken,
              refreshToken: newRefreshToken,
            });

            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            this.processQueue(null, accessToken);
            return this.axiosInstance(originalRequest);
          } catch (err) {
            this.processQueue(err, null);
            await TokenManager.clearAll();
            return Promise.reject(err);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private processQueue(error: any, token: string | null) {
    this.failedQueue.forEach((prom) => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token!);
      }
    });
    this.failedQueue = [];
  }

  /**
   * Login with email and password
   */
  async login(request: LoginRequest): Promise<{ user: User; tokens: Tokens }> {
    try {
      const response = await this.axiosInstance.post<AuthResponse>('/auth/login', {
        email: request.email,
        password: request.password,
        type: request.type || 'customer',
      });

      const { user, tokens } = response.data.data;
      await TokenManager.saveTokens(tokens);
      await TokenManager.saveUser(user);

      return { user, tokens };
    } catch (error: any) {
      console.error('[authService.login] Error:', error.message, error.response?.data);
      const message = error.response?.data?.message || error.message || 'Đăng nhập thất bại';
      throw new Error(message);
    }
  }

  /**
   * Register new account
   */
  async register(request: RegisterRequest): Promise<{ user: User; tokens: Tokens }> {
    try {
      const response = await this.axiosInstance.post<AuthResponse>('/auth/register', {
        email: request.email,
        password: request.password,
        full_name: request.full_name,
        phone: request.phone,
        role: request.role || 'customer',
      });

      const { user, tokens } = response.data.data;
      await TokenManager.saveTokens(tokens);
      await TokenManager.saveUser(user);

      return { user, tokens };
    } catch (error: any) {
      const message = error.response?.data?.message || 'Đăng ký thất bại';
      throw new Error(message);
    }
  }

  /**
   * Login with Google ID Token
   */
  async loginWithGoogle(request: GoogleLoginRequest): Promise<{ user: User; tokens: Tokens }> {
    try {
      const response = await this.axiosInstance.post<AuthResponse>('/auth/google', {
        idToken: request.idToken,
      });

      const { user, tokens } = response.data.data;
      await TokenManager.saveTokens(tokens);
      await TokenManager.saveUser(user);

      return { user, tokens };
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Đăng nhập Google thất bại';
      console.log('🔐 [AuthService] loginWithGoogle error response:', error.response?.status, error.response?.data);
      throw new Error(message);
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(): Promise<Tokens> {
    try {
      const refreshToken = await TokenManager.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await this.axiosInstance.post<AuthResponse>('/auth/refresh', {
        refreshToken,
      });

      const { accessToken, refreshToken: newRefreshToken } = response.data.data.tokens;
      const tokens = { accessToken, refreshToken: newRefreshToken };
      await TokenManager.saveTokens(tokens);

      return tokens;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Token refresh thất bại';
      throw new Error(message);
    }
  }

  /**
   * Get current user from storage
   */
  async getCurrentUser(): Promise<User | null> {
    return TokenManager.getUser();
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await TokenManager.getAccessToken();
    return !!token;
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      await TokenManager.clearAll();
    } catch (error) {
      console.error('Error during logout:', error);
      throw error;
    }
  }

  /**
   * Forgot password request
   */
  async forgotPassword(email: string): Promise<void> {
    try {
      await this.axiosInstance.post('/auth/forgot-password', { email });
    } catch (error: any) {
      const message = error.response?.data?.message || 'Yêu cầu cấp lại mật khẩu thất bại';
      throw new Error(message);
    }
  }

  /**
   * Verify OTP
   */
  async verifyOtp(email: string, otp: string): Promise<void> {
    try {
      await this.axiosInstance.post('/auth/verify-otp', { email, otp });
    } catch (error: any) {
      const message = error.response?.data?.message || 'Xác minh OTP thất bại';
      throw new Error(message);
    }
  }

  /**
   * Reset password with OTP
   */
  async resetPassword(email: string, otp: string, newPassword: string): Promise<void> {
    try {
      await this.axiosInstance.post('/auth/reset-password', {
        email,
        otp,
        new_password: newPassword,
      });
    } catch (error: any) {
      const message = error.response?.data?.message || 'Đặt lại mật khẩu thất bại';
      throw new Error(message);
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(
    updates: { full_name?: string; phone?: string; avatar_url?: string } | FormData
  ): Promise<User> {
    try {
      console.log('[AuthService] updateProfile payload:', updates instanceof FormData ? 'FormData' : updates);

      let response;
      if (updates instanceof FormData) {
        // For multipart uploads (avatar file + fields)
        response = await this.axiosInstance.put<{ data: User }>(
          '/profile',
          updates,
          {
            headers: {
              // Let axios/native set the correct multipart boundary
              'Content-Type': 'multipart/form-data',
            },
          }
        );
      } else {
        response = await this.axiosInstance.put<{ data: User }>('/profile', updates);
      }

      const updatedUser = response.data.data;

      // Update user in storage
      await TokenManager.saveUser(updatedUser);

      return updatedUser;
    } catch (error: any) {
      console.error('[AuthService] updateProfile error response:', error.response?.status, error.response?.data);
      const status = error.response?.status;
      const serverMessage = error.response?.data?.message;
      const message = serverMessage || (status ? `Server responded with status ${status}` : 'Cập nhật hồ sơ thất bại');
      throw new Error(message);
    }
  }

  /**
   * Change password
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    try {
      await this.axiosInstance.patch('/profile/password', {
        old_password: oldPassword,
        new_password: newPassword,
      });
    } catch (error: any) {
      const message = error.response?.data?.message || 'Thay đổi mật khẩu thất bại';
      throw new Error(message);
    }
  }

  /**
   * Get fresh user profile from backend
   */
  async getProfile(): Promise<User> {
    try {
      const response = await this.axiosInstance.get<{ data: User }>('/profile');
      const user = response.data.data;
      await TokenManager.saveUser(user);
      return user;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Không thể lấy thông tin profile';
      throw new Error(message);
    }
  }
}

// Export singleton instance
export default new AuthService();
